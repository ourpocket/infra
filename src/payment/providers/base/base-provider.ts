// ============================================================================
// Abstract Base Provider
// ============================================================================
// Shared logic for all providers. Reduces duplication.
// Implements resilience patterns (circuit breaker, retry, etc.)

import { IPaymentProvider } from '../../core/interfaces/provider.interface';
import {
  Result,
  Wallet,
  Payment,
  CreateWalletRequest,
  FundWalletRequest,
  WithdrawRequest,
  BalanceResponse,
  ProviderCredentials,
  ProviderConfig,
  PaymentError,
  ProviderId,
} from '../../core/types/payment.types';
import { CircuitBreaker } from '../../infrastructure/circuit-breaker/circuit-breaker';
import { DEFAULT_RETRY_POLICY } from '../../infrastructure/retry/retry.policy';
import { HttpClientConfig } from '../../infrastructure/http/http-client';
import { Errors } from '../../core/errors/payment.error';
import { circuitRegistry } from '../../infrastructure/circuit-breaker/circuit-breaker';

export interface BaseProviderConfig extends ProviderConfig {
  readonly baseUrl: string;
  readonly webhookSecretHeader?: string;
}

export abstract class BaseProvider implements IPaymentProvider {
  abstract readonly name: string;
  abstract readonly supportedCurrencies: readonly string[];

  readonly id: ProviderId;
  protected readonly httpConfig: HttpClientConfig;
  protected readonly circuitBreaker: CircuitBreaker;

  constructor(
    id: ProviderId,
    protected readonly config: BaseProviderConfig,
  ) {
    this.id = id;
    this.circuitBreaker = circuitRegistry.get(this.id, {
      failureThreshold: config.circuitBreakerThreshold,
      resetTimeoutMs: config.circuitBreakerResetMs,
      halfOpenMaxCalls: 3,
    });

    this.httpConfig = {
      timeoutMs: config.timeoutMs,
      retryPolicy: DEFAULT_RETRY_POLICY,
      circuitBreaker: this.circuitBreaker,
    };
  }

  // Abstract methods providers must implement
  protected abstract doCreateWallet(
    req: CreateWalletRequest,
    creds: ProviderCredentials,
  ): Promise<Result<Wallet, PaymentError>>;

  protected abstract doFetchWallet(
    walletId: string,
    creds: ProviderCredentials,
  ): Promise<Result<Wallet, PaymentError>>;

  protected abstract doFundWallet(
    req: FundWalletRequest,
    creds: ProviderCredentials,
  ): Promise<Result<Payment, PaymentError>>;

  protected abstract doWithdraw(
    req: WithdrawRequest,
    creds: ProviderCredentials,
  ): Promise<Result<Payment, PaymentError>>;

  protected abstract doGetBalance(
    walletId: string,
    creds: ProviderCredentials,
  ): Promise<Result<BalanceResponse, PaymentError>>;

  protected abstract doVerifyTransaction(
    providerRef: string,
    creds: ProviderCredentials,
  ): Promise<Result<Payment, PaymentError>>;

  // Public interface methods with pre/post validation
  async createWallet(
    req: CreateWalletRequest,
    creds: ProviderCredentials,
  ): Promise<Result<Wallet, PaymentError>> {
    const validation = this.validateCredentials(creds);
    if (!validation.ok) return validation;

    return this.doCreateWallet(req, creds);
  }

  async fetchWallet(
    walletId: string,
    creds: ProviderCredentials,
  ): Promise<Result<Wallet, PaymentError>> {
    const validation = this.validateCredentials(creds);
    if (!validation.ok) return validation;

    return this.doFetchWallet(walletId, creds);
  }

  async fundWallet(
    req: FundWalletRequest,
    creds: ProviderCredentials,
  ): Promise<Result<Payment, PaymentError>> {
    const validation = this.validateCredentials(creds);
    if (!validation.ok) return validation;

    if (!this.supportsCurrency(req.amount.currency)) {
      return {
        ok: false,
        error: Errors.validation(
          `Currency ${req.amount.currency} not supported`,
        ),
      };
    }

    return this.doFundWallet(req, creds);
  }

  async withdraw(
    req: WithdrawRequest,
    creds: ProviderCredentials,
  ): Promise<Result<Payment, PaymentError>> {
    const validation = this.validateCredentials(creds);
    if (!validation.ok) return validation;

    if (!this.supportsCurrency(req.amount.currency)) {
      return {
        ok: false,
        error: Errors.validation(
          `Currency ${req.amount.currency} not supported`,
        ),
      };
    }

    return this.doWithdraw(req, creds);
  }

  async getBalance(
    walletId: string,
    creds: ProviderCredentials,
  ): Promise<Result<BalanceResponse, PaymentError>> {
    const validation = this.validateCredentials(creds);
    if (!validation.ok) return validation;

    return this.doGetBalance(walletId, creds);
  }

  async verifyTransaction(
    providerRef: string,
    creds: ProviderCredentials,
  ): Promise<Result<Payment, PaymentError>> {
    const validation = this.validateCredentials(creds);
    if (!validation.ok) return validation;

    return this.doVerifyTransaction(providerRef, creds);
  }

  parseWebhook(
    payload: unknown,
    signature: string,
    creds: ProviderCredentials,
  ): Result<Payment, PaymentError> {
    // Base implementation returns error - providers override
    return {
      ok: false,
      error: Errors.provider('Webhook parsing not implemented', this.id),
    };
  }

  // Helpers
  protected supportsCurrency(currency: string): boolean {
    return this.supportedCurrencies.includes(currency);
  }

  protected validateCredentials(
    creds: ProviderCredentials,
  ): Result<true, PaymentError> {
    if (!creds.apiKey) {
      return {
        ok: false,
        error: Errors.configuration('API key required', this.id),
      };
    }
    return { ok: true, value: true };
  }
}
