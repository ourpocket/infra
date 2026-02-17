import { Module } from '@nestjs/common';
import { WalletProviderService } from './wallet-provider.service';
import { WalletProviderController } from './wallet-provider.controller';
import { ApiKeyModule } from '../api-key/api-key.module';
import { UserProviderModule } from '../user-provider/user-provider.module';

@Module({
  imports: [ApiKeyModule, UserProviderModule],
  controllers: [WalletProviderController],
  providers: [WalletProviderService],
  exports: [WalletProviderService],
})
export class WalletProviderModule {}
