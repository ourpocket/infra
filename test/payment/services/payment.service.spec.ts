import {
  PaymentService,
  ProviderFactory,
} from '../../../src/payment/services/payment.service';
import { Errors } from '../../../src/payment/core/errors/payment.error';
import { buildAmount } from '../../../src/payment/infrastructure/mapper/request-mapper';

describe('PaymentService', () => {
  let service: PaymentService;
  let factory: ProviderFactory;

  const mockCreds = {
    apiKey: 'test_key',
    secretKey: 'test_secret',
  };

  beforeEach(() => {
    factory = new ProviderFactory();
    service = new PaymentService(factory);
  });

  describe('Provider Registration', () => {
    it('should list available providers', () => {
      const providers = service.getAvailableProviders();
      expect(providers).toContain('flutterwave');
    });
  });

  describe('createWallet', () => {
    it('should return error for unknown provider', async () => {
      const result = await service.createWallet(
        'unknown-provider' as any,
        mockCreds,
        {
          userId: 'user_123',
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

  describe('fundWallet', () => {
    it('should return error for unknown provider', async () => {
      const result = await service.fundWallet(
        'unknown-provider' as any,
        mockCreds,
        {
          walletId: 'wallet_123',
          amount: buildAmount(5000, 'NGN'),
          source: 'card',
          sourceDetails: {},
        },
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('CONFIGURATION_ERROR');
      }
    });
  });

  describe('withdraw', () => {
    it('should return error for unknown provider', async () => {
      const result = await service.withdraw(
        'unknown-provider' as any,
        mockCreds,
        {
          walletId: 'wallet_123',
          amount: buildAmount(5000, 'NGN'),
          destination: 'bank',
          destinationDetails: {},
        },
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('CONFIGURATION_ERROR');
      }
    });
  });

  describe('getBalance', () => {
    it('should return error for unknown provider', async () => {
      const result = await service.getBalance(
        'unknown-provider' as any,
        mockCreds,
        'wallet_123',
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('CONFIGURATION_ERROR');
      }
    });
  });

  describe('verifyTransaction', () => {
    it('should return error for unknown provider', async () => {
      const result = await service.verifyTransaction(
        'unknown-provider' as any,
        mockCreds,
        'ref_123',
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('CONFIGURATION_ERROR');
      }
    });
  });

  describe('parseWebhook', () => {
    it('should return error for unknown provider', () => {
      const result = service.parseWebhook(
        'unknown-provider' as any,
        mockCreds,
        {},
        'sig',
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('CONFIGURATION_ERROR');
      }
    });
  });
});
