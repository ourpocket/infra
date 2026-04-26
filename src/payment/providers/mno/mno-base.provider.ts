// ============================================================================
// MNO (Mobile Network Operator) Base Provider
// ============================================================================
// Base class for MTN Mobile Money, Airtel Money, Orange Money.
// These providers have similar mobile money APIs.

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
  ProviderId,
} from '../../core/types/payment.types';
import { Errors } from '../../core/errors/payment.error';
import { post, get } from '../../infrastructure/http/http-client';

// MNO-specific types
export interface MnoConfig extends BaseProviderConfig {
  readonly apiUser: string;
  readonly apiUserId: string;
  readonly primaryKey: string;
  readonly secondaryKey: string;
}

// MTN MoMo API types
export interface MtnRequest {
  amount: string;
  currency: string;
  externalId: string;
  payer: {
    partyIdType: 'MSISDN';
    partyId: string;
  };
  payerMessage?: string;
  payeeNote?: string;
}

export interface MtnResponse {
  referenceId: string;
  status: 'PENDING' | 'SUCCESSFUL' | 'FAILED';
  financialTransactionId?: string;
  reason?: string;
}

export interface MtnBalanceResponse {
  availableBalance: string;
  currency: string;
}

// Airtel Money API types
export interface AirtelRequest {
  reference: string;
  subscriber: {
    country: string;
    currency: string;
    msisdn: string;
  };
  transaction: {
    amount: string;
    country: string;
    currency: string;
    id: string;
  };
}

export interface AirtelResponse {
  transaction: {
    id: string;
    status: 'TS' | 'TF' | 'TA'; // Success, Failed, Aborted
    airtel_money_id?: string;
  };
}

// Orange Money API types
export interface OrangeRequest {
  merchant_name: string;
  merchant_code: string;
  merchant_key: string;
  reference_number: string;
  amount: string;
  currency: string;
  msisdn: string;
}

export interface OrangeResponse {
  status: string;
  transaction_id: string;
  message: string;
}

export abstract class MnoProvider extends BaseProvider {
  protected constructor(
    id: ProviderId,
    protected readonly mnoConfig: MnoConfig,
  ) {
    super(id, mnoConfig);
  }

  // MNOs don't create "wallets" in the same sense - they use phone numbers
  // eslint-disable-next-line @typescript-eslint/require-await
  protected async doCreateWallet(
    req: CreateWalletRequest,
    creds: ProviderCredentials,
  ): Promise<Result<Wallet, PaymentError>> {
    // Return a virtual wallet tied to phone number
    const wallet: Wallet = {
      id: req.phone || req.userId,
      userId: req.userId,
      currency: req.currency,
      provider: this.id,
      providerRef: req.phone || req.userId,
      createdAt: new Date(),
      metadata: {
        phoneNumber: req.phone,
        email: req.email,
      },
    };

    return { ok: true, value: wallet };
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  protected async doFetchWallet(
    walletId: string,
    creds: ProviderCredentials,
  ): Promise<Result<Wallet, PaymentError>> {
    // MNO wallets are just phone numbers - minimal info
    const wallet: Wallet = {
      id: walletId,
      userId: walletId,
      currency: 'NGN', // Default
      provider: this.id,
      providerRef: walletId,
      createdAt: new Date(),
      metadata: {
        phoneNumber: walletId,
      },
    };

    return { ok: true, value: wallet };
  }

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

  // eslint-disable-next-line @typescript-eslint/require-await
  protected async doVerifyTransaction(
    providerRef: string,
    creds: ProviderCredentials,
  ): Promise<Result<Payment, PaymentError>> {
    // MNO verification is provider-specific
    return {
      ok: false,
      error: Errors.provider(
        'Transaction verification not implemented',
        this.id,
      ),
    };
  }
}
