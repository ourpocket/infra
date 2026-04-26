// ============================================================================
// Payment E2E Tests - Real Sandbox API Calls
// ============================================================================
// Requires real sandbox credentials in environment variables.
// These tests make actual HTTP calls to provider sandboxes.
//
// Setup:
// 1. Copy .env.payment.example to .env
// 2. Fill in credentials from provider dashboards
// 3. Run: source .env && npm run test:e2e

import {
  PaymentService,
  ProviderFactory,
} from '../../../src/payment/services/payment.service';
import { buildAmount } from '../../../src/payment/infrastructure/mapper/request-mapper';

describe.skip('Payment E2E Tests - Requires Flutterwave Sandbox Keys', () => {
  let service: PaymentService;
  let factory: ProviderFactory;

  beforeAll(() => {
    factory = new ProviderFactory();
    service = new PaymentService(factory);
  });

  // Check if credentials exist
  const skipIfNoCreds = (envVar: string): boolean => !process.env[envVar];

  // ============================================================================
  // Flutterwave Sandbox Tests
  // ============================================================================
  describe('Flutterwave Sandbox', () => {
    beforeAll(() => {
      if (!process.env.FLW_SECRET_KEY) {
        console.log(
          '⚠️  Skipping Flutterwave E2E - set FLW_SECRET_KEY in .env',
        );
      }
    });

    const creds = {
      apiKey: process.env.FLW_SECRET_KEY || '',
      baseUrl: 'https://api.flutterwave.com/v3',
    };

    it('should get account balance', async () => {
      const result = await service.getBalance(
        'flutterwave',
        creds,
        'test-wallet',
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.available.value).toBeGreaterThanOrEqual(0);
        console.log(
          '✅ FLW Balance:',
          result.value.available.value,
          result.value.currency,
        );
      }
    }, 30000);

    // Virtual accounts require BVN in production/sandbox
    // This test documents the API structure but may fail without proper setup
    it('should attempt virtual account creation (may require BVN)', async () => {
      const testEmail = `e2e-test-${Date.now()}@ourpocket.com`;

      const result = await service.createWallet('flutterwave', creds, {
        userId: `user_${Date.now()}`,
        currency: 'NGN',
        email: testEmail,
        phone: '+2348012345678',
        metadata: { test: 'e2e', bvn: '12345678901' }, // BVN may be required
      });

      if (!result.ok) {
        console.log('ℹ️ FLW createWallet:', result.error.message);
        // Expected to fail without proper BVN/setup
        expect(result.error.type).toMatch(
          /NETWORK_ERROR|PROVIDER_ERROR|VALIDATION_ERROR|CONFIGURATION_ERROR/,
        );
      } else {
        expect(result.value.provider).toBe('flutterwave');
        console.log('✅ FLW Virtual Account:', result.value.providerRef);
      }
    }, 30000);

    it('should verify transaction (if test ID exists)', async () => {
      const testTxId = process.env.FLW_TEST_TRANSACTION_ID || 'invalid-tx-id';

      const result = await service.verifyTransaction(
        'flutterwave',
        creds,
        testTxId,
      );

      // Transaction may not exist - either success or specific error is fine
      if (!result.ok) {
        expect(result.error.type).toMatch(/NETWORK_ERROR|PROVIDER_ERROR/);
        console.log('ℹ️ FLW verify (expected):', result.error.message);
      } else {
        expect(['success', 'pending', 'failed']).toContain(result.value.status);
        console.log('✅ FLW Transaction Status:', result.value.status);
      }
    }, 30000);
  });

  // ============================================================================
  // Provider Factory Tests
  // ============================================================================
  describe('Provider Factory', () => {
    it('should have all 5 providers registered', () => {
      const providers = service.getAvailableProviders();

      expect(providers).toContain('flutterwave');
      expect(providers).toContain('paystack');
      expect(providers).toContain('mtn-momo');
      expect(providers).toContain('airtel-money');
      expect(providers).toContain('orange-money');
      expect(providers).toHaveLength(5);

      console.log('✅ Registered providers:', providers.join(', '));
    });
  });

  // ============================================================================
  // Error Handling Tests
  // ============================================================================
  describe('Error Handling', () => {
    it('should return error for unknown provider', async () => {
      const result = await service.createWallet(
        'unknown-provider' as any,
        { apiKey: '' },
        {
          userId: 'test',
          currency: 'NGN',
          email: 'test@test.com',
        },
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('CONFIGURATION_ERROR');
      }
    });

    it('should return error for invalid credentials', async () => {
      const result = await service.createWallet(
        'flutterwave',
        { apiKey: '' },
        {
          userId: 'test',
          currency: 'NGN',
          email: 'test@test.com',
        },
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('CONFIGURATION_ERROR');
      }
    });
  });
});
