// ============================================================================
// Payment Domain Types
// ============================================================================
// Pure data structures. No logic. Immutable by convention.

export type ProviderId =
  | 'flutterwave'
  | 'paystack'
  | 'mtn-momo'
  | 'airtel-money'
  | 'orange-money'
  | 'paypal';

export type CurrencyCode = 'NGN' | 'GHS' | 'KES' | 'USD' | 'EUR' | 'GBP';

export type PaymentStatus =
  | 'pending'
  | 'success'
  | 'failed'
  | 'cancelled'
  | 'refunded';

export type WalletAction =
  | 'create'
  | 'fund'
  | 'withdraw'
  | 'balance'
  | 'verify';

// Domain entity: Wallet in our system
export interface Wallet {
  readonly id: string;
  readonly userId: string;
  readonly currency: CurrencyCode;
  readonly provider: ProviderId;
  readonly providerRef: string; // External reference
  readonly createdAt: Date;
  readonly metadata?: Record<string, unknown>;
}

// Domain entity: Payment Transaction
export interface Payment {
  readonly id: string;
  readonly walletId: string;
  readonly amount: Amount;
  readonly status: PaymentStatus;
  readonly provider: ProviderId;
  readonly providerRef: string;
  readonly action: WalletAction;
  readonly createdAt: Date;
  readonly completedAt?: Date;
  readonly failureReason?: string;
}

// Value object: Monetary amount
export interface Amount {
  readonly value: number;
  readonly currency: CurrencyCode;
}

// Value object: Provider credentials
export interface ProviderCredentials {
  readonly apiKey: string;
  readonly secretKey?: string;
  readonly publicKey?: string;
  readonly webhookSecret?: string;
  readonly baseUrl?: string; // Optional override
}

// Configuration for provider behavior
export interface ProviderConfig {
  readonly timeoutMs: number;
  readonly maxRetries: number;
  readonly circuitBreakerThreshold: number;
  readonly circuitBreakerResetMs: number;
}

// Standard result wrapper for operations
export type Result<T, E = PaymentError> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

// Request/Response payloads
export interface CreateWalletRequest {
  readonly userId: string;
  readonly currency: CurrencyCode;
  readonly email: string;
  readonly phone?: string;
  readonly metadata?: Record<string, unknown>;
}

export interface FundWalletRequest {
  readonly walletId: string;
  readonly amount: Amount;
  readonly source: 'card' | 'bank' | 'mobile-money' | 'paypal';
  readonly sourceDetails: Record<string, unknown>;
}

export interface WithdrawRequest {
  readonly walletId: string;
  readonly amount: Amount;
  readonly destination: 'bank' | 'mobile-money';
  readonly destinationDetails: Record<string, unknown>;
}

export interface BalanceResponse {
  readonly available: Amount;
  readonly pending?: Amount;
  readonly currency: CurrencyCode;
}

// Error types for discriminated unions
export type PaymentError =
  | NetworkError
  | ProviderError
  | ValidationError
  | InsufficientFundsError
  | DuplicateError
  | ConfigurationError
  | CircuitOpenError;

export interface NetworkError {
  readonly type: 'NETWORK_ERROR';
  readonly message: string;
  readonly provider: ProviderId;
  readonly isRetryable: boolean;
}

export interface ProviderError {
  readonly type: 'PROVIDER_ERROR';
  readonly message: string;
  readonly provider: ProviderId;
  readonly providerCode?: string;
  readonly isRetryable: boolean;
}

export interface ValidationError {
  readonly type: 'VALIDATION_ERROR';
  readonly message: string;
  readonly field?: string;
}

export interface InsufficientFundsError {
  readonly type: 'INSUFFICIENT_FUNDS';
  readonly message: string;
  readonly requested: Amount;
  readonly available: Amount;
}

export interface DuplicateError {
  readonly type: 'DUPLICATE_ERROR';
  readonly message: string;
  readonly idempotencyKey: string;
}

export interface ConfigurationError {
  readonly type: 'CONFIGURATION_ERROR';
  readonly message: string;
  readonly provider: ProviderId;
}

export interface CircuitOpenError {
  readonly type: 'CIRCUIT_OPEN';
  readonly message: string;
  readonly provider: ProviderId;
  readonly retryAfter: Date;
}
