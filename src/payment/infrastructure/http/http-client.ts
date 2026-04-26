// ============================================================================
// HTTP Client with Pooling
// ============================================================================
// Reuses Axios instances per base URL. O(1) lookup via Map.

import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import {
  ProviderCredentials,
  ProviderId,
  Result,
  PaymentError,
} from '../../core/types/payment.types';
import { Errors } from '../../core/errors/payment.error';
import { CircuitBreaker } from '../circuit-breaker/circuit-breaker';
import {
  calculateDelay,
  isRetryableError,
  RetryPolicy,
  sleep,
  DEFAULT_RETRY_POLICY,
} from '../retry/retry.policy';
import {
  generateIdempotencyKey,
  idempotencyStore,
} from '../idempotency/idempotency-key';

// Connection pool - one client per unique base URL
const clientPool = new Map<string, AxiosInstance>();

export interface HttpClientConfig {
  readonly timeoutMs: number;
  readonly retryPolicy: RetryPolicy;
  readonly circuitBreaker: CircuitBreaker;
}

// Build cache key from credentials
const buildCacheKey = (
  creds: ProviderCredentials,
  baseUrlOverride?: string,
): string => {
  const baseUrl = baseUrlOverride || creds.baseUrl || '';
  return `${baseUrl}::${creds.apiKey.slice(0, 8)}`;
};

// Get or create pooled client
const getClient = (
  creds: ProviderCredentials,
  baseUrlOverride?: string,
): AxiosInstance => {
  // Use explicit override first, then credentials baseUrl, then default
  const baseURL = baseUrlOverride || creds.baseUrl;

  if (!baseURL) {
    throw new Error('No base URL provided for HTTP client');
  }

  const key = `${baseURL}::${creds.apiKey.slice(0, 8)}`;

  const existing = clientPool.get(key);
  if (existing) return existing;

  const fresh = axios.create({
    baseURL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
      ...(creds.apiKey && { Authorization: `Bearer ${creds.apiKey}` }),
    },
  });

  clientPool.set(key, fresh);
  return fresh;
};

// Execute with circuit breaker + retry
export const executeRequest = async <T>(
  config: AxiosRequestConfig,
  creds: ProviderCredentials,
  providerId: ProviderId,
  httpConfig: HttpClientConfig,
  baseUrlOverride?: string,
): Promise<Result<T, PaymentError>> => {
  // Check circuit breaker
  if (!httpConfig.circuitBreaker.canExecute()) {
    const retryAfter =
      httpConfig.circuitBreaker.getRetryAfter() || new Date(Date.now() + 60000);
    return { ok: false, error: Errors.circuitOpen(providerId, retryAfter) };
  }

  const client = getClient(creds, baseUrlOverride);
  let lastError: unknown;

  for (
    let attempt = 1;
    attempt <= httpConfig.retryPolicy.maxAttempts;
    attempt++
  ) {
    try {
      const response = await client.request<T>(config);
      httpConfig.circuitBreaker.recordSuccess();
      return { ok: true, value: response.data };
    } catch (error) {
      lastError = error;

      const axiosError = error as AxiosError;

      // Check if we should retry
      if (
        attempt < httpConfig.retryPolicy.maxAttempts &&
        isRetryableError(axiosError, httpConfig.retryPolicy)
      ) {
        const delay = calculateDelay(attempt, httpConfig.retryPolicy);
        await sleep(delay);
        continue;
      }

      // Not retryable or out of attempts
      break;
    }
  }

  // All attempts failed
  httpConfig.circuitBreaker.recordFailure();

  const axiosError = lastError as AxiosError;
  const message = axiosError.message || 'Unknown HTTP error';
  const isRetryable = isRetryableError(axiosError, httpConfig.retryPolicy);

  return {
    ok: false,
    error: Errors.network(message, providerId, isRetryable),
  };
};

// Typed request helpers with idempotency
export const get = <T>(
  url: string,
  creds: ProviderCredentials,
  providerId: ProviderId,
  httpConfig: HttpClientConfig,
  params?: Record<string, unknown>,
): Promise<Result<T, PaymentError>> =>
  executeRequest<T>(
    { method: 'GET', url, params },
    creds,
    providerId,
    httpConfig,
  );

export const post = <T>(
  url: string,
  creds: ProviderCredentials,
  providerId: ProviderId,
  httpConfig: HttpClientConfig,
  data?: unknown,
  idempotencyKey?: string,
): Promise<Result<T, PaymentError>> => {
  // Check cache first
  const key = idempotencyKey || generateIdempotencyKey();
  const cached = idempotencyStore.get(key);
  if (cached) {
    return Promise.resolve({ ok: true, value: cached as T });
  }

  const config: AxiosRequestConfig = {
    method: 'POST',
    url,
    data,
    headers: {
      'X-Idempotency-Key': key,
    },
  };

  return executeRequest<T>(config, creds, providerId, httpConfig);
};

export const put = <T>(
  url: string,
  creds: ProviderCredentials,
  providerId: ProviderId,
  httpConfig: HttpClientConfig,
  data?: unknown,
): Promise<Result<T, PaymentError>> =>
  executeRequest<T>(
    { method: 'PUT', url, data },
    creds,
    providerId,
    httpConfig,
  );
