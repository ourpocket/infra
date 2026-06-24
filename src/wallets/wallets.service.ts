import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Wallet } from '../entities/wallet.entity';
import { ProjectAccount } from '../entities/project-account.entity';
import { ProjectApiKeyService } from '../project/project-api-key.service';
import { LedgerService } from '../ledger/ledger.service';
import { TransferRequestDto } from './dto/transfer.dto';
import { CreditWalletRequestDto } from './dto/credit-wallet.dto';
import { DebitWalletRequestDto } from './dto/debit-wallet.dto';
import { CreateWalletRequestDto } from './dto/create-wallet.dto';
import { WalletProviderService } from '../wallet-provider/wallet-provider.service';
import { ProviderType } from '../interface/wallet-provider.interface';
import { ProjectProviderService } from '../project/project-provider.service';
import { WalletRepository } from './wallet.repository';
import { ProjectAccountRepository } from './project-account.repository';
import { PROVIDER_TYPE_ENUM, ROUTING_STRATEGY_ENUM } from '../enums';

@Injectable()
export class WalletsService {
  constructor(
    private readonly walletRepository: WalletRepository,
    private readonly projectAccountRepository: ProjectAccountRepository,
    private readonly projectApiKeyService: ProjectApiKeyService,
    private readonly projectProviderService: ProjectProviderService,
    private readonly walletProviderService: WalletProviderService,
    private readonly ledgerService: LedgerService,
  ) {}

  async createWallet(
    incomingApiKey: string,
    dto: CreateWalletRequestDto,
  ): Promise<Wallet> {
    const projectApiKey =
      await this.projectApiKeyService.verifyProjectApiKey(incomingApiKey);

    let account: ProjectAccount | null = null;
    if (dto.accountId) {
      account =
        (await this.projectAccountRepository.findByIdAndProjectId(
          dto.accountId,
          projectApiKey.project.id,
        )) ?? null;

      if (!account) {
        throw new NotFoundException('Project account not found');
      }
    }

    const wallet = this.walletRepository.create({
      project: projectApiKey.project,
      account,
      currency: dto.currency.toUpperCase(),
    });

    return this.walletRepository.save(wallet);
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

    const provider = await this.resolveProviderType(
      projectId,
      dto.provider,
      dto.routingStrategy,
      dto.providerPriority,
    );

    if (!provider) {
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

    const providerApiKey =
      await this.projectProviderService.getProviderApiKeyForProject(
        projectId,
        provider,
      );

    return this.walletProviderService.deposit(
      provider as ProviderType,
      providerApiKey,
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

    const provider = await this.resolveProviderType(
      projectId,
      dto.provider,
      dto.routingStrategy,
      dto.providerPriority,
    );

    if (!provider) {
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

    const providerApiKey =
      await this.projectProviderService.getProviderApiKeyForProject(
        projectId,
        provider,
      );

    return this.walletProviderService.withdraw(
      provider as ProviderType,
      providerApiKey,
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
  }

  private async resolveProviderType(
    projectId: string,
    provider?: PROVIDER_TYPE_ENUM,
    strategy?: ROUTING_STRATEGY_ENUM,
    priority?: PROVIDER_TYPE_ENUM[],
  ): Promise<PROVIDER_TYPE_ENUM | undefined> {
    if (provider) {
      return provider;
    }

    if (!strategy) {
      return undefined;
    }

    const selectedProvider =
      await this.projectProviderService.selectProviderForProject(
        projectId,
        strategy,
        priority,
      );

    return selectedProvider.type;
  }
}
