import { Module } from '@nestjs/common';
import { WalletProviderService } from './wallet-provider.service';
import { WalletProviderController } from './wallet-provider.controller';
import { ProjectModule } from '../project/project.module';
import { LedgerModule } from '../ledger/ledger.module';

@Module({
  imports: [ProjectModule, LedgerModule],
  controllers: [WalletProviderController],
  providers: [WalletProviderService],
  exports: [WalletProviderService],
})
export class WalletProviderModule {}
