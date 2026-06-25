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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { WalletProviderService } from './wallet-provider.service';
import { ProviderType } from '../interface/wallet-provider.interface';
import { AddWalletProviderDto } from './dto/add-wallet-provider.dto';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { PROVIDER_TYPE_ENUM, WALLET_ACTION_ENUM } from '../enums';
import { WalletActionDto } from './dto/wallet-action.dto';
import { ProjectApiKeyService } from '../project/project-api-key.service';
import { ProjectProviderService } from '../project/project-provider.service';

@ApiTags('Wallet Providers')
@ApiBearerAuth()
@Controller('wallet-providers')
export class WalletProviderController {
  constructor(
    private readonly walletProviderService: WalletProviderService,
    private readonly projectApiKeyService: ProjectApiKeyService,
    private readonly projectProviderService: ProjectProviderService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List supported wallet providers',
    description: 'Returns provider rails currently executable by OurPocket.',
  })
  @ApiResponse({ status: 200, description: 'Supported providers retrieved' })
  getProviders() {
    return this.walletProviderService.getAvailableProviders();
  }

  @Post('add')
  @ApiOperation({
    summary: 'Add a wallet provider to the catalog',
    description:
      'Adds or updates provider catalog configuration for supported provider rails.',
  })
  @ApiResponse({ status: 201, description: 'Provider added to catalog' })
  addProvider(@Body() dto: AddWalletProviderDto) {
    return this.walletProviderService.addProvider(dto.type, dto.config);
  }

  @Delete(':type')
  @ApiOperation({ summary: 'Remove a wallet provider from the catalog' })
  @ApiResponse({ status: 200, description: 'Provider removed from catalog' })
  removeProvider(@Param('type') type: ProviderType) {
    this.walletProviderService.removeProvider(type);
    return { success: true };
  }

  @Post('create-wallet')
  @ApiOperation({
    summary: 'Create a provider wallet using a catalog connection',
    description:
      'Legacy provider action endpoint. The provider API key is resolved from the project provider connection and the request is dispatched by the routing engine.',
  })
  @ApiResponse({ status: 201, description: 'Provider wallet created' })
  async createWallet(@Req() req: Request, @Body() dto: CreateWalletDto) {
    const providerApiKey = await this.resolveProviderApiKey(req, dto.provider);

    return this.walletProviderService.createWallet(
      dto.provider,
      providerApiKey,
      dto.payload,
    );
  }

  @Post('actions')
  @ApiOperation({
    summary: 'Run a provider wallet action',
    description:
      'Legacy provider action console endpoint. Dispatches create, fetch, list, deposit, or withdraw through the routing engine.',
  })
  @ApiResponse({ status: 201, description: 'Provider action executed' })
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
        provider,
      );

    return providerApiKey;
  }
}
