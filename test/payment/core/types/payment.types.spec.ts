import {
  buildAmount,
  parseAmount,
  generateRef,
} from '../../../../src/payment/infrastructure/mapper/request-mapper';
import { Errors } from '../../../../src/payment/core/errors/payment.error';

describe('Payment Domain Types', () => {
  describe('Amount Value Object', () => {
    it('should build amount from value and currency', () => {
      const amount = buildAmount(5000, 'NGN');

      expect(amount).toEqual({
        value: 5000,
        currency: 'NGN',
      });
    });

    it('should parse amount from string with divisor', () => {
      const amount = parseAmount('500000', 'NGN', 100);

      expect(amount.value).toBe(5000);
      expect(amount.currency).toBe('NGN');
    });

    it('should parse amount from number with divisor', () => {
      const amount = parseAmount(500000, 'USD', 100);

      expect(amount.value).toBe(5000);
      expect(amount.currency).toBe('USD');
    });

    it('should use divisor of 100 by default', () => {
      const amount = parseAmount('10000', 'GHS');

      expect(amount.value).toBe(100);
    });
  });

  describe('Reference Generator', () => {
    it('should generate unique references with prefix', () => {
      const ref1 = generateRef('test');
      const ref2 = generateRef('test');

      expect(ref1).toMatch(/^test_\d+_[a-z0-9]+$/);
      expect(ref2).toMatch(/^test_\d+_[a-z0-9]+$/);
      expect(ref1).not.toBe(ref2);
    });

    it('should include timestamp in reference', () => {
      const before = Date.now();
      const ref = generateRef('pref');
      const after = Date.now();

      const timestamp = parseInt(ref.split('_')[1], 10);
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('Error Factories', () => {
    it('should create network error', () => {
      const error = Errors.network('Connection refused', 'flutterwave', true);

      expect(error).toEqual({
        type: 'NETWORK_ERROR',
        message: 'Connection refused',
        provider: 'flutterwave',
        isRetryable: true,
      });
    });

    it('should create provider error with code', () => {
      const error = Errors.provider(
        'Invalid key',
        'paystack',
        'AUTH_001',
        false,
      );

      expect(error).toEqual({
        type: 'PROVIDER_ERROR',
        message: 'Invalid key',
        provider: 'paystack',
        providerCode: 'AUTH_001',
        isRetryable: false,
      });
    });

    it('should create validation error', () => {
      const error = Errors.validation('Invalid email', 'email');

      expect(error).toEqual({
        type: 'VALIDATION_ERROR',
        message: 'Invalid email',
        field: 'email',
      });
    });

    it('should create insufficient funds error', () => {
      const requested = buildAmount(10000, 'NGN');
      const available = buildAmount(5000, 'NGN');

      const error = Errors.insufficientFunds(requested, available);

      expect(error.type).toBe('INSUFFICIENT_FUNDS');
      expect(error.requested).toEqual(requested);
      expect(error.available).toEqual(available);
      expect(error.message).toContain('10000');
      expect(error.message).toContain('5000');
    });

    it('should create duplicate error', () => {
      const error = Errors.duplicate('idempotency-key-123');

      expect(error).toEqual({
        type: 'DUPLICATE_ERROR',
        message: 'Duplicate request detected: idempotency-key-123',
        idempotencyKey: 'idempotency-key-123',
      });
    });

    it('should create configuration error', () => {
      const error = Errors.configuration('Missing API key', 'flutterwave');

      expect(error).toEqual({
        type: 'CONFIGURATION_ERROR',
        message: 'Missing API key',
        provider: 'flutterwave',
      });
    });

    it('should create circuit open error', () => {
      const retryAfter = new Date('2026-04-22T17:00:00Z');
      const error = Errors.circuitOpen('paystack', retryAfter);

      expect(error.type).toBe('CIRCUIT_OPEN');
      expect(error.provider).toBe('paystack');
      expect(error.retryAfter).toBe(retryAfter);
      expect(error.message).toContain('paystack');
      expect(error.message).toContain('2026-04-22');
    });
  });
});
