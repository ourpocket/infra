import { BadRequestException, Injectable } from '@nestjs/common';

import {
  ProviderType,
  ProviderConfig,
  WalletProvider,
} from '../interface/wallet-provider.interface';
import { WalletOperationPayload } from '../interface/wallet-provider-base.interface';
import { RoutingEngineService } from '../routing/routing-engine.service';
import { PROVIDER_TYPE_ENUM, WALLET_ACTION_ENUM } from '../enums';

@Injectable()
export class WalletProviderService {
  constructor(private readonly routingEngineService: RoutingEngineService) {}

  private readonly supportedProviderTypes: ProviderType[] = [
    PROVIDER_TYPE_ENUM.PAYSTACK,
    PROVIDER_TYPE_ENUM.FLUTTERWAVE,
  ];

  private providers: WalletProvider[] = [
    {
      type: PROVIDER_TYPE_ENUM.PAYSTACK,
      name: 'Paystack',
      isActive: true,
      config: { apiKey: process.env.PAYSTACK_API_KEY || '' },
    },
    {
      type: PROVIDER_TYPE_ENUM.FLUTTERWAVE,
      name: 'Flutterwave',
      isActive: true,
      config: { apiKey: process.env.FLUTTERWAVE_API_KEY || '' },
    },
  ];

  getAvailableProviders(): WalletProvider[] {
    return this.providers.filter(
      (p) => p.isActive && this.supportedProviderTypes.includes(p.type),
    );
  }

  getProvider(type: ProviderType): WalletProvider | undefined {
    this.assertSupportedProvider(type);
    return this.providers.find((p) => p.type === type && p.isActive);
  }

  addProvider(type: ProviderType, config: ProviderConfig): WalletProvider {
    this.assertSupportedProvider(type);
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
    this.assertSupportedProvider(type);
    const provider = this.providers.find((p) => p.type === type);
    if (provider) provider.isActive = false;
  }

  async createWallet(
    provider: ProviderType,
    apiKey: string,
    payload: WalletOperationPayload,
  ): Promise<unknown> {
    return this.routingEngineService.executeProviderAction(
      { provider, apiKey },
      WALLET_ACTION_ENUM.CREATE_WALLET,
      payload,
    );
  }

  async fetchWallet(
    provider: ProviderType,
    apiKey: string,
    payload: WalletOperationPayload,
  ): Promise<unknown> {
    return this.routingEngineService.executeProviderAction(
      { provider, apiKey },
      WALLET_ACTION_ENUM.FETCH_WALLET,
      payload,
    );
  }

  async listWallets(
    provider: ProviderType,
    apiKey: string,
    payload: WalletOperationPayload,
  ): Promise<unknown> {
    return this.routingEngineService.executeProviderAction(
      { provider, apiKey },
      WALLET_ACTION_ENUM.LIST_WALLETS,
      payload,
    );
  }

  async deposit(
    provider: ProviderType,
    apiKey: string,
    payload: WalletOperationPayload,
  ): Promise<unknown> {
    return this.routingEngineService.executeProviderAction(
      { provider, apiKey },
      WALLET_ACTION_ENUM.DEPOSIT,
      payload,
    );
  }

  async withdraw(
    provider: ProviderType,
    apiKey: string,
    payload: WalletOperationPayload,
  ): Promise<unknown> {
    return this.routingEngineService.executeProviderAction(
      { provider, apiKey },
      WALLET_ACTION_ENUM.WITHDRAW,
      payload,
    );
  }

  private assertSupportedProvider(provider: ProviderType): void {
    if (!this.supportedProviderTypes.includes(provider)) {
      throw new BadRequestException(`${provider} is not supported yet`);
    }
  }
}
