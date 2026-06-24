import { Module } from '@nestjs/common';
import { ProjectModule } from '../project/project.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { WalletsModule } from '../wallets/wallets.module';
import { UsageController } from './usage.controller';
import { UsageService } from './usage.service';

@Module({
  imports: [ProjectModule, TransactionsModule, WalletsModule],
  controllers: [UsageController],
  providers: [UsageService],
})
export class UsageModule {}
