import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

@Injectable()
export class WalletsService {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    @InjectRepository(ProjectAccount)
    private readonly projectAccountRepository: Repository<ProjectAccount>,
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
        (await this.projectAccountRepository.findOne({
          where: {
            id: dto.accountId,
            project: { id: projectApiKey.project.id },
          },
        })) ?? null;

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
    const wallet = await this.walletRepository.findOne({
      where: { id: walletId, project: { id: projectApiKey.project.id } },
      relations: ['project', 'account'],
    });

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

    const fromWallet = await this.walletRepository.findOne({
      where: { id: dto.fromWalletId, project: { id: projectId } },
    });
    const toWallet = await this.walletRepository.findOne({
      where: { id: dto.toWalletId, project: { id: projectId } },
    });

    if (!fromWallet || !toWallet) {
      throw new NotFoundException('Wallet not found');
    }

    if (
      fromWallet.currency !== dto.currency ||
      toWallet.currency !== dto.currency
    ) {
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

    const wallet = await this.walletRepository.findOne({
      where: { id: dto.walletId, project: { id: projectId } },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    if (wallet.currency !== dto.currency) {
      throw new UnauthorizedException('Wallet currency mismatch');
    }

    if (!dto.provider) {
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
        dto.provider,
      );

    return this.walletProviderService.deposit(
      dto.provider as ProviderType,
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

    const wallet = await this.walletRepository.findOne({
      where: { id: dto.walletId, project: { id: projectId } },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    if (wallet.currency !== dto.currency) {
      throw new UnauthorizedException('Wallet currency mismatch');
    }

    if (!dto.provider) {
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
        dto.provider,
      );

    return this.walletProviderService.withdraw(
      dto.provider as ProviderType,
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
}
