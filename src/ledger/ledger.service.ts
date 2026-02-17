import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export type LedgerEntryType = 'debit' | 'credit';
export type LedgerTransactionType = 'transfer' | 'credit' | 'debit' | 'refund';

export interface LedgerEntryRequest {
  walletId: string;
  amount: string;
  entryType: LedgerEntryType;
}

export interface LedgerTransactionRequest {
  projectId: string;
  reference: string;
  type: LedgerTransactionType;
  metadata?: Record<string, unknown>;
  entries: LedgerEntryRequest[];
}

@Injectable()
export class LedgerService {
  constructor(private readonly configService: ConfigService) {}

  private getLedgerBaseUrl(): string {
    const ledgerBaseUrl = this.configService.get<string>('app.ledgerUrl');

    if (!ledgerBaseUrl) {
      throw new InternalServerErrorException('Ledger URL is not configured');
    }

    return ledgerBaseUrl.replace(/\/$/, '');
  }

  async executeTransaction(
    payload: LedgerTransactionRequest,
  ): Promise<unknown> {
    const ledgerBaseUrl = this.getLedgerBaseUrl();

    try {
      const response = await axios.post(
        `${ledgerBaseUrl}/transactions`,
        payload,
      );
      return response.data;
    } catch {
      throw new InternalServerErrorException('Ledger transaction failed');
    }
  }

  async getWalletBalance(
    projectId: string,
    walletId: string,
  ): Promise<unknown> {
    const ledgerBaseUrl = this.getLedgerBaseUrl();

    try {
      const response = await axios.get(
        `${ledgerBaseUrl}/wallets/${walletId}/balance`,
        {
          params: { projectId },
        },
      );
      return response.data;
    } catch {
      throw new InternalServerErrorException('Ledger balance read failed');
    }
  }
}
