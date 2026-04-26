// ============================================================================
// MTN Mobile Money Provider
// ============================================================================

import {
  MnoProvider,
  MnoConfig,
  MtnRequest,
  MtnResponse,
  MtnBalanceResponse,
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

const MTN_ENDPOINTS = {
  BASE: 'https://sandbox.momodeveloper.mtn.com', // Sandbox
  PRODUCTION: 'https://momodeveloper.mtn.com',
  REQUEST_TO_PAY: '/collection/v1_0/requesttopay',
  TRANSFER: '/disbursement/v1_0/transfer',
  BALANCE: '/collection/v1_0/account/balance',
  VERIFY: '/collection/v1_0/requesttopay/{referenceId}',
};

export class MtnMomoProvider extends MnoProvider {
  readonly name = 'MTN Mobile Money';
  readonly supportedCurrencies = ProviderCurrencies.MTN_MOMO;

  constructor(config: MnoConfig) {
    super('mtn-momo', config);
  }

  protected async doFundWallet(
    req: FundWalletRequest,
    creds: ProviderCredentials,
  ): Promise<Result<Payment, PaymentError>> {
    const mtnReq: MtnRequest = {
      amount: req.amount.value.toString(),
      currency: req.amount.currency,
      externalId: generateRef('mtn_fund'),
      payer: {
        partyIdType: 'MSISDN',
        partyId: req.sourceDetails.phoneNumber as string,
      },
      payerMessage: `Payment to wallet ${req.walletId}`,
      payeeNote: 'MTN MoMo Payment',
    };

    const result = await post<MtnResponse>(
      MTN_ENDPOINTS.REQUEST_TO_PAY,
      creds,
      this.id,
      this.httpConfig,
      mtnReq,
    );

    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    const payment: Payment = {
      id: '',
      walletId: req.walletId,
      amount: req.amount,
      status: this.mapMtnStatus(result.value.status),
      provider: this.id,
      providerRef: result.value.referenceId,
      action: 'fund',
      createdAt: new Date(),
    };

    return { ok: true, value: payment };
  }

  protected async doWithdraw(
    req: WithdrawRequest,
    creds: ProviderCredentials,
  ): Promise<Result<Payment, PaymentError>> {
    const mtnReq: MtnRequest = {
      amount: req.amount.value.toString(),
      currency: req.amount.currency,
      externalId: generateRef('mtn_withdraw'),
      payer: {
        partyIdType: 'MSISDN',
        partyId: req.destinationDetails.phoneNumber as string,
      },
      payerMessage: `Transfer from wallet ${req.walletId}`,
      payeeNote: 'MTN MoMo Transfer',
    };

    const result = await post<MtnResponse>(
      MTN_ENDPOINTS.TRANSFER,
      creds,
      this.id,
      this.httpConfig,
      mtnReq,
    );

    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    const payment: Payment = {
      id: '',
      walletId: req.walletId,
      amount: req.amount,
      status: this.mapMtnStatus(result.value.status),
      provider: this.id,
      providerRef: result.value.referenceId,
      action: 'withdraw',
      createdAt: new Date(),
    };

    return { ok: true, value: payment };
  }

  protected async doGetBalance(
    walletId: string,
    creds: ProviderCredentials,
  ): Promise<Result<BalanceResponse, PaymentError>> {
    const result = await get<MtnBalanceResponse>(
      MTN_ENDPOINTS.BALANCE,
      creds,
      this.id,
      this.httpConfig,
    );

    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    const balance: BalanceResponse = {
      available: buildAmount(
        parseFloat(result.value.availableBalance),
        result.value.currency,
      ),
      currency: result.value.currency as BalanceResponse['currency'],
    };

    return { ok: true, value: balance };
  }

  private mapMtnStatus(mtnStatus: string): Payment['status'] {
    const mapping: Record<string, Payment['status']> = {
      PENDING: 'pending',
      SUCCESSFUL: 'success',
      FAILED: 'failed',
    };
    return mapping[mtnStatus] || 'pending';
  }
}
