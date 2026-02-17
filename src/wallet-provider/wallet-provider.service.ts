import { Injectable } from '@nestjs/common';

import {
  ProviderType,
  ProviderConfig,
  WalletProvider,
} from '../interface/wallet-provider.interface';
import {
  IWalletProvider,
  WalletOperationPayload,
} from '../interface/wallet-provider-base.interface';
import { PaystackService } from '../services/web2/paystack.service';
import { FlutterwaveService } from '../services/web2/flutterwave.service';
import { PagaService } from '../services/web2/paga.service';
import { FingraService } from '../services/web2/fingra.service';
import { LedgerService } from '../ledger/ledger.service';

@Injectable()
export class WalletProviderService {
  constructor(private readonly ledgerService: LedgerService) {}

  private providers: WalletProvider[] = [
    {
      type: 'paystack',
      name: 'Paystack',
      isActive: true,
      config: { apiKey: process.env.PAYSTACK_API_KEY || '' },
    },
    {
      type: 'flutterwave',
      name: 'Flutterwave',
      isActive: true,
      config: { apiKey: process.env.FLUTTERWAVE_API_KEY || '' },
    },
    {
      type: 'paga',
      name: 'Paga',
      isActive: true,
      config: { apiKey: process.env.PAGA_API_KEY || '' },
    },
    {
      type: 'fingra',
      name: 'Fingra',
      isActive: true,
      config: { apiKey: process.env.FINGRA_API_KEY || '' },
    },
  ];

  getAvailableProviders(): WalletProvider[] {
    return this.providers.filter((p) => p.isActive);
  }

  getProvider(type: ProviderType): WalletProvider | undefined {
    return this.providers.find((p) => p.type === type && p.isActive);
  }

  addProvider(type: ProviderType, config: ProviderConfig): WalletProvider {
    const existing = this.providers.find((p) => p.type === type);
    if (existing) {
      existing.isActive = true;
      existing.config = config;
      return existing;
    }
    const provider: WalletProvider = {
      type,
      name: type.charAt(0).toUpperCase() + type.slice(1),
      isActive: true,
      config,
    };
    this.providers.push(provider);
    return provider;
  }

  removeProvider(type: ProviderType): void {
    const provider = this.providers.find((p) => p.type === type);
    if (provider) provider.isActive = false;
  }

  private providerRegistry: Record<ProviderType, IWalletProvider> = {
    paystack: new PaystackService(),
    flutterwave: new FlutterwaveService(),
    paga: new PagaService(),
    fingra: new FingraService(),
  };

  async createWallet(
    provider: ProviderType,
    apiKey: string,
    payload: WalletOperationPayload,
  ): Promise<unknown> {
    const providerInstance = this.providerRegistry[provider];
    if (!providerInstance) throw new Error('Unsupported provider');
    return providerInstance.createWallet(apiKey, payload);
  }

  async fetchWallet(
    provider: ProviderType,
    apiKey: string,
    payload: WalletOperationPayload,
  ): Promise<unknown> {
    const providerInstance = this.providerRegistry[provider];
    if (!providerInstance) throw new Error('Unsupported provider');
    return providerInstance.fetchWallet(apiKey, payload);
  }

  async listWallets(
    provider: ProviderType,
    apiKey: string,
    payload: WalletOperationPayload,
  ): Promise<unknown> {
    const providerInstance = this.providerRegistry[provider];
    if (!providerInstance) throw new Error('Unsupported provider');
    return providerInstance.listWallets(apiKey, payload);
  }

  async deposit(
    provider: ProviderType,
    apiKey: string,
    payload: WalletOperationPayload,
  ): Promise<unknown> {
    const providerInstance = this.providerRegistry[provider];
    if (!providerInstance) throw new Error('Unsupported provider');
    const { ledger, ...providerPayload } = payload;
    const providerResponse = await providerInstance.deposit(
      apiKey,
      providerPayload,
    );

    if (!ledger) {
      return providerResponse;
    }

    const ledgerResponse = await this.ledgerService.executeTransaction(ledger);

    return {
      provider: providerResponse,
      ledger: ledgerResponse,
    };
  }

  async withdraw(
    provider: ProviderType,
    apiKey: string,
    payload: WalletOperationPayload,
  ): Promise<unknown> {
    const providerInstance = this.providerRegistry[provider];
    if (!providerInstance) throw new Error('Unsupported provider');
    const { ledger, ...providerPayload } = payload;
    const providerResponse = await providerInstance.withdraw(
      apiKey,
      providerPayload,
    );

    if (!ledger) {
      return providerResponse;
    }

    const ledgerResponse = await this.ledgerService.executeTransaction(ledger);

    return {
      provider: providerResponse,
      ledger: ledgerResponse,
    };
  }
}
