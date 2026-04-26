import { Test } from '@nestjs/testing';
import { PaymentModule } from '../../../src/payment/payment.module';
import {
  PaymentService,
  ProviderFactory,
} from '../../../src/payment/services/payment.service';
import { buildAmount } from '../../../src/payment/infrastructure/mapper/request-mapper';
import * as nock from 'nock';

describe('Payment Integration Tests', () => {
  let service: PaymentService;
  let factory: ProviderFactory;
  const FLW_BASE = 'https://api.flutterwave.com';

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PaymentModule],
    }).compile();

    service = moduleRef.get<PaymentService>(PaymentService);
    factory = moduleRef.get<ProviderFactory>(ProviderFactory);
  });

  afterEach(() => {
    nock.cleanAll();
  });

  const mockCreds = {
    apiKey: 'FLW_TEST_KEY',
    secretKey: 'FLW_TEST_SECRET',
    baseUrl: `${FLW_BASE}/v3`,
  };

  describe('Flutterwave Integration', () => {
    const FLW_BASE = 'https://api.flutterwave.com';

    it('should create virtual account successfully', async () => {
      nock(FLW_BASE)
        .post('/v3/virtual-account-numbers')
        .reply(200, {
          status: 'success',
          message: 'Virtual account created',
          data: {
            account_number: '0001234567',
            bank_code: '044',
            bank_name: 'Access Bank',
            order_ref: 'VA_12345',
            account_status: 'active',
            currency: 'NGN',
            amount: '0',
            created_at: '2026-04-22T10:00:00Z',
            expiry_date: '2027-04-22T10:00:00Z',
          },
        });

      const result = await service.createWallet('flutterwave', mockCreds, {
        userId: 'user_123',
        currency: 'NGN',
        email: 'test@example.com',
        phone: '+2348012345678',
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.provider).toBe('flutterwave');
        expect(result.value.providerRef).toBe('VA_12345');
        expect(result.value.metadata?.accountNumber).toBe('0001234567');
      }
    });

    it('should handle FLW API errors', async () => {
      nock(FLW_BASE).post('/v3/virtual-account-numbers').reply(400, {
        status: 'error',
        message: 'Invalid email address',
      });

      const result = await service.createWallet('flutterwave', mockCreds, {
        userId: 'user_123',
        currency: 'NGN',
        email: 'invalid',
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('PROVIDER_ERROR');
        expect(result.error.message).toContain('Invalid');
      }
    });

    it('should handle network timeouts', async () => {
      nock(FLW_BASE)
        .post('/v3/virtual-account-numbers')
        .delayConnection(35000) // Longer than timeout
        .reply(200, {});

      const result = await service.createWallet('flutterwave', mockCreds, {
        userId: 'user_123',
        currency: 'NGN',
        email: 'test@example.com',
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('NETWORK_ERROR');
      }
    });

    it('should fund wallet successfully', async () => {
      nock(FLW_BASE)
        .post('/v3/charges')
        .query({ type: 'card' })
        .reply(200, {
          status: 'success',
          message: 'Charge initiated',
          data: {
            id: 12345,
            tx_ref: 'flw_fund_abc',
            flw_ref: 'FLW_ABC123',
            amount: 5000,
            currency: 'NGN',
            charged_amount: 5075,
            status: 'successful',
            payment_type: 'card',
            created_at: '2026-04-22T10:00:00Z',
            customer: {
              id: 1,
              name: 'John Doe',
              email: 'test@example.com',
              phone_number: null,
            },
          },
        });

      const result = await service.fundWallet('flutterwave', mockCreds, {
        walletId: 'wallet_123',
        amount: buildAmount(5000, 'NGN'),
        source: 'card',
        sourceDetails: {
          email: 'test@example.com',
          cardNumber: '4111111111111111',
          cvv: '123',
          expiryMonth: '12',
          expiryYear: '2025',
        },
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status).toBe('success');
        expect(result.value.providerRef).toBe('FLW_ABC123');
      }
    });

    it('should withdraw successfully', async () => {
      nock(FLW_BASE)
        .post('/v3/transfers')
        .reply(200, {
          status: 'success',
          message: 'Transfer successful',
          data: {
            id: 12345,
            account_number: '0001234567',
            bank_code: '044',
            amount: 10000,
            currency: 'NGN',
            reference: 'FLW_WITHDRAW_123',
            status: 'SUCCESSFUL',
            narration: 'Withdrawal',
            created_at: '2026-04-22T10:00:00Z',
          },
        });

      const result = await service.withdraw('flutterwave', mockCreds, {
        walletId: 'wallet_123',
        amount: buildAmount(10000, 'NGN'),
        destination: 'bank',
        destinationDetails: {
          bankCode: '044',
          accountNumber: '0001234567',
        },
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status).toBe('success');
        expect(result.value.action).toBe('withdraw');
      }
    });

    it('should verify transaction successfully', async () => {
      nock(FLW_BASE)
        .get('/v3/transactions/12345/verify')
        .reply(200, {
          status: 'success',
          message: 'Transaction found',
          data: {
            id: 12345,
            tx_ref: 'flw_fund_abc',
            flw_ref: 'FLW_ABC123',
            amount: 5000,
            currency: 'NGN',
            charged_amount: 5075,
            status: 'successful',
            payment_type: 'card',
            created_at: '2026-04-22T10:00:00Z',
            customer: {
              name: 'John Doe',
              email: 'test@example.com',
            },
          },
        });

      const result = await service.verifyTransaction(
        'flutterwave',
        mockCreds,
        '12345',
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status).toBe('success');
      }
    });

    it('should get balance successfully', async () => {
      nock(FLW_BASE)
        .get('/v3/balances')
        .reply(200, {
          status: 'success',
          message: 'Balances retrieved',
          data: [
            {
              currency: 'NGN',
              available_balance: 100000,
              ledger_balance: 105000,
            },
            { currency: 'USD', available_balance: 500, ledger_balance: 500 },
          ],
        });

      const result = await service.getBalance(
        'flutterwave',
        mockCreds,
        'wallet_123',
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.available.value).toBe(100000);
        expect(result.value.available.currency).toBe('NGN');
      }
    });

    it('should handle 5xx errors with retry', async () => {
      nock(FLW_BASE)
        .post('/v3/virtual-account-numbers')
        .reply(503)
        .post('/v3/virtual-account-numbers')
        .reply(200, {
          status: 'success',
          message: 'Virtual account created',
          data: {
            account_number: '0001234567',
            bank_code: '044',
            bank_name: 'Access Bank',
            order_ref: 'VA_RETRY',
            account_status: 'active',
            currency: 'NGN',
            amount: '0',
            created_at: '2026-04-22T10:00:00Z',
            expiry_date: '2027-04-22T10:00:00Z',
          },
        });

      const result = await service.createWallet('flutterwave', mockCreds, {
        userId: 'user_123',
        currency: 'NGN',
        email: 'test@example.com',
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.providerRef).toBe('VA_RETRY');
      }
    });
  });

  describe('Provider Factory', () => {
    it('should register and retrieve providers', () => {
      expect(factory.has('flutterwave')).toBe(true);
      expect(factory.has('unknown')).toBe(false);
    });

    it('should list available providers', () => {
      const providers = service.getAvailableProviders();
      expect(providers).toContain('flutterwave');
    });
  });
});
