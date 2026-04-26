// ============================================================================
// Payment Service - Orchestration Layer
// ============================================================================
// Entry point for all payment operations. Handles provider selection,
// credential management, and result aggregation.

import { Injectable } from '@nestjs/common';
import {
  IPaymentProvider,
  IProviderFactory,
} from '../core/interfaces/provider.interface';
import {
  ProviderId,
  ProviderCredentials,
  CreateWalletRequest,
  FundWalletRequest,
  WithdrawRequest,
  Wallet,
  Payment,
  BalanceResponse,
  Result,
  PaymentError,
} from '../core/types/payment.types';
import { Errors } from '../core/errors/payment.error';
import { FlutterwaveProvider } from '../providers/flutterwave/flutterwave.provider';
import { PaystackProvider } from '../providers/paystack/paystack.provider';
import { MtnMomoProvider } from '../providers/mno/mtn-momo.provider';
import { AirtelMoneyProvider } from '../providers/mno/airtel-money.provider';
import { OrangeMoneyProvider } from '../providers/mno/orange-money.provider';
import { MnoConfig } from '../providers/mno/mno-base.provider';
import {
  DefaultProviderConfig,
  getFlutterwaveUrl,
  getPaystackUrl,
  getMtnMomoUrl,
  getAirtelMoneyUrl,
  getOrangeMoneyUrl,
} from '../constants/provider-config.constants';

// Provider factory implementation
@Injectable()
export class ProviderFactory implements IProviderFactory {
  private providers = new Map<string, IPaymentProvider>();

  constructor() {
    // Register built-in providers
    this.register(
      'flutterwave',
      new FlutterwaveProvider({
        ...DefaultProviderConfig,
        baseUrl: getFlutterwaveUrl(),
      }),
    );

    this.register(
      'paystack',
      new PaystackProvider({
        ...DefaultProviderConfig,
        baseUrl: getPaystackUrl(),
      }),
    );

    this.register(
      'mtn-momo',
      new MtnMomoProvider({
        ...DefaultProviderConfig,
        baseUrl: getMtnMomoUrl(),
        apiUser: process.env.MTN_API_USER || '',
        apiUserId: process.env.MTN_API_USER_ID || '',
        primaryKey: process.env.MTN_PRIMARY_KEY || '',
        secondaryKey: process.env.MTN_SECONDARY_KEY || '',
      } as MnoConfig),
    );

    this.register(
      'airtel-money',
      new AirtelMoneyProvider({
        ...DefaultProviderConfig,
        baseUrl: getAirtelMoneyUrl(),
        apiUser: process.env.AIRTEL_CLIENT_ID || '',
        apiUserId: process.env.AIRTEL_CLIENT_SECRET || '',
        primaryKey: process.env.AIRTEL_CLIENT_ID || '',
        secondaryKey: process.env.AIRTEL_CLIENT_SECRET || '',
      } as MnoConfig),
    );

    this.register(
      'orange-money',
      new OrangeMoneyProvider({
        ...DefaultProviderConfig,
        baseUrl: getOrangeMoneyUrl(),
        apiUser: process.env.ORANGE_MERCHANT_CODE || '',
        apiUserId: process.env.ORANGE_MERCHANT_CODE || '',
        primaryKey: process.env.ORANGE_MERCHANT_CODE || '',
        secondaryKey: process.env.ORANGE_API_KEY || '',
      } as MnoConfig),
    );
  }

  create(providerId: string): IPaymentProvider {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Unknown provider: ${providerId}`);
    }
    return provider;
  }

  register(providerId: string, provider: IPaymentProvider): void {
    this.providers.set(providerId, provider);
  }

  has(providerId: string): boolean {
    return this.providers.has(providerId);
  }

  list(): string[] {
    return Array.from(this.providers.keys());
  }
}

// Payment service for business logic
@Injectable()
export class PaymentService {
  constructor(private readonly factory: ProviderFactory) {}

  async createWallet(
    providerId: ProviderId,
    creds: ProviderCredentials,
    req: CreateWalletRequest,
  ): Promise<Result<Wallet, PaymentError>> {
    if (!this.factory.has(providerId)) {
      return {
        ok: false,
        error: Errors.configuration(
          `Provider ${providerId} not found`,
          providerId,
        ),
      };
    }

    const provider = this.factory.create(providerId);
    return provider.createWallet(req, creds);
  }

  async fundWallet(
    providerId: ProviderId,
    creds: ProviderCredentials,
    req: FundWalletRequest,
  ): Promise<Result<Payment, PaymentError>> {
    if (!this.factory.has(providerId)) {
      return {
        ok: false,
        error: Errors.configuration(
          `Provider ${providerId} not found`,
          providerId,
        ),
      };
    }

    const provider = this.factory.create(providerId);
    return provider.fundWallet(req, creds);
  }

  async withdraw(
    providerId: ProviderId,
    creds: ProviderCredentials,
    req: WithdrawRequest,
  ): Promise<Result<Payment, PaymentError>> {
    if (!this.factory.has(providerId)) {
      return {
        ok: false,
        error: Errors.configuration(
          `Provider ${providerId} not found`,
          providerId,
        ),
      };
    }

    const provider = this.factory.create(providerId);
    return provider.withdraw(req, creds);
  }

  async getBalance(
    providerId: ProviderId,
    creds: ProviderCredentials,
    walletId: string,
  ): Promise<Result<BalanceResponse, PaymentError>> {
    if (!this.factory.has(providerId)) {
      return {
        ok: false,
        error: Errors.configuration(
          `Provider ${providerId} not found`,
          providerId,
        ),
      };
    }

    const provider = this.factory.create(providerId);
    return provider.getBalance(walletId, creds);
  }

  async verifyTransaction(
    providerId: ProviderId,
    creds: ProviderCredentials,
    providerRef: string,
  ): Promise<Result<Payment, PaymentError>> {
    if (!this.factory.has(providerId)) {
      return {
        ok: false,
        error: Errors.configuration(
          `Provider ${providerId} not found`,
          providerId,
        ),
      };
    }

    const provider = this.factory.create(providerId);
    return provider.verifyTransaction(providerRef, creds);
  }

  parseWebhook(
    providerId: ProviderId,
    creds: ProviderCredentials,
    payload: unknown,
    signature: string,
  ): Result<Payment, PaymentError> {
    if (!this.factory.has(providerId)) {
      return {
        ok: false,
        error: Errors.configuration(
          `Provider ${providerId} not found`,
          providerId,
        ),
      };
    }

    const provider = this.factory.create(providerId);
    return provider.parseWebhook(payload, signature, creds);
  }

  getAvailableProviders(): string[] {
    return this.factory.list();
  }
}
