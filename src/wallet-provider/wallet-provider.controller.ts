import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { WalletProviderService } from './wallet-provider.service';
import { ProviderType } from '../interface/wallet-provider.interface';
import { AddWalletProviderDto } from './dto/add-wallet-provider.dto';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { PROVIDER_TYPE_ENUM, WALLET_ACTION_ENUM } from '../enums';
import { WalletActionDto } from './dto/wallet-action.dto';
import { ProjectApiKeyService } from '../project/project-api-key.service';
import { ProjectProviderService } from '../project/project-provider.service';

@Controller('wallet-providers')
export class WalletProviderController {
  constructor(
    private readonly walletProviderService: WalletProviderService,
    private readonly projectApiKeyService: ProjectApiKeyService,
    private readonly projectProviderService: ProjectProviderService,
  ) {}

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
  async createWallet(@Req() req: Request, @Body() dto: CreateWalletDto) {
    const providerApiKey = await this.resolveProviderApiKey(req, dto.provider);

    return this.walletProviderService.createWallet(
      dto.provider,
      providerApiKey,
      dto.payload,
    );
  }

  @Post('actions')
  async handleAction(@Req() req: Request, @Body() dto: WalletActionDto) {
    const providerApiKey = await this.resolveProviderApiKey(req, dto.provider);

    if (dto.action === WALLET_ACTION_ENUM.CREATE_WALLET) {
      return this.walletProviderService.createWallet(
        dto.provider,
        providerApiKey,
        dto.payload,
      );
    }

    if (dto.action === WALLET_ACTION_ENUM.FETCH_WALLET) {
      return this.walletProviderService.fetchWallet(
        dto.provider,
        providerApiKey,
        dto.payload,
      );
    }

    if (dto.action === WALLET_ACTION_ENUM.LIST_WALLETS) {
      return this.walletProviderService.listWallets(
        dto.provider,
        providerApiKey,
        dto.payload,
      );
    }

    if (dto.action === WALLET_ACTION_ENUM.DEPOSIT) {
      return this.walletProviderService.deposit(
        dto.provider,
        providerApiKey,
        dto.payload,
      );
    }

    if (dto.action === WALLET_ACTION_ENUM.WITHDRAW) {
      return this.walletProviderService.withdraw(
        dto.provider,
        providerApiKey,
        dto.payload,
      );
    }

    throw new BadRequestException('Unsupported wallet action');
  }

  private async resolveProviderApiKey(
    req: Request,
    provider: ProviderType,
  ): Promise<string> {
    const apiKeyHeader = req.headers['x-api-key'];
    const authorizationHeader = req.headers.authorization;

    let incomingKey: string | undefined;

    if (authorizationHeader && authorizationHeader.startsWith('Bearer ')) {
      incomingKey = authorizationHeader.slice(7).trim();
    } else if (typeof apiKeyHeader === 'string') {
      incomingKey = apiKeyHeader.trim();
    } else if (Array.isArray(apiKeyHeader)) {
      incomingKey = apiKeyHeader[0].trim();
    }

    if (!incomingKey) {
      throw new UnauthorizedException('API key is required');
    }

    const projectApiKey =
      await this.projectApiKeyService.verifyProjectApiKey(incomingKey);

    const providerApiKey =
      await this.projectProviderService.getProviderApiKeyForProject(
        projectApiKey.project.id,
        provider as PROVIDER_TYPE_ENUM,
      );

    return providerApiKey;
  }
}
