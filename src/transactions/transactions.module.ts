import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from '../entities/transaction.entity';
import { LedgerModule } from '../ledger/ledger.module';
import { ProjectModule } from '../project/project.module';
import { WalletProviderModule } from '../wallet-provider/wallet-provider.module';
import { WalletsModule } from '../wallets/wallets.module';
import { TransactionRepository } from './transaction.repository';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction]),
    ProjectModule,
    WalletsModule,
    LedgerModule,
    WalletProviderModule,
  ],
  controllers: [TransactionsController],
  providers: [TransactionsService, TransactionRepository],
  exports: [TransactionsService, TransactionRepository],
})
export class TransactionsModule {}
