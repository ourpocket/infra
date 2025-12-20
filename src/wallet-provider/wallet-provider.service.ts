import { Injectable } from '@nestjs/common';

import { PaystackProvider } from './providers/paystack.provider';
import { FlutterwaveProvider } from './providers/flutterwave.provider';
import { PagaProvider } from './providers/paga.provider';
import { FingraProvider } from './providers/fingra.provider';
import {
  ProviderType,
  ProviderConfig,
  WalletProvider,
} from '../interface/wallet-provider.interface';
import { IWalletProvider } from '../interface/wallet-provider-base.interface';

@Injectable()
export class WalletProviderService {
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
    paystack: new PaystackProvider(),
    flutterwave: new FlutterwaveProvider(),
    paga: new PagaProvider(),
    fingra: new FingraProvider(),
  };

  async createWallet(
    provider: ProviderType,
    apiKey: string,
    payload: any,
  ): Promise<any> {
    const providerInstance = this.providerRegistry[provider];
    if (!providerInstance) throw new Error('Unsupported provider');
    return providerInstance.createWallet(apiKey, payload);
  }
}
