// ============================================================================
// Paystack Mapper
// ============================================================================
// Transforms between domain models and Paystack API payloads.

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
  PaystackCreateCustomerRequest,
  PaystackCreateCustomerResponse,
  PaystackFetchCustomerResponse,
  PaystackInitializeRequest,
  PaystackInitializeResponse,
  PaystackTransferRecipientRequest,
  PaystackTransferRecipientResponse,
  PaystackTransferRequest,
  PaystackTransferResponse,
  PaystackVerifyResponse,
  PaystackBalanceResponse,
} from './paystack.types';

const PROVIDER_ID: ProviderId = 'paystack';

// Map domain requests to Paystack requests
export const mapCreateWallet = (
  req: CreateWalletRequest,
): PaystackCreateCustomerRequest => ({
  email: req.email,
  first_name: req.metadata?.firstName as string | undefined,
  last_name: req.metadata?.lastName as string | undefined,
  phone: req.phone,
  metadata: { userId: req.userId },
});

export const mapFundWallet = (
  req: FundWalletRequest,
): PaystackInitializeRequest => ({
  email: req.sourceDetails.email as string,
  amount: (req.amount.value * 100).toString(), // Convert to kobo
  currency: req.amount.currency,
  reference: generateRef('paystack_fund'),
  metadata: { walletId: req.walletId },
});

export const mapWithdraw = (req: WithdrawRequest): PaystackTransferRequest => ({
  source: 'balance',
  amount: (req.amount.value * 100).toString(), // Convert to kobo
  reference: generateRef('paystack_withdraw'),
  recipient: req.destinationDetails.recipientCode as string,
  reason: `Withdrawal from wallet ${req.walletId}`,
});

export const mapTransferRecipient = (
  req: WithdrawRequest,
): PaystackTransferRecipientRequest => ({
  type: req.destination === 'bank' ? 'nuban' : 'mobile_money',
  name: req.destinationDetails.accountName as string,
  account_number: req.destinationDetails.accountNumber as string,
  bank_code: req.destinationDetails.bankCode as string,
  currency: req.amount.currency,
});

// Map Paystack responses to domain models
export const mapWallet = (
  res: PaystackCreateCustomerResponse | PaystackFetchCustomerResponse,
): Wallet => {
  // Handle different response shapes
  const data = res.data;
  const createdAt = 'createdAt' in data ? data.createdAt : data.created_at;
  const firstName = 'first_name' in data ? data.first_name : undefined;
  const lastName = 'last_name' in data ? data.last_name : undefined;
  const phone = 'phone' in data ? data.phone : undefined;

  return {
    id: data.customer_code,
    userId: '', // Set by caller from context
    currency: 'NGN', // Paystack default
    provider: PROVIDER_ID,
    providerRef: data.customer_code,
    createdAt: new Date(createdAt),
    metadata: {
      email: data.email,
      firstName,
      lastName,
      phone,
    },
  };
};

export const mapPayment = (
  res:
    | PaystackInitializeResponse
    | PaystackTransferResponse
    | PaystackVerifyResponse,
  action: 'fund' | 'withdraw',
): Payment => {
  // Handle different response types
  if ('data' in res && 'reference' in res.data && 'amount' in res.data) {
    const data = res.data as PaystackVerifyResponse['data'];
    return {
      id: '',
      walletId: '',
      amount: buildAmount(data.amount / 100, data.currency),
      status: mapStatus(data.status),
      provider: PROVIDER_ID,
      providerRef: data.reference,
      action,
      createdAt: new Date(data.transaction_date || Date.now()),
    };
  }

  // Fallback for initialize response (no amount yet)
  return {
    id: '',
    walletId: '',
    amount: buildAmount(0, 'NGN'),
    status: 'pending',
    provider: PROVIDER_ID,
    providerRef: res.data.reference,
    action,
    createdAt: new Date(),
  };
};

export const mapBalance = (res: PaystackBalanceResponse): BalanceResponse => {
  const ngnBalance = res.data.find((b) => b.currency === 'NGN');

  return {
    available: buildAmount((ngnBalance?.balance || 0) / 100, 'NGN'),
    currency: 'NGN',
  };
};

// Status mapping
const mapStatus = (paystackStatus: string): Payment['status'] => {
  const mapping: Record<string, Payment['status']> = {
    success: 'success',
    pending: 'pending',
    failed: 'failed',
    abandoned: 'cancelled',
    reversed: 'refunded',
  };
  return mapping[paystackStatus.toLowerCase()] || 'pending';
};

// Webhook parser
export const parseWebhook = (
  payload: unknown,
): PaystackVerifyResponse['data'] | null => {
  if (!payload || typeof payload !== 'object') return null;
  const p = payload as { data?: unknown };
  return p.data as PaystackVerifyResponse['data'] | null;
};
