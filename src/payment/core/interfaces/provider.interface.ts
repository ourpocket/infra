// ============================================================================
// Provider Interface Contract
// ============================================================================
// All payment providers (Flutterwave, Paystack, MNOs, etc.) must implement this.
// Keeps the core domain agnostic of provider-specific quirks.

import {
  Result,
  Wallet,
  Payment,
  CreateWalletRequest,
  FundWalletRequest,
  WithdrawRequest,
  BalanceResponse,
  ProviderCredentials,
  PaymentError,
} from '../types/payment.types';

// Main provider contract
export interface IPaymentProvider {
  readonly id: string;
  readonly name: string;
  readonly supportedCurrencies: readonly string[];

  // Wallet lifecycle
  createWallet(
    req: CreateWalletRequest,
    creds: ProviderCredentials,
  ): Promise<Result<Wallet, PaymentError>>;

  fetchWallet(
    walletId: string,
    creds: ProviderCredentials,
  ): Promise<Result<Wallet, PaymentError>>;

  // Payment operations
  fundWallet(
    req: FundWalletRequest,
    creds: ProviderCredentials,
  ): Promise<Result<Payment, PaymentError>>;

  withdraw(
    req: WithdrawRequest,
    creds: ProviderCredentials,
  ): Promise<Result<Payment, PaymentError>>;

  getBalance(
    walletId: string,
    creds: ProviderCredentials,
  ): Promise<Result<BalanceResponse, PaymentError>>;

  // Transaction verification
  verifyTransaction(
    providerRef: string,
    creds: ProviderCredentials,
  ): Promise<Result<Payment, PaymentError>>;

  // Webhook handling (provider-specific payloads)
  parseWebhook(
    payload: unknown,
    signature: string,
    creds: ProviderCredentials,
  ): Result<Payment, PaymentError>;
}

// Factory for creating provider instances
export interface IProviderFactory {
  create(providerId: string): IPaymentProvider;
  register(providerId: string, provider: IPaymentProvider): void;
  has(providerId: string): boolean;
}

// Registry entry for provider metadata
export interface ProviderRegistryEntry {
  readonly id: string;
  readonly name: string;
  readonly instance: IPaymentProvider;
  readonly config: ProviderConfig;
}

import { ProviderConfig } from '../types/payment.types';
