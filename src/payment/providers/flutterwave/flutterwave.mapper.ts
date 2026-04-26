// ============================================================================
// Flutterwave Mapper
// ============================================================================
// Transforms between domain models and FLW API payloads.

import {
  CreateWalletRequest,
  FundWalletRequest,
  WithdrawRequest,
  Wallet,
  Payment,
  BalanceResponse,
  ProviderId,
} from '../../core/types/payment.types';
import {
  buildAmount,
  generateRef,
} from '../../infrastructure/mapper/request-mapper';
import {
  FLWCreateAccountRequest,
  FLWCreateAccountResponse,
  FLWFetchAccountResponse,
  FLWChargeRequest,
  FLWChargeResponse,
  FLWTransferRequest,
  FLWTransferResponse,
  FLWVerifyResponse,
  FLWBalanceResponse,
} from './flutterwave.types';

const PROVIDER_ID: ProviderId = 'flutterwave';

// Map domain requests to FLW requests
export const mapCreateWallet = (
  req: CreateWalletRequest,
): FLWCreateAccountRequest => ({
  email: req.email,
  is_permanent: true,
  tx_ref: generateRef('flw_wallet'),
  phonenumber: req.phone,
  firstname: req.metadata?.firstName as string | undefined,
  lastname: req.metadata?.lastName as string | undefined,
  narration: `Wallet for ${req.userId}`,
});

export const mapFundWallet = (req: FundWalletRequest): FLWChargeRequest => ({
  currency: req.amount.currency,
  amount: (req.amount.value * 100).toString(), // Convert to kobo/cents
  email: req.sourceDetails.email as string,
  tx_ref: generateRef('flw_fund'),
  ...(req.source === 'card' && {
    card_number: req.sourceDetails.cardNumber as string,
    cvv: req.sourceDetails.cvv as string,
    expiry_month: req.sourceDetails.expiryMonth as string,
    expiry_year: req.sourceDetails.expiryYear as string,
  }),
});

export const mapWithdraw = (req: WithdrawRequest): FLWTransferRequest => ({
  account_bank: req.destinationDetails.bankCode as string,
  account_number: req.destinationDetails.accountNumber as string,
  amount: req.amount.value,
  currency: req.amount.currency,
  narration: `Withdrawal from wallet ${req.walletId}`,
  reference: generateRef('flw_withdraw'),
});

// Map FLW responses to domain models
export const mapWallet = (
  res: FLWCreateAccountResponse | FLWFetchAccountResponse,
): Wallet => ({
  id: res.data.order_ref,
  userId: '', // Set by caller from context
  currency: res.data.currency as Wallet['currency'],
  provider: PROVIDER_ID,
  providerRef: res.data.order_ref,
  createdAt: new Date(res.data.created_at),
  metadata: {
    accountNumber: res.data.account_number,
    bankName: res.data.bank_name,
  },
});

// Type guards for payment responses
const isChargeResponse = (data: unknown): data is FLWChargeResponse['data'] => {
  return data !== null && typeof data === 'object' && 'flw_ref' in data;
};

const isTransferResponse = (
  data: unknown,
): data is FLWTransferResponse['data'] => {
  return (
    data !== null &&
    typeof data === 'object' &&
    'reference' in data &&
    !('flw_ref' in data)
  );
};

const isVerifyResponse = (data: unknown): data is FLWVerifyResponse['data'] => {
  return (
    data !== null &&
    typeof data === 'object' &&
    'flw_ref' in data &&
    'customer' in data &&
    'id' in data
  );
};

export const mapPayment = (
  res: FLWChargeResponse | FLWTransferResponse | FLWVerifyResponse,
  action: 'fund' | 'withdraw',
): Payment => {
  let providerRef: string;

  if (isChargeResponse(res.data)) {
    providerRef = res.data.flw_ref;
  } else if (isTransferResponse(res.data)) {
    providerRef = res.data.reference;
  } else if (isVerifyResponse(res.data)) {
    providerRef = res.data.flw_ref;
  } else {
    providerRef = 'unknown';
  }

  return {
    id: '', // Set by system
    walletId: '', // Set by caller
    amount: buildAmount(res.data.amount, res.data.currency),
    status: mapStatus(res.data.status),
    provider: PROVIDER_ID,
    providerRef,
    action,
    createdAt: new Date(res.data.created_at),
  };
};

export const mapBalance = (
  res: FLWBalanceResponse,
  currency: string,
): BalanceResponse => {
  const balance = res.data.find((b) => b.currency === currency);

  return {
    available: buildAmount(balance?.available_balance || 0, currency),
    pending: buildAmount(balance?.ledger_balance || 0, currency),
    currency: currency as BalanceResponse['currency'],
  };
};

// Status mapping
const mapStatus = (flwStatus: string): Payment['status'] => {
  const mapping: Record<string, Payment['status']> = {
    successful: 'success',
    pending: 'pending',
    failed: 'failed',
    cancelled: 'cancelled',
    refunded: 'refunded',
  };
  return mapping[flwStatus.toLowerCase()] || 'pending';
};

// Webhook parser
export const parseWebhook = (
  payload: unknown,
): FLWChargeResponse['data'] | null => {
  if (!payload || typeof payload !== 'object') return null;
  const p = payload as { data?: unknown };
  return p.data as FLWChargeResponse['data'] | null;
};
