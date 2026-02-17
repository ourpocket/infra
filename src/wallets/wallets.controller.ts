import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { WalletsService } from './wallets.service';
import { CreateWalletRequestDto } from './dto/create-wallet.dto';
import { TransferRequestDto } from './dto/transfer.dto';
import { CreditWalletRequestDto } from './dto/credit-wallet.dto';
import { DebitWalletRequestDto } from './dto/debit-wallet.dto';

@Controller({ path: 'wallets', version: '1' })
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Post()
  createWallet(@Req() req: Request, @Body() dto: CreateWalletRequestDto) {
    const apiKey = this.resolveApiKey(req);
    return this.walletsService.createWallet(apiKey, dto);
  }

  @Get(':id')
  getWallet(@Req() req: Request, @Param('id') id: string) {
    const apiKey = this.resolveApiKey(req);
    return this.walletsService.getWallet(apiKey, id);
  }

  @Post('transfer')
  transfer(@Req() req: Request, @Body() dto: TransferRequestDto) {
    const apiKey = this.resolveApiKey(req);
    return this.walletsService.transfer(apiKey, dto);
  }

  @Post('credit')
  credit(@Req() req: Request, @Body() dto: CreditWalletRequestDto) {
    const apiKey = this.resolveApiKey(req);
    return this.walletsService.credit(apiKey, dto);
  }

  @Post('debit')
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
