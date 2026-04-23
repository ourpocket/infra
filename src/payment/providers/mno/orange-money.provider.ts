// ============================================================================
// Orange Money Provider
// ============================================================================

import {
  MnoProvider,
  MnoConfig,
  OrangeRequest,
  OrangeResponse,
} from './mno-base.provider';
import {
  FundWalletRequest,
  WithdrawRequest,
  Payment,
  BalanceResponse,
  ProviderCredentials,
  Result,
  PaymentError,
} from '../../core/types/payment.types';
import { Errors } from '../../core/errors/payment.error';
import { post, get } from '../../infrastructure/http/http-client';
import {
  buildAmount,
  generateRef,
} from '../../infrastructure/mapper/request-mapper';

const ORANGE_ENDPOINTS = {
  BASE: 'https://api.orange.com/orange-money', // Sandbox
  PRODUCTION: 'https://api.orange.com/orange-money',
  PAYMENT: '/v1/payment',
  TRANSFER: '/v1/transfer',
  BALANCE: '/v1/balance',
  VERIFY: '/v1/payment/{transactionId}',
};

export class OrangeMoneyProvider extends MnoProvider {
  readonly name = 'Orange Money';
  readonly supportedCurrencies = ['XOF', 'XAF', 'CDF'] as const; // West/Central Africa

  constructor(config: MnoConfig) {
    super('orange-money', config);
  }

  protected async doFundWallet(
    req: FundWalletRequest,
    creds: ProviderCredentials,
  ): Promise<Result<Payment, PaymentError>> {
    const orangeReq: OrangeRequest = {
      merchant_name: process.env.ORANGE_MERCHANT_NAME || 'OurPocket',
      merchant_code: this.mnoConfig.apiUser,
      merchant_key: creds.apiKey,
      reference_number: generateRef('orange_fund'),
      amount: req.amount.value.toString(),
      currency: req.amount.currency,
      msisdn: req.sourceDetails.phoneNumber as string,
    };

    const result = await post<OrangeResponse>(
      ORANGE_ENDPOINTS.PAYMENT,
      creds,
      this.id,
      this.httpConfig,
      orangeReq,
    );

    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    const payment: Payment = {
      id: '',
      walletId: req.walletId,
      amount: req.amount,
      status: this.mapOrangeStatus(result.value.status),
      provider: this.id,
      providerRef: result.value.transaction_id,
      action: 'fund',
      createdAt: new Date(),
    };

    return { ok: true, value: payment };
  }

  protected async doWithdraw(
    req: WithdrawRequest,
    creds: ProviderCredentials,
  ): Promise<Result<Payment, PaymentError>> {
    const orangeReq: OrangeRequest = {
      merchant_name: process.env.ORANGE_MERCHANT_NAME || 'OurPocket',
      merchant_code: this.mnoConfig.apiUser,
      merchant_key: creds.apiKey,
      reference_number: generateRef('orange_withdraw'),
      amount: req.amount.value.toString(),
      currency: req.amount.currency,
      msisdn: req.destinationDetails.phoneNumber as string,
    };

    const result = await post<OrangeResponse>(
      ORANGE_ENDPOINTS.TRANSFER,
      creds,
      this.id,
      this.httpConfig,
      orangeReq,
    );

    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    const payment: Payment = {
      id: '',
      walletId: req.walletId,
      amount: req.amount,
      status: this.mapOrangeStatus(result.value.status),
      provider: this.id,
      providerRef: result.value.transaction_id,
      action: 'withdraw',
      createdAt: new Date(),
    };

    return { ok: true, value: payment };
  }

  protected async doGetBalance(
    walletId: string,
    creds: ProviderCredentials,
  ): Promise<Result<BalanceResponse, PaymentError>> {
    const result = await get<{ available: string; currency: string }>(
      ORANGE_ENDPOINTS.BALANCE,
      creds,
      this.id,
      this.httpConfig,
    );

    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    const balance: BalanceResponse = {
      available: buildAmount(
        parseFloat(result.value.available),
        result.value.currency,
      ),
      currency: result.value.currency as BalanceResponse['currency'],
    };

    return { ok: true, value: balance };
  }

  private mapOrangeStatus(status: string): Payment['status'] {
    const mapping: Record<string, Payment['status']> = {
      SUCCESS: 'success',
      PENDING: 'pending',
      FAILED: 'failed',
      CANCELLED: 'cancelled',
      REFUNDED: 'refunded',
    };
    return mapping[status.toUpperCase()] || 'pending';
  }
}
