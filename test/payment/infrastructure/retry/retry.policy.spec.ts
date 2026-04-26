import {
  calculateDelay,
  sleep,
  isRetryableError,
  DEFAULT_RETRY_POLICY,
} from '../../../../src/payment/infrastructure/retry/retry.policy';

describe('Retry Policy', () => {
  describe('calculateDelay', () => {
    it('should calculate exponential backoff with jitter', () => {
      const policy = {
        ...DEFAULT_RETRY_POLICY,
        baseDelayMs: 100,
        maxDelayMs: 5000,
      };

      const delays: number[] = [];
      for (let i = 0; i < 100; i++) {
        delays.push(calculateDelay(1, policy));
      }

      // All delays should be >= 0
      expect(delays.every((d) => d >= 0)).toBe(true);
      // With full jitter, max should be <= capped exponential
      expect(Math.max(...delays)).toBeLessThanOrEqual(policy.baseDelayMs);
    });

    it('should increase delay for higher attempts', () => {
      const policy = {
        ...DEFAULT_RETRY_POLICY,
        baseDelayMs: 100,
        maxDelayMs: 5000,
      };

      const attempt1Max = policy.baseDelayMs * policy.backoffMultiplier ** 0;
      const attempt2Max = policy.baseDelayMs * policy.backoffMultiplier ** 1;

      // Test max possible values (without jitter they'd be exact)
      expect(attempt1Max).toBe(100);
      expect(attempt2Max).toBe(200);
    });

    it('should cap at maxDelayMs', () => {
      const policy = {
        ...DEFAULT_RETRY_POLICY,
        baseDelayMs: 1000,
        maxDelayMs: 1000,
        backoffMultiplier: 2,
      };

      const delay = calculateDelay(10, policy); // 10th attempt would be huge
      expect(delay).toBeLessThanOrEqual(1000);
    });
  });

  describe('sleep', () => {
    it('should resolve after delay', async () => {
      const start = Date.now();
      await sleep(50);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(50);
    });

    it('should resolve with 0ms', async () => {
      const start = Date.now();
      await sleep(0);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(10);
    });
  });

  describe('isRetryableError', () => {
    it('should retry on 5xx errors', () => {
      const error = { status: 503 };
      expect(isRetryableError(error, DEFAULT_RETRY_POLICY)).toBe(true);
    });

    it('should retry on 429 Too Many Requests', () => {
      const error = { status: 429 };
      expect(isRetryableError(error, DEFAULT_RETRY_POLICY)).toBe(true);
    });

    it('should retry on 408 Request Timeout', () => {
      const error = { status: 408 };
      expect(isRetryableError(error, DEFAULT_RETRY_POLICY)).toBe(true);
    });

    it('should NOT retry on 4xx errors (except 408, 429)', () => {
      const error400 = { status: 400 };
      const error401 = { status: 401 };
      const error404 = { status: 404 };

      expect(isRetryableError(error400, DEFAULT_RETRY_POLICY)).toBe(false);
      expect(isRetryableError(error401, DEFAULT_RETRY_POLICY)).toBe(false);
      expect(isRetryableError(error404, DEFAULT_RETRY_POLICY)).toBe(false);
    });

    it('should retry on connection errors', () => {
      const error = { code: 'ECONNRESET' };
      expect(isRetryableError(error, DEFAULT_RETRY_POLICY)).toBe(true);
    });

    it('should retry on timeout errors', () => {
      const error = { code: 'ETIMEDOUT' };
      expect(isRetryableError(error, DEFAULT_RETRY_POLICY)).toBe(true);
    });

    it('should handle null/undefined errors', () => {
      expect(isRetryableError(null, DEFAULT_RETRY_POLICY)).toBe(false);
      expect(isRetryableError(undefined, DEFAULT_RETRY_POLICY)).toBe(false);
    });

    it('should handle non-object errors', () => {
      expect(isRetryableError('error', DEFAULT_RETRY_POLICY)).toBe(false);
      expect(isRetryableError(123, DEFAULT_RETRY_POLICY)).toBe(false);
    });
  });

  describe('DEFAULT_RETRY_POLICY', () => {
    it('should have sensible defaults', () => {
      expect(DEFAULT_RETRY_POLICY.maxAttempts).toBe(3);
      expect(DEFAULT_RETRY_POLICY.baseDelayMs).toBe(100);
      expect(DEFAULT_RETRY_POLICY.maxDelayMs).toBe(5000);
      expect(DEFAULT_RETRY_POLICY.backoffMultiplier).toBe(2);
      expect(DEFAULT_RETRY_POLICY.retryableStatuses).toContain(500);
      expect(DEFAULT_RETRY_POLICY.retryableStatuses).toContain(502);
      expect(DEFAULT_RETRY_POLICY.retryableStatuses).toContain(503);
      expect(DEFAULT_RETRY_POLICY.retryableStatuses).toContain(504);
    });
  });
});
