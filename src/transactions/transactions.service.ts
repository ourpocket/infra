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
    return Promise.reject(
      new BadRequestException(
        'Legacy transactions are read-only; use /v1/payments or /v1/sandbox/transfers',
      ),
    );
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
}
