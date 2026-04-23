// ============================================================================
// Retry Policy
// ============================================================================
// Exponential backoff with jitter. Prevents thundering herd.

export interface RetryPolicy {
  readonly maxAttempts: number;
  readonly baseDelayMs: number;
  readonly maxDelayMs: number;
  readonly backoffMultiplier: number;
  readonly retryableStatuses: readonly number[];
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  baseDelayMs: 100,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

// Calculate delay with full jitter
export const calculateDelay = (
  attempt: number,
  policy: RetryPolicy,
): number => {
  const exponential =
    policy.baseDelayMs * Math.pow(policy.backoffMultiplier, attempt - 1);
  const capped = Math.min(exponential, policy.maxDelayMs);
  // Full jitter: random value between 0 and capped
  return Math.random() * capped;
};

// Sleep helper
export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Check if error warrants retry
export const isRetryableError = (
  error: unknown,
  policy: RetryPolicy,
): boolean => {
  if (!error || typeof error !== 'object') return false;

  const err = error as { status?: number; code?: string };

  // Check HTTP status
  if (err.status && policy.retryableStatuses.includes(err.status)) {
    return true;
  }

  // Check error codes
  const retryableCodes = [
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'ECONNREFUSED',
  ];
  if (err.code && retryableCodes.includes(err.code)) {
    return true;
  }

  return false;
};
