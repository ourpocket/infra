// ============================================================================
// Webhook DTO Type Tests
// ============================================================================
import {
  WebhookEventDto,
  WebhookAcceptedResponse,
  WebhookRejectedResponse,
  WebhookQueueStatusResponse,
  FailedJobItem,
} from '../../../src/payment/controllers/webhook.dto';

describe('Webhook DTOs', () => {
  describe('WebhookEventDto', () => {
    it('should accept valid event data', () => {
      const event: WebhookEventDto = {
        provider: 'flutterwave',
        transaction_ref: 'ref-123',
        user_id: 'user-123',
        application_id: 'app-1',
        status: 'success',
        amount: 1000,
        currency: 'NGN',
        category: 'wallet-fund',
        metadata: { callback_url: 'https://client.example.com/webhook' },
      };

      expect(event.provider).toBe('flutterwave');
      expect(event.transaction_ref).toBe('ref-123');
      expect(event.amount).toBe(1000);
      expect(event.currency).toBe('NGN');
    });

    it('should support all provider types', () => {
      const providers: WebhookEventDto['provider'][] = [
        'flutterwave',
        'paystack',
        'mtn-momo',
        'airtel-money',
        'orange-money',
      ];

      providers.forEach((provider) => {
        const event: WebhookEventDto = {
          provider,
          transaction_ref: 'ref-123',
          user_id: 'user-123',
          application_id: 'app-1',
          status: 'success',
          amount: 1000,
          currency: 'NGN',
          category: 'test',
          metadata: {},
        };

        expect(event.provider).toBe(provider);
      });
    });

    it('should allow empty metadata', () => {
      const event: WebhookEventDto = {
        provider: 'paystack',
        transaction_ref: 'ref-456',
        user_id: 'user-456',
        application_id: 'app-2',
        status: 'pending',
        amount: 500,
        currency: 'GHS',
        category: 'withdrawal',
        metadata: {},
      };

      expect(event.metadata).toEqual({});
    });
  });

  describe('WebhookAcceptedResponse', () => {
    it('should have correct shape', () => {
      const response: WebhookAcceptedResponse = {
        status: 'accepted',
        transactionRef: 'ref-123',
      };

      expect(response.status).toBe('accepted');
      expect(response.transactionRef).toBe('ref-123');
    });
  });

  describe('WebhookRejectedResponse', () => {
    it('should have correct shape', () => {
      const response: WebhookRejectedResponse = {
        status: 'rejected',
        transactionRef: 'ref-123',
      };

      expect(response.status).toBe('rejected');
      expect(response.transactionRef).toBe('ref-123');
    });
  });

  describe('WebhookQueueStatusResponse', () => {
    it('should have all queue metrics', () => {
      const status: WebhookQueueStatusResponse = {
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
        delayed: 1,
        timestamp: new Date().toISOString(),
      };

      expect(status.waiting).toBe(5);
      expect(status.active).toBe(2);
      expect(status.completed).toBe(100);
      expect(status.failed).toBe(3);
      expect(status.delayed).toBe(1);
      expect(status.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}/);
    });
  });

  describe('FailedJobItem', () => {
    it('should have correct shape', () => {
      const job: FailedJobItem = {
        id: 'job-1',
        ref: 'ref-123',
        url: 'https://client.example.com/webhook',
        attempts: 3,
        failedReason: 'Connection timeout',
      };

      expect(job.id).toBe('job-1');
      expect(job.ref).toBe('ref-123');
      expect(job.attempts).toBe(3);
      expect(job.failedReason).toBe('Connection timeout');
    });
  });
});
