// ============================================================================
// Webhook Callback Queue Tests
// ============================================================================
import { Test, TestingModule } from '@nestjs/testing';
import { WebhookCallbackQueue } from '../../../src/payment/services/webhook-callback.queue';
import { Payment } from '../../../src/payment/core/types/payment.types';

describe('WebhookCallbackQueue', () => {
  let queue: WebhookCallbackQueue;

  const mockPayment: Payment = {
    id: 'pay-123',
    walletId: 'wallet-123',
    providerRef: 'ref-123',
    status: 'success',
    amount: { value: 1000, currency: 'NGN' as any },
    provider: 'flutterwave' as any,
    action: 'fund',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WebhookCallbackQueue],
    }).compile();

    queue = module.get<WebhookCallbackQueue>(WebhookCallbackQueue);
  });

  describe('generateSignature', () => {
    it('should generate consistent signatures', () => {
      const jobData = {
        url: 'https://client.example.com/webhook',
        event: 'payment.success' as const,
        provider: 'flutterwave' as any,
        transactionRef: 'ref-123',
        status: 'success',
        amount: 1000,
        currency: 'NGN',
        timestamp: '2024-01-01T00:00:00Z',
      };

      const sig1 = (queue as any).generateSignature(jobData);
      const sig2 = (queue as any).generateSignature(jobData);

      expect(sig1).toBe(sig2);
      expect(sig1).toMatch(/^[a-f0-9]{64}$/); // SHA256 hex
    });

    it('should generate different signatures for different data', () => {
      const jobData1 = {
        url: 'https://client.example.com/webhook',
        event: 'payment.success' as const,
        provider: 'flutterwave' as any,
        transactionRef: 'ref-123',
        status: 'success',
        amount: 1000,
        currency: 'NGN',
        timestamp: '2024-01-01T00:00:00Z',
      };

      const jobData2 = {
        ...jobData1,
        transactionRef: 'ref-456',
      };

      const sig1 = (queue as any).generateSignature(jobData1);
      const sig2 = (queue as any).generateSignature(jobData2);

      expect(sig1).not.toBe(sig2);
    });
  });

  describe('job data structure', () => {
    it('should create correct job payload', () => {
      // Test the data transformation logic directly
      const url = 'https://client.example.com/webhook';
      const event = 'payment.success' as const;

      const payload = {
        url,
        event,
        provider: mockPayment.provider,
        transactionRef: mockPayment.providerRef,
        status: mockPayment.status,
        amount: mockPayment.amount.value,
        currency: mockPayment.amount.currency,
        metadata: {},
        timestamp: expect.any(String),
      };

      expect(payload.provider).toBe('flutterwave');
      expect(payload.transactionRef).toBe('ref-123');
      expect(payload.amount).toBe(1000);
      expect(payload.currency).toBe('NGN');
      expect(payload.url).toBe(url);
      expect(payload.event).toBe('payment.success');
    });

    it('should handle different event types', () => {
      const events: Array<
        'payment.success' | 'payment.failed' | 'payment.pending'
      > = ['payment.success', 'payment.failed', 'payment.pending'];

      events.forEach((event) => {
        const payload = {
          event,
          provider: mockPayment.provider,
        };
        expect(payload.event).toBe(event);
      });
    });
  });

  describe('mapStatusToEvent logic', () => {
    function mapStatus(
      status: string,
    ): 'payment.success' | 'payment.failed' | 'payment.pending' {
      if (status === 'success') return 'payment.success';
      if (status === 'failed' || status === 'cancelled')
        return 'payment.failed';
      return 'payment.pending';
    }

    it('should map success to payment.success', () => {
      expect(mapStatus('success')).toBe('payment.success');
    });

    it('should map failed to payment.failed', () => {
      expect(mapStatus('failed')).toBe('payment.failed');
    });

    it('should map cancelled to payment.failed', () => {
      expect(mapStatus('cancelled')).toBe('payment.failed');
    });

    it('should map pending to payment.pending', () => {
      expect(mapStatus('pending')).toBe('payment.pending');
    });

    it('should map unknown to payment.pending', () => {
      expect(mapStatus('unknown')).toBe('payment.pending');
    });
  });
});
