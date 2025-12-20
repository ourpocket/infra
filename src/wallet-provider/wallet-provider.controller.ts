import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { WalletProviderService } from './wallet-provider.service';
import { ProviderType } from '../interface/wallet-provider.interface';
import { AddWalletProviderDto } from './dto/add-wallet-provider.dto';
import { CreateWalletDto } from './dto/create-wallet.dto';

@Controller('wallet-providers')
export class WalletProviderController {
  constructor(private readonly walletProviderService: WalletProviderService) {}

  @Get()
  getProviders() {
    return this.walletProviderService.getAvailableProviders();
  }

  @Post('add')
  addProvider(@Body() dto: AddWalletProviderDto) {
    return this.walletProviderService.addProvider(dto.type, dto.config);
  }

  @Delete(':type')
  removeProvider(@Param('type') type: ProviderType) {
    this.walletProviderService.removeProvider(type);
    return { success: true };
  }

  @Post('create-wallet')
  async createWallet(@Body() dto: CreateWalletDto) {
    return await this.walletProviderService.createWallet(
      dto.provider,
      dto.apiKey,
      dto.payload,
    );
  }
}
