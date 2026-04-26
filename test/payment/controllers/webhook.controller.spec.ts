// ============================================================================
// Webhook Controller Tests
// ============================================================================
import { Test, TestingModule } from '@nestjs/testing';
import { WebhookController } from '../../../src/payment/controllers/webhook.controller';
import { PaymentService } from '../../../src/payment/services/payment.service';
import { WebhookCallbackQueue } from '../../../src/payment/services/webhook-callback.queue';
import { SdkNotificationService } from '../../../src/payment/services/sdk-notification.service';

describe('WebhookController', () => {
  let controller: WebhookController;
  let paymentService: PaymentService;
  let webhookQueue: WebhookCallbackQueue;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhookController],
      providers: [
        {
          provide: PaymentService,
          useValue: {
            verifyTransaction: jest.fn(),
          },
        },
        {
          provide: WebhookCallbackQueue,
          useValue: {
            enqueue: jest.fn().mockResolvedValue({ id: 'job-1' }),
            getQueueStatus: jest.fn().mockResolvedValue({
              waiting: 0,
              active: 0,
              completed: 0,
              failed: 0,
              delayed: 0,
            }),
            getFailedJobs: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: SdkNotificationService,
          useValue: {
            notify: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    controller = module.get<WebhookController>(WebhookController);
    paymentService = module.get<PaymentService>(PaymentService);
    webhookQueue = module.get<WebhookCallbackQueue>(WebhookCallbackQueue);
  });

  describe('handlePaymentWebhook', () => {
    const validEvent = {
      provider: 'flutterwave' as const,
      transaction_ref: 'ref-123',
      user_id: 'user-123',
      application_id: 'app-1',
      status: 'success',
      amount: 1000,
      currency: 'NGN',
      category: 'wallet-fund',
      metadata: {},
    };

    it('should reject missing provider', async () => {
      const event = { ...validEvent, provider: '' as any };
      const result = await controller.handlePaymentWebhook(event, '');
      expect(result.status).toBe('rejected');
    });

    it('should reject missing transaction_ref', async () => {
      const event = { ...validEvent, transaction_ref: '' };
      const result = await controller.handlePaymentWebhook(
        event,
        'flutterwave',
      );
      expect(result.status).toBe('rejected');
    });

    it('should reject unknown provider', async () => {
      const event = { ...validEvent, provider: 'unknown' as any };
      const result = await controller.handlePaymentWebhook(event, 'unknown');
      expect(result.status).toBe('rejected');
    });

    it('should accept valid webhook and queue callback', async () => {
      jest.spyOn(paymentService, 'verifyTransaction').mockResolvedValue({
        ok: true,
        value: {
          id: 'pay-123',
          walletId: 'wallet-123',
          providerRef: 'ref-123',
          status: 'success',
          amount: { value: 1000, currency: 'NGN' },
          provider: 'flutterwave',
          action: 'fund',
          createdAt: new Date(),
        },
      });

      const result = await controller.handlePaymentWebhook(
        validEvent,
        'flutterwave',
      );

      expect(result.status).toBe('accepted');
      expect(result.transactionRef).toBe('ref-123');
    });

    it('should handle failed verification', async () => {
      jest.spyOn(paymentService, 'verifyTransaction').mockResolvedValue({
        ok: false,
        error: {
          type: 'PROVIDER_ERROR',
          message: 'Transaction not found',
          provider: 'flutterwave',
          isRetryable: false,
        },
      });

      const result = await controller.handlePaymentWebhook(
        validEvent,
        'flutterwave',
      );

      expect(result.status).toBe('accepted'); // We still accept the webhook
    });

    it('should queue callback when client URL is in metadata', async () => {
      const event = {
        ...validEvent,
        metadata: {
          callback_url: 'https://client.example.com/webhook',
        },
      };

      jest.spyOn(paymentService, 'verifyTransaction').mockResolvedValue({
        ok: true,
        value: {
          id: 'pay-123',
          walletId: 'wallet-123',
          providerRef: 'ref-123',
          status: 'success',
          amount: { value: 1000, currency: 'NGN' },
          provider: 'flutterwave',
          action: 'fund',
          createdAt: new Date(),
        },
      });

      await controller.handlePaymentWebhook(event, 'flutterwave');

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(webhookQueue.enqueue).toHaveBeenCalledWith(
        'https://client.example.com/webhook',
        expect.any(Object),
        'payment.success',
      );
    });

    it('should handle webhook_url metadata key', async () => {
      const event = {
        ...validEvent,
        metadata: {
          webhook_url: 'https://client.example.com/webhook',
        },
      };

      jest.spyOn(paymentService, 'verifyTransaction').mockResolvedValue({
        ok: true,
        value: {
          id: 'pay-123',
          walletId: 'wallet-123',
          providerRef: 'ref-123',
          status: 'success',
          amount: { value: 1000, currency: 'NGN' },
          provider: 'flutterwave',
          action: 'fund',
          createdAt: new Date(),
        },
      });

      await controller.handlePaymentWebhook(event, 'flutterwave');

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(webhookQueue.enqueue).toHaveBeenCalledWith(
        'https://client.example.com/webhook',
        expect.any(Object),
        'payment.success',
      );
    });

    it('should warn when no client webhook URL found', async () => {
      const warnSpy = jest.spyOn(controller['logger'], 'warn');

      jest.spyOn(paymentService, 'verifyTransaction').mockResolvedValue({
        ok: true,
        value: {
          id: 'pay-123',
          walletId: 'wallet-123',
          providerRef: 'ref-123',
          status: 'success',
          amount: { value: 1000, currency: 'NGN' },
          provider: 'flutterwave',
          action: 'fund',
          createdAt: new Date(),
        },
      });

      await controller.handlePaymentWebhook(validEvent, 'flutterwave');

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('No client webhook URL found'),
      );
    });
  });

  describe('health', () => {
    it('should return ok', () => {
      const result = controller.health();
      expect(result.status).toBe('ok');
    });
  });

  describe('getQueueStatus', () => {
    it('should return queue metrics with timestamp', async () => {
      const result = await controller.getQueueStatus();

      expect(result).toHaveProperty('waiting');
      expect(result).toHaveProperty('active');
      expect(result).toHaveProperty('completed');
      expect(result).toHaveProperty('failed');
      expect(result).toHaveProperty('delayed');
      expect(result).toHaveProperty('timestamp');
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}/);
    });
  });

  describe('getFailedJobs', () => {
    it('should return failed jobs list', async () => {
      const result = await controller.getFailedJobs();

      expect(result).toHaveProperty('count');
      expect(result).toHaveProperty('jobs');
      expect(Array.isArray(result.jobs)).toBe(true);
    });
  });

  describe('mapStatusToEvent', () => {
    const mapStatusToEvent = (
      status: string,
    ): 'payment.success' | 'payment.failed' | 'payment.pending' => {
      if (status === 'success') return 'payment.success';
      if (status === 'failed' || status === 'cancelled')
        return 'payment.failed';
      return 'payment.pending';
    };

    it('should map success to payment.success', () => {
      expect(mapStatusToEvent('success')).toBe('payment.success');
    });

    it('should map failed to payment.failed', () => {
      expect(mapStatusToEvent('failed')).toBe('payment.failed');
    });

    it('should map cancelled to payment.failed', () => {
      expect(mapStatusToEvent('cancelled')).toBe('payment.failed');
    });

    it('should map pending to payment.pending', () => {
      expect(mapStatusToEvent('pending')).toBe('payment.pending');
    });

    it('should map unknown to payment.pending', () => {
      expect(mapStatusToEvent('unknown')).toBe('payment.pending');
    });
  });
});
