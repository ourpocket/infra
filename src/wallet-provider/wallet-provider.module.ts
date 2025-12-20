import { Module } from '@nestjs/common';
import { WalletProviderService } from './wallet-provider.service';

@Module({
  providers: [WalletProviderService],
  exports: [WalletProviderService],
})
export class WalletProviderModule {}
