import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ProjectApiKey } from '../entities/project-api-key.entity';
import { Transaction } from '../entities/transaction.entity';
import {
  PROVIDER_TYPE_ENUM,
  TRANSACTION_STATUS_ENUM,
  TRANSACTION_TYPE_ENUM,
  WALLET_ACTION_ENUM,
} from '../enums';
import { LedgerService } from '../ledger/ledger.service';
import { WalletRepository } from '../wallets/wallet.repository';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransactionRepository } from './transaction.repository';
import { RoutingEngineService } from '../routing/routing-engine.service';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly walletRepository: WalletRepository,
    private readonly ledgerService: LedgerService,
    private readonly routingEngineService: RoutingEngineService,
  ) {}

  async createTransaction(
    projectApiKey: ProjectApiKey,
    dto: CreateTransactionDto,
  ): Promise<Transaction> {
    const project = projectApiKey.project;
    const projectId = project.id;
    const existing =
      await this.transactionRepository.findByProjectIdAndReference(
        projectId,
        dto.reference,
      );

    if (existing) {
      throw new ConflictException('Transaction reference already exists');
    }

    const transaction = this.transactionRepository.create({
      project,
      type: dto.type,
      status: TRANSACTION_STATUS_ENUM.PENDING,
      provider: dto.provider ?? null,
      amount: dto.amount,
      currency: dto.currency.toUpperCase(),
      reference: dto.reference,
      walletId: dto.walletId ?? null,
      fromWalletId: dto.fromWalletId ?? null,
      toWalletId: dto.toWalletId ?? null,
      metadata: dto.metadata ?? null,
      providerPayload: dto.providerPayload ?? null,
    });

    const savedTransaction = await this.transactionRepository.save(transaction);

    try {
      const response = await this.executeTransaction(projectId, dto);
      savedTransaction.status = TRANSACTION_STATUS_ENUM.SUCCESS;
      savedTransaction.provider =
        dto.provider ??
        (this.extractProviderFromResponse(
          response,
        ) as PROVIDER_TYPE_ENUM | null);
      savedTransaction.response = this.toRecord(response);
      return this.transactionRepository.save(savedTransaction);
    } catch (error) {
      savedTransaction.status = TRANSACTION_STATUS_ENUM.FAILED;
      savedTransaction.response = this.toRecord({
        message:
          error instanceof Error
            ? error.message
            : 'Transaction execution failed',
      });
      await this.transactionRepository.save(savedTransaction);
      throw error;
    }
  }

  async getTransaction(
    projectApiKey: ProjectApiKey,
    id: string,
  ): Promise<Transaction> {
    const transaction = await this.transactionRepository.findByIdAndProjectId(
      id,
      projectApiKey.project.id,
    );

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }

  async listRecentTransactions(
    projectId: string,
    limit = 10,
  ): Promise<Transaction[]> {
    return this.transactionRepository.findRecentByProjectId(projectId, limit);
  }

  private async executeTransaction(
    projectId: string,
    dto: CreateTransactionDto,
  ): Promise<unknown> {
    if (dto.type === TRANSACTION_TYPE_ENUM.TRANSFER) {
      return this.executeTransfer(projectId, dto);
    }

    if (dto.type === TRANSACTION_TYPE_ENUM.CREDIT) {
      return this.executeCredit(projectId, dto);
    }

    if (dto.type === TRANSACTION_TYPE_ENUM.DEBIT) {
      return this.executeDebit(projectId, dto);
    }

    throw new BadRequestException('Unsupported transaction type');
  }

  private async executeTransfer(
    projectId: string,
    dto: CreateTransactionDto,
  ): Promise<unknown> {
    if (!dto.fromWalletId || !dto.toWalletId) {
      throw new BadRequestException('fromWalletId and toWalletId are required');
    }

    const currency = dto.currency.toUpperCase();
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

  private async executeCredit(
    projectId: string,
    dto: CreateTransactionDto,
  ): Promise<unknown> {
    if (!dto.walletId) {
      throw new BadRequestException('walletId is required');
    }

    await this.assertWalletCurrency(projectId, dto.walletId, dto.currency);
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

    const result = await this.routingEngineService.executeProviderAction(
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
      result,
    };
  }

  private async executeDebit(
    projectId: string,
    dto: CreateTransactionDto,
  ): Promise<unknown> {
    if (!dto.walletId) {
      throw new BadRequestException('walletId is required');
    }

    await this.assertWalletCurrency(projectId, dto.walletId, dto.currency);
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

    const result = await this.routingEngineService.executeProviderAction(
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
      result,
    };
  }

  private async assertWalletCurrency(
    projectId: string,
    walletId: string,
    currency: string,
  ): Promise<void> {
    const wallet =
      await this.walletRepository.findByIdAndProjectIdWithoutRelations(
        walletId,
        projectId,
      );

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    if (wallet.currency !== currency.toUpperCase()) {
      throw new UnauthorizedException('Wallet currency mismatch');
    }
  }

  private extractProviderFromResponse(response: unknown): string | null {
    if (!response || typeof response !== 'object') {
      return null;
    }

    const record = response as Record<string, any>;
    if (typeof record.selectedProvider === 'string') {
      return record.selectedProvider;
    }

    return typeof record.provider === 'string' ? record.provider : null;
  }

  private toRecord(value: unknown): Record<string, any> {
    if (!value || typeof value !== 'object') {
      return { value };
    }

    return value as Record<string, any>;
  }
}
