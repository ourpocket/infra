// ============================================================================
// Paystack Provider Implementation
// ============================================================================
import { createHmac } from 'crypto';
import { Errors } from '../../core/errors/payment.error';
import {
  BalanceResponse,
  CreateWalletRequest,
  FundWalletRequest,
  Payment,
  PaymentError,
  ProviderCredentials,
  Result,
  Wallet,
  WithdrawRequest,
} from '../../core/types/payment.types';
import { get, post } from '../../infrastructure/http/http-client';
import { BaseProvider, BaseProviderConfig } from '../base/base-provider';
import {
  mapBalance,
  mapCreateWallet,
  mapFundWallet,
  mapPayment,
  mapTransferRecipient,
  mapWallet,
  mapWithdraw,
} from './paystack.mapper';
import {
  PAYSTACK_ENDPOINTS,
  PaystackBalanceResponse,
  PaystackCreateCustomerResponse,
  PaystackFetchCustomerResponse,
  PaystackInitializeResponse,
  PaystackTransferRecipientResponse,
  PaystackTransferResponse,
  PaystackVerifyResponse,
} from './paystack.types';
import { ProviderCurrencies } from '../../constants/provider-config.constants';

export class PaystackProvider extends BaseProvider {
  readonly name = 'Paystack';
  readonly supportedCurrencies = ProviderCurrencies.PAYSTACK;

  constructor(config: BaseProviderConfig) {
    super('paystack', config);
  }

  protected async doCreateWallet(
    req: CreateWalletRequest,
    creds: ProviderCredentials,
  ): Promise<Result<Wallet, PaymentError>> {
    const paystackReq = mapCreateWallet(req);

    const result = await post<PaystackCreateCustomerResponse>(
      PAYSTACK_ENDPOINTS.CUSTOMER.CREATE,
      creds,
      this.id,
      this.httpConfig,
      paystackReq,
    );

    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    if (!result.value.status) {
      return {
        ok: false,
        error: Errors.provider(
          result.value.message || 'Wallet creation failed',
          this.id,
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
    const result = await get<PaystackFetchCustomerResponse>(
      PAYSTACK_ENDPOINTS.CUSTOMER.GET(walletId),
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
    const paystackReq = mapFundWallet(req);

    const result = await post<PaystackInitializeResponse>(
      PAYSTACK_ENDPOINTS.TRANSACTION.INITIALIZE,
      creds,
      this.id,
      this.httpConfig,
      paystackReq,
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
    // Step 1: Create transfer recipient if not exists
    const recipientReq = mapTransferRecipient(req);
    const recipientResult = await post<PaystackTransferRecipientResponse>(
      PAYSTACK_ENDPOINTS.TRANSFER.RECIPIENT,
      creds,
      this.id,
      this.httpConfig,
      recipientReq,
    );

    if (!recipientResult.ok) {
      return { ok: false, error: recipientResult.error };
    }

    // Step 2: Initiate transfer
    const transferReq = {
      ...mapWithdraw(req),
      recipient: recipientResult.value.data.recipient_code,
    };

    const result = await post<PaystackTransferResponse>(
      PAYSTACK_ENDPOINTS.TRANSFER.CREATE,
      creds,
      this.id,
      this.httpConfig,
      transferReq,
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
    const result = await get<PaystackBalanceResponse>(
      PAYSTACK_ENDPOINTS.BALANCE,
      creds,
      this.id,
      this.httpConfig,
    );

    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    const balance = mapBalance(result.value);
    return { ok: true, value: balance };
  }

  protected async doVerifyTransaction(
    providerRef: string,
    creds: ProviderCredentials,
  ): Promise<Result<Payment, PaymentError>> {
    const result = await get<PaystackVerifyResponse>(
      PAYSTACK_ENDPOINTS.TRANSACTION.VERIFY(providerRef),
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
    if (!this.verifyWebhookSignature(payload, signature, creds.webhookSecret)) {
      return {
        ok: false,
        error: Errors.provider('Invalid webhook signature', this.id),
      };
    }

    const paystackPayload = payload as {
      event?: string;
      data?: PaystackVerifyResponse['data'];
    };

    if (!paystackPayload.data) {
      return {
        ok: false,
        error: Errors.provider('Invalid webhook payload', this.id),
      };
    }

    const action = paystackPayload.event?.includes('transfer')
      ? 'withdraw'
      : 'fund';
    const payment = mapPayment(
      { status: true, message: 'OK', data: paystackPayload.data },
      action,
    );

    return { ok: true, value: payment };
  }

  private verifyWebhookSignature(
    payload: unknown,
    signature: string,
    secret?: string,
  ): boolean {
    if (!secret) return true; // Skip in dev

    // Paystack uses HMAC SHA512
    const hash = createHmac('sha512', secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    return hash === signature;
  }
}
