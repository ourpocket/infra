// ============================================================================
// Webhook Controller
// ============================================================================
// Endpoint for receiving webhook events from the Rust webhook service.
// Processes payment webhooks and queues client callbacks for fault tolerance.

import {
  Controller,
  Post,
  Body,
  Headers,
  Logger,
  HttpCode,
  HttpStatus,
  Get,
} from '@nestjs/common';
import { PaymentService } from '../services/payment.service';
import { WebhookCallbackQueue } from '../services/webhook-callback.queue';
import { SdkNotificationService } from '../services/sdk-notification.service';
import { ProviderCredentials } from '../core/types/payment.types';
import {
  WebhookEventDto,
  WebhookAcceptedResponse,
  WebhookRejectedResponse,
  WebhookQueueStatusResponse,
  FailedJobsResponse,
} from './webhook.dto';

@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly paymentService: PaymentService,
    private readonly webhookCallbackQueue: WebhookCallbackQueue,
    private readonly sdkNotificationService: SdkNotificationService,
  ) {}

  /**
   * Main webhook endpoint - receives normalized events from Rust webhook service
   */
  @Post('payment')
  @HttpCode(HttpStatus.OK)
  async handlePaymentWebhook(
    @Body() event: WebhookEventDto,
    @Headers('x-provider') provider: string,
  ): Promise<WebhookAcceptedResponse | WebhookRejectedResponse> {
    this.logger.log(
      `Received webhook from ${provider} for ref: ${event.transaction_ref}`,
    );

    // Validate required fields
    if (!event.provider || !event.transaction_ref) {
      this.logger.error('Invalid webhook payload: missing required fields');
      return { status: 'rejected', transactionRef: event.transaction_ref };
    }

    // Get provider credentials from environment/config
    const creds = this.getProviderCredentials(event.provider);
    if (!creds) {
      this.logger.error(
        `No credentials configured for provider: ${event.provider}`,
      );
      return { status: 'rejected', transactionRef: event.transaction_ref };
    }

    // Verify the transaction with provider API
    const result = await this.paymentService.verifyTransaction(
      event.provider,
      creds,
      event.transaction_ref,
    );

    if (result.ok) {
      this.logger.log(
        `Transaction ${event.transaction_ref} verified: ${result.value.status}`,
      );

      // Determine event type based on payment status
      const eventType = this.mapStatusToEvent(result.value.status);

      // 1. Queue webhook to client's registered API URL
      const clientWebhookUrl = this.getClientWebhookUrl(event);
      if (clientWebhookUrl) {
        await this.webhookCallbackQueue.enqueue(
          clientWebhookUrl,
          result.value,
          eventType,
        );
        this.logger.log(
          `Webhook queued for ${event.transaction_ref} to ${clientWebhookUrl}`,
        );
      } else {
        this.logger.warn(
          `No client webhook URL found for ${event.transaction_ref}`,
        );
      }

      // 2. Notify SDK clients (WebSocket/push)
      await this.sdkNotificationService.notify(result.value, eventType);

      // TODO: Update ledger, notify wallet, etc.
    } else {
      this.logger.warn(
        `Failed to verify transaction ${event.transaction_ref}: ${result.error.message}`,
      );
    }

    return { status: 'accepted', transactionRef: event.transaction_ref };
  }

  /**
   * Health check endpoint
   */
  @Post('health')
  @HttpCode(HttpStatus.OK)
  health(): { status: 'ok' } {
    return { status: 'ok' };
  }

  /**
   * Get queue statistics
   */
  @Get('status')
  async getQueueStatus(): Promise<WebhookQueueStatusResponse> {
    const status = await this.webhookCallbackQueue.getQueueStatus();
    return {
      ...status,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get failed jobs for inspection
   */
  @Get('failed')
  async getFailedJobs(): Promise<FailedJobsResponse> {
    const failed = await this.webhookCallbackQueue.getFailedJobs();
    return {
      count: failed.length,
      jobs: failed.map((job) => ({
        id: String(job.id),
        ref: job.data.transactionRef,
        url: job.data.url,
        attempts: job.attemptsMade,
        failedReason: job.failedReason,
      })),
    };
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private mapStatusToEvent(
    status: string,
  ): 'payment.success' | 'payment.failed' | 'payment.pending' {
    switch (status) {
      case 'success':
        return 'payment.success';
      case 'failed':
      case 'cancelled':
        return 'payment.failed';
      default:
        return 'payment.pending';
    }
  }

  private getClientWebhookUrl(event: WebhookEventDto): string | undefined {
    // In production, look up from database by application_id
    const metadata = event.metadata || {};
    return (
      (metadata.callback_url as string) ||
      (metadata.webhook_url as string) ||
      process.env.DEFAULT_CLIENT_WEBHOOK_URL
    );
  }

  private getProviderCredentials(provider: string): ProviderCredentials | null {
    switch (provider) {
      case 'flutterwave':
        return {
          apiKey: process.env.FLUTTERWAVE_SECRET_KEY || '',
          publicKey: process.env.FLUTTERWAVE_PUBLIC_KEY,
          webhookSecret: process.env.FLUTTERWAVE_WEBHOOK_SECRET,
        };
      case 'paystack':
        return {
          apiKey: process.env.PAYSTACK_SECRET_KEY || '',
          publicKey: process.env.PAYSTACK_PUBLIC_KEY,
          webhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET,
        };
      case 'mtn-momo':
        return {
          apiKey: process.env.MTN_PRIMARY_KEY || '',
          secretKey: process.env.MTN_SECONDARY_KEY,
        };
      case 'airtel-money':
        return {
          apiKey: process.env.AIRTEL_CLIENT_ID || '',
          secretKey: process.env.AIRTEL_CLIENT_SECRET,
        };
      case 'orange-money':
        return {
          apiKey: process.env.ORANGE_API_KEY || '',
          secretKey: process.env.ORANGE_MERCHANT_CODE,
        };
      default:
        return null;
    }
  }
}
