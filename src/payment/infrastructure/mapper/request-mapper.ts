// ============================================================================
// Request/Response Mappers
// ============================================================================
// Transform between domain models and provider-specific payloads.
// Each provider implements its own mappers.

import {
  CreateWalletRequest,
  FundWalletRequest,
  WithdrawRequest,
  Wallet,
  Payment,
  BalanceResponse,
  Amount,
  ProviderId,
} from '../../core/types/payment.types';

// Map domain request to provider payload
export interface RequestMapper<P> {
  mapCreateWallet(req: CreateWalletRequest): P;
  mapFundWallet(req: FundWalletRequest): P;
  mapWithdraw(req: WithdrawRequest): P;
}

// Map provider response to domain model
export interface ResponseMapper<R> {
  mapWallet(response: R, providerId: ProviderId): Wallet;
  mapPayment(
    response: R,
    action: 'fund' | 'withdraw',
    providerId: ProviderId,
  ): Payment;
  mapBalance(response: R, currency: string): BalanceResponse;
}

// Combined mapper interface
export interface ProviderMapper<Req, Res>
  extends RequestMapper<Req>,
    ResponseMapper<Res> {}

// Utility: Build amount from value + currency
export const buildAmount = (value: number, currency: string): Amount => ({
  value,
  currency: currency as Amount['currency'],
});

// Utility: Parse amount from provider format (varies by provider)
export const parseAmount = (
  value: number | string,
  currency: string,
  divisor = 100, // Most providers return in smallest unit
): Amount => ({
  value:
    typeof value === 'string' ? parseInt(value, 10) / divisor : value / divisor,
  currency: currency as Amount['currency'],
});

// Utility: Generate provider reference (idempotency)
export const generateRef = (prefix: string): string =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
