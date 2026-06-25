import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { WalletsService } from './wallets.service';
import { CreateWalletRequestDto } from './dto/create-wallet.dto';
import { TransferRequestDto } from './dto/transfer.dto';
import { CreditWalletRequestDto } from './dto/credit-wallet.dto';
import { DebitWalletRequestDto } from './dto/debit-wallet.dto';

@ApiTags('Wallets')
@ApiBearerAuth()
@Controller({ path: 'wallets', version: '1' })
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Post('create')
  @ApiOperation({
    summary: 'Create a wallet',
    description:
      'Creates an OurPocket wallet and optionally routes wallet creation to Paystack or Flutterwave using the provider and provider API key supplied in the request body.',
  })
  @ApiResponse({ status: 201, description: 'Wallet created' })
  @ApiResponse({
    status: 401,
    description: 'Project API key is missing or invalid',
  })
  createWallet(@Req() req: Request, @Body() dto: CreateWalletRequestDto) {
    const apiKey = this.resolveApiKey(req);
    return this.walletsService.createWallet(apiKey, dto);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a wallet using the legacy route',
    description: 'Alias for POST /wallets/create.',
  })
  @ApiResponse({ status: 201, description: 'Wallet created' })
  createWalletLegacy(@Req() req: Request, @Body() dto: CreateWalletRequestDto) {
    const apiKey = this.resolveApiKey(req);
    return this.walletsService.createWallet(apiKey, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get wallet balance and details' })
  @ApiResponse({ status: 200, description: 'Wallet retrieved' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  getWallet(@Req() req: Request, @Param('id') id: string) {
    const apiKey = this.resolveApiKey(req);
    return this.walletsService.getWallet(apiKey, id);
  }

  @Post('transfer')
  @ApiOperation({
    summary: 'Transfer between project wallets',
    description:
      'Moves ledger balance between two wallets in the same project.',
  })
  @ApiResponse({ status: 201, description: 'Transfer completed' })
  transfer(@Req() req: Request, @Body() dto: TransferRequestDto) {
    const apiKey = this.resolveApiKey(req);
    return this.walletsService.transfer(apiKey, dto);
  }

  @Post('credit')
  @ApiOperation({
    summary: 'Credit a wallet',
    description:
      'Credits a wallet locally or routes a provider-backed funding request through the routing engine.',
  })
  @ApiResponse({ status: 201, description: 'Wallet credited' })
  credit(@Req() req: Request, @Body() dto: CreditWalletRequestDto) {
    const apiKey = this.resolveApiKey(req);
    return this.walletsService.credit(apiKey, dto);
  }

  @Post('debit')
  @ApiOperation({
    summary: 'Debit a wallet',
    description:
      'Debits a wallet locally or routes a provider-backed withdrawal request through the routing engine.',
  })
  @ApiResponse({ status: 201, description: 'Wallet debited' })
  debit(@Req() req: Request, @Body() dto: DebitWalletRequestDto) {
    const apiKey = this.resolveApiKey(req);
    return this.walletsService.debit(apiKey, dto);
  }

  private resolveApiKey(req: Request): string {
    const apiKeyHeader = req.headers['x-api-key'];
    const authorizationHeader = req.headers.authorization;

    if (authorizationHeader && authorizationHeader.startsWith('Bearer ')) {
      const bearerKey = authorizationHeader.slice(7).trim();
      if (bearerKey) {
        return bearerKey;
      }
    }

    if (typeof apiKeyHeader === 'string') {
      const key = apiKeyHeader.trim();
      if (key) {
        return key;
      }
    }

    if (Array.isArray(apiKeyHeader) && apiKeyHeader.length > 0) {
      const key = apiKeyHeader[0].trim();
      if (key) {
        return key;
      }
    }

    throw new UnauthorizedException('API key is required');
  }
}
