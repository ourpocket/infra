// ============================================================================
// Airtel Money Provider
// ============================================================================

import {
  MnoProvider,
  MnoConfig,
  AirtelRequest,
  AirtelResponse,
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
import { ProviderCurrencies } from '../../constants/provider-config.constants';

const AIRTEL_ENDPOINTS = {
  BASE: 'https://openapiuat.airtel.africa', // Sandbox
  PRODUCTION: 'https://openapi.airtel.africa',
  COLLECTION: '/merchant/v1/payments/',
  REFUND: '/merchant/v1/payments/refund',
  BALANCE: '/merchant/v1/balance',
  VERIFY: '/merchant/v1/payments/{transactionId}',
};

export class AirtelMoneyProvider extends MnoProvider {
  readonly name = 'Airtel Money';
  readonly supportedCurrencies = ProviderCurrencies.AIRTEL_MONEY;

  constructor(config: MnoConfig) {
    super('airtel-money', config);
  }

  protected async doFundWallet(
    req: FundWalletRequest,
    creds: ProviderCredentials,
  ): Promise<Result<Payment, PaymentError>> {
    const country = this.mapCurrencyToCountry(req.amount.currency);

    const airtelReq: AirtelRequest = {
      reference: generateRef('airtel_fund'),
      subscriber: {
        country,
        currency: req.amount.currency,
        msisdn: req.sourceDetails.phoneNumber as string,
      },
      transaction: {
        amount: req.amount.value.toString(),
        country,
        currency: req.amount.currency,
        id: generateRef('airtel_tx'),
      },
    };

    const result = await post<AirtelResponse>(
      AIRTEL_ENDPOINTS.COLLECTION,
      creds,
      this.id,
      this.httpConfig,
      airtelReq,
    );

    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    const payment: Payment = {
      id: '',
      walletId: req.walletId,
      amount: req.amount,
      status: this.mapAirtelStatus(result.value.transaction.status),
      provider: this.id,
      providerRef: result.value.transaction.id,
      action: 'fund',
      createdAt: new Date(),
    };

    return { ok: true, value: payment };
  }

  protected async doWithdraw(
    req: WithdrawRequest,
    creds: ProviderCredentials,
  ): Promise<Result<Payment, PaymentError>> {
    const country = this.mapCurrencyToCountry(req.amount.currency);

    const airtelReq: AirtelRequest = {
      reference: generateRef('airtel_withdraw'),
      subscriber: {
        country,
        currency: req.amount.currency,
        msisdn: req.destinationDetails.phoneNumber as string,
      },
      transaction: {
        amount: req.amount.value.toString(),
        country,
        currency: req.amount.currency,
        id: generateRef('airtel_tx'),
      },
    };

    const result = await post<AirtelResponse>(
      AIRTEL_ENDPOINTS.COLLECTION,
      creds,
      this.id,
      this.httpConfig,
      airtelReq,
    );

    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    const payment: Payment = {
      id: '',
      walletId: req.walletId,
      amount: req.amount,
      status: this.mapAirtelStatus(result.value.transaction.status),
      provider: this.id,
      providerRef: result.value.transaction.id,
      action: 'withdraw',
      createdAt: new Date(),
    };

    return { ok: true, value: payment };
  }

  protected async doGetBalance(
    walletId: string,
    creds: ProviderCredentials,
  ): Promise<Result<BalanceResponse, PaymentError>> {
    // Airtel returns balance per country, default to NGN
    const result = await get<{ balance: string; currency: string }>(
      AIRTEL_ENDPOINTS.BALANCE,
      creds,
      this.id,
      this.httpConfig,
    );

    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    const balance: BalanceResponse = {
      available: buildAmount(
        parseFloat(result.value.balance),
        result.value.currency,
      ),
      currency: result.value.currency as BalanceResponse['currency'],
    };

    return { ok: true, value: balance };
  }

  private mapCurrencyToCountry(currency: string): string {
    const mapping: Record<string, string> = {
      NGN: 'NG',
      GHS: 'GH',
      KES: 'KE',
      UGX: 'UG',
      TZS: 'TZ',
      ZMW: 'ZM',
      MWK: 'MW',
      RWF: 'RW',
    };
    return mapping[currency] || 'NG';
  }

  private mapAirtelStatus(status: string): Payment['status'] {
    const mapping: Record<string, Payment['status']> = {
      TS: 'success',
      TF: 'failed',
      TA: 'cancelled',
      TIP: 'pending', // Transaction In Progress
    };
    return mapping[status] || 'pending';
  }
}
