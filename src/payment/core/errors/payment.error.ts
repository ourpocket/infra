// ============================================================================
// Payment Error Helpers
// ============================================================================
// Factory functions for creating domain errors. Keeps error creation consistent.

import {
  NetworkError,
  ProviderError,
  ValidationError,
  InsufficientFundsError,
  DuplicateError,
  ConfigurationError,
  CircuitOpenError,
  Amount,
  ProviderId,
} from '../types/payment.types';

export const Errors = {
  network: (
    message: string,
    provider: ProviderId,
    isRetryable = true,
  ): NetworkError => ({
    type: 'NETWORK_ERROR',
    message,
    provider,
    isRetryable,
  }),

  provider: (
    message: string,
    provider: ProviderId,
    code?: string,
    isRetryable = false,
  ): ProviderError => ({
    type: 'PROVIDER_ERROR',
    message,
    provider,
    providerCode: code,
    isRetryable,
  }),

  validation: (message: string, field?: string): ValidationError => ({
    type: 'VALIDATION_ERROR',
    message,
    field,
  }),

  insufficientFunds: (
    requested: Amount,
    available: Amount,
  ): InsufficientFundsError => ({
    type: 'INSUFFICIENT_FUNDS',
    message: `Insufficient funds: requested ${requested.value} ${requested.currency}, available ${available.value} ${available.currency}`,
    requested,
    available,
  }),

  duplicate: (idempotencyKey: string): DuplicateError => ({
    type: 'DUPLICATE_ERROR',
    message: `Duplicate request detected: ${idempotencyKey}`,
    idempotencyKey,
  }),

  configuration: (
    message: string,
    provider: ProviderId,
  ): ConfigurationError => ({
    type: 'CONFIGURATION_ERROR',
    message,
    provider,
  }),

  circuitOpen: (provider: ProviderId, retryAfter: Date): CircuitOpenError => ({
    type: 'CIRCUIT_OPEN',
    message: `Circuit breaker open for ${provider}. Retry after ${retryAfter.toISOString()}`,
    provider,
    retryAfter,
  }),
} as const;
