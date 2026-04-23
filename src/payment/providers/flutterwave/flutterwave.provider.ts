// ============================================================================
// Flutterwave Provider Implementation
// ============================================================================
// Concrete implementation of IPaymentProvider for Flutterwave.
// Handles all FLW-specific API calls and error mapping.

import { BaseProvider, BaseProviderConfig } from '../base/base-provider';
import {
  CreateWalletRequest,
  FundWalletRequest,
  WithdrawRequest,
  Wallet,
  Payment,
  BalanceResponse,
  ProviderCredentials,
  Result,
  PaymentError,
} from '../../core/types/payment.types';
import { Errors } from '../../core/errors/payment.error';
import { post, get } from '../../infrastructure/http/http-client';
import {
  FLW_ENDPOINTS,
  FLWCreateAccountResponse,
  FLWFetchAccountResponse,
  FLWChargeResponse,
  FLWTransferResponse,
  FLWBalanceResponse,
  FLWVerifyResponse,
  FLWWebhookPayload,
} from './flutterwave.types';
import { ProviderCurrencies } from '../../constants/provider-config.constants';
import {
  mapCreateWallet,
  mapFundWallet,
  mapWithdraw,
  mapWallet,
  mapPayment,
  mapBalance,
} from './flutterwave.mapper';

export class FlutterwaveProvider extends BaseProvider {
  readonly name = 'Flutterwave';
  readonly supportedCurrencies = ProviderCurrencies.FLUTTERWAVE;

  constructor(config: BaseProviderConfig) {
    super('flutterwave', config);
  }

  protected async doCreateWallet(
    req: CreateWalletRequest,
    creds: ProviderCredentials,
  ): Promise<Result<Wallet, PaymentError>> {
    const flwReq = mapCreateWallet(req);

    const result = await post<FLWCreateAccountResponse>(
      FLW_ENDPOINTS.VIRTUAL_ACCOUNTS.CREATE,
      creds,
      this.id,
      this.httpConfig,
      flwReq,
    );

    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    if (result.value.status !== 'success') {
      return {
        ok: false,
        error: Errors.provider(
          result.value.message || 'Wallet creation failed',
          this.id,
          result.value.status,
        ),
      };
    }

    const wallet = mapWallet(result.value);
    return { ok: true, value: { ...wallet, userId: req.userId } };
  }

  protected async doFetchWallet(
    walletId: string,
    creds: ProviderCredentials,
  ): Promise<Result<Wallet, PaymentError>> {
    const result = await get<FLWFetchAccountResponse>(
      FLW_ENDPOINTS.VIRTUAL_ACCOUNTS.FETCH(walletId),
      creds,
      this.id,
      this.httpConfig,
    );

    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    const wallet = mapWallet(result.value);
    return { ok: true, value: wallet };
  }

  protected async doFundWallet(
    req: FundWalletRequest,
    creds: ProviderCredentials,
  ): Promise<Result<Payment, PaymentError>> {
    const flwReq = mapFundWallet(req);

    const result = await post<FLWChargeResponse>(
      FLW_ENDPOINTS.TRANSACTIONS.INITIATE,
      creds,
      this.id,
      this.httpConfig,
      flwReq,
    );

    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    const payment = mapPayment(result.value, 'fund');
    return { ok: true, value: { ...payment, walletId: req.walletId } };
  }

  protected async doWithdraw(
    req: WithdrawRequest,
    creds: ProviderCredentials,
  ): Promise<Result<Payment, PaymentError>> {
    const flwReq = mapWithdraw(req);

    const result = await post<FLWTransferResponse>(
      FLW_ENDPOINTS.TRANSFERS.CREATE,
      creds,
      this.id,
      this.httpConfig,
      flwReq,
    );

    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    const payment = mapPayment(result.value, 'withdraw');
    return { ok: true, value: { ...payment, walletId: req.walletId } };
  }

  protected async doGetBalance(
    walletId: string,
    creds: ProviderCredentials,
  ): Promise<Result<BalanceResponse, PaymentError>> {
    // FLW doesn't have per-wallet balance; returns account balance
    const result = await get<FLWBalanceResponse>(
      FLW_ENDPOINTS.TRANSFERS.BALANCE,
      creds,
      this.id,
      this.httpConfig,
    );

    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    // Default to NGN if not specified
    const balance = mapBalance(result.value, 'NGN');
    return { ok: true, value: balance };
  }

  protected async doVerifyTransaction(
    providerRef: string,
    creds: ProviderCredentials,
  ): Promise<Result<Payment, PaymentError>> {
    const result = await get<FLWVerifyResponse>(
      FLW_ENDPOINTS.TRANSACTIONS.VERIFY(providerRef),
      creds,
      this.id,
      this.httpConfig,
    );

    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    const payment = mapPayment(result.value, 'fund');
    return { ok: true, value: payment };
  }

  parseWebhook(
    payload: unknown,
    signature: string,
    creds: ProviderCredentials,
  ): Result<Payment, PaymentError> {
    // Verify webhook signature
    if (!this.verifyWebhookSignature(payload, signature, creds.webhookSecret)) {
      return {
        ok: false,
        error: Errors.provider('Invalid webhook signature', this.id),
      };
    }

    const flwPayload = payload as FLWWebhookPayload;

    if (!flwPayload.data) {
      return {
        ok: false,
        error: Errors.provider('Invalid webhook payload', this.id),
      };
    }

    const payment: Payment = {
      id: '',
      walletId: '',
      amount: {
        value: flwPayload.data.amount,
        currency: flwPayload.data.currency as Payment['amount']['currency'],
      },
      status: this.mapWebhookStatus(flwPayload.data.status),
      provider: this.id,
      providerRef: flwPayload.data.flw_ref || String(flwPayload.data.id),
      action: flwPayload.event === 'charge.completed' ? 'fund' : 'withdraw',
      createdAt: new Date(flwPayload.data.created_at),
    };

    return { ok: true, value: payment };
  }

  private verifyWebhookSignature(
    payload: unknown,
    signature: string,
    secret?: string,
  ): boolean {
    if (!secret) return false;

    // FLW webhook verification: hash(secret) == signature
    // Simplified - actual implementation would use crypto
    return true; // Placeholder
  }

  private mapWebhookStatus(status: string): Payment['status'] {
    const mapping: Record<string, Payment['status']> = {
      successful: 'success',
      completed: 'success',
      pending: 'pending',
      failed: 'failed',
      cancelled: 'cancelled',
    };
    return mapping[status.toLowerCase()] || 'pending';
  }
}
