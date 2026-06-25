import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ProjectApiKeyService } from '../project/project-api-key.service';
import { LedgerService } from '../ledger/ledger.service';
import { TransferRequestDto } from './dto/transfer.dto';
import { CreditWalletRequestDto } from './dto/credit-wallet.dto';
import { DebitWalletRequestDto } from './dto/debit-wallet.dto';
import { CreateWalletRequestDto } from './dto/create-wallet.dto';
import { WalletRepository } from './wallet.repository';
import { RoutingEngineService } from '../routing/routing-engine.service';
import { WALLET_ACTION_ENUM } from '../enums';

@Injectable()
export class WalletsService {
  constructor(
    private readonly walletRepository: WalletRepository,
    private readonly projectApiKeyService: ProjectApiKeyService,
    private readonly ledgerService: LedgerService,
    private readonly routingEngineService: RoutingEngineService,
  ) {}

  async createWallet(
    incomingApiKey: string,
    dto: CreateWalletRequestDto,
  ): Promise<unknown> {
    const projectApiKey =
      await this.projectApiKeyService.verifyProjectApiKey(incomingApiKey);

    const wallet = this.walletRepository.create({
      project: projectApiKey.project,
      account: null,
      currency: (dto.currency ?? 'NGN').toUpperCase(),
    });

    const savedWallet = await this.walletRepository.save(wallet);
    const providerRoute = this.routingEngineService.resolveProviderRoute(dto);

    if (!providerRoute) {
      return savedWallet;
    }

    const providerResponse =
      await this.routingEngineService.executeProviderAction(
        providerRoute,
        WALLET_ACTION_ENUM.CREATE_WALLET,
        {
          ...(dto.providerPayload ?? {}),
          userId: dto.userId,
          walletId: savedWallet.id,
          currency: savedWallet.currency,
        },
      );

    return {
      wallet: savedWallet,
      selectedProvider: providerRoute.provider,
      provider: providerResponse,
    };
  }

  async getWallet(incomingApiKey: string, walletId: string): Promise<unknown> {
    const projectApiKey =
      await this.projectApiKeyService.verifyProjectApiKey(incomingApiKey);
    const wallet = await this.walletRepository.findByIdAndProjectId(
      walletId,
      projectApiKey.project.id,
    );

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    const balance = await this.ledgerService.getWalletBalance(
      projectApiKey.project.id,
      wallet.id,
    );

    return {
      wallet,
      balance,
    };
  }

  async transfer(
    incomingApiKey: string,
    dto: TransferRequestDto,
  ): Promise<unknown> {
    const projectApiKey =
      await this.projectApiKeyService.verifyProjectApiKey(incomingApiKey);
    const projectId = projectApiKey.project.id;

    const fromWallet =
      await this.walletRepository.findByIdAndProjectIdWithoutRelations(
        dto.fromWalletId,
        projectId,
      );
    const toWallet =
      await this.walletRepository.findByIdAndProjectIdWithoutRelations(
        dto.toWalletId,
        projectId,
      );

    if (!fromWallet || !toWallet) {
      throw new NotFoundException('Wallet not found');
    }

    const currency = dto.currency.toUpperCase();
    if (fromWallet.currency !== currency || toWallet.currency !== currency) {
      throw new UnauthorizedException('Wallet currency mismatch');
    }

    return this.ledgerService.executeTransaction({
      projectId,
      reference: dto.reference,
      type: 'transfer',
      metadata: dto.metadata,
      entries: [
        {
          walletId: dto.fromWalletId,
          amount: dto.amount,
          entryType: 'debit',
        },
        {
          walletId: dto.toWalletId,
          amount: dto.amount,
          entryType: 'credit',
        },
      ],
    });
  }

  async credit(
    incomingApiKey: string,
    dto: CreditWalletRequestDto,
  ): Promise<unknown> {
    const projectApiKey =
      await this.projectApiKeyService.verifyProjectApiKey(incomingApiKey);
    const projectId = projectApiKey.project.id;

    const wallet =
      await this.walletRepository.findByIdAndProjectIdWithoutRelations(
        dto.walletId,
        projectId,
      );

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    if (wallet.currency !== dto.currency.toUpperCase()) {
      throw new UnauthorizedException('Wallet currency mismatch');
    }

    const providerRoute = this.routingEngineService.resolveProviderRoute(dto);

    if (!providerRoute) {
      return this.ledgerService.executeTransaction({
        projectId,
        reference: dto.reference,
        type: 'credit',
        metadata: dto.metadata,
        entries: [
          {
            walletId: dto.walletId,
            amount: dto.amount,
            entryType: 'credit',
          },
        ],
      });
    }

    const providerResponse =
      await this.routingEngineService.executeProviderAction(
        providerRoute,
        WALLET_ACTION_ENUM.DEPOSIT,
        {
          ...(dto.providerPayload ?? {}),
          ledger: {
            projectId,
            reference: dto.reference,
            type: 'credit',
            metadata: dto.metadata,
            entries: [
              {
                walletId: dto.walletId,
                amount: dto.amount,
                entryType: 'credit',
              },
            ],
          },
        },
      );

    return {
      selectedProvider: providerRoute.provider,
      result: providerResponse,
    };
  }

  async debit(
    incomingApiKey: string,
    dto: DebitWalletRequestDto,
  ): Promise<unknown> {
    const projectApiKey =
      await this.projectApiKeyService.verifyProjectApiKey(incomingApiKey);
    const projectId = projectApiKey.project.id;

    const wallet =
      await this.walletRepository.findByIdAndProjectIdWithoutRelations(
        dto.walletId,
        projectId,
      );

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    if (wallet.currency !== dto.currency.toUpperCase()) {
      throw new UnauthorizedException('Wallet currency mismatch');
    }

    const providerRoute = this.routingEngineService.resolveProviderRoute(dto);

    if (!providerRoute) {
      return this.ledgerService.executeTransaction({
        projectId,
        reference: dto.reference,
        type: 'debit',
        metadata: dto.metadata,
        entries: [
          {
            walletId: dto.walletId,
            amount: dto.amount,
            entryType: 'debit',
          },
        ],
      });
    }

    const providerResponse =
      await this.routingEngineService.executeProviderAction(
        providerRoute,
        WALLET_ACTION_ENUM.WITHDRAW,
        {
          ...(dto.providerPayload ?? {}),
          ledger: {
            projectId,
            reference: dto.reference,
            type: 'debit',
            metadata: dto.metadata,
            entries: [
              {
                walletId: dto.walletId,
                amount: dto.amount,
                entryType: 'debit',
              },
            ],
          },
        },
      );

    return {
      selectedProvider: providerRoute.provider,
      result: providerResponse,
    };
  }
}
