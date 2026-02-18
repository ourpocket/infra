import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Wallet } from '../entities/wallet.entity';
import { ProjectAccount } from '../entities/project-account.entity';
import { WalletsController } from './wallets.controller';
import { WalletsService } from './wallets.service';
import { ProjectModule } from '../project/project.module';
import { LedgerModule } from '../ledger/ledger.module';
import { WalletProviderModule } from '../wallet-provider/wallet-provider.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Wallet, ProjectAccount]),
    ProjectModule,
    LedgerModule,
    WalletProviderModule,
  ],
  controllers: [WalletsController],
  providers: [WalletsService],
})
export class WalletsModule {}
