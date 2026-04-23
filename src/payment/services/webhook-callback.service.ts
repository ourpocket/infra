// ============================================================================
// Webhook Callback Service
// ============================================================================
// Calls the client's registered webhook URL after payment processing

import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { Payment } from '../core/types/payment.types';
import { createHmac } from 'crypto';
import { ProviderId } from '../core/types/payment.types';

export interface ClientWebhookPayload {
  event: 'payment.success' | 'payment.failed' | 'payment.pending';
  provider: ProviderId;
  transactionRef: string;
  status: string;
  amount: number;
  currency: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

@Injectable()
export class WebhookCallbackService {
  private readonly logger = new Logger(WebhookCallbackService.name);

  async sendClientWebhook(
    clientWebhookUrl: string,
    payment: Payment,
    event: 'payment.success' | 'payment.failed' | 'payment.pending',
  ): Promise<boolean> {
    const payload: ClientWebhookPayload = {
      event,
      provider: payment.provider,
      transactionRef: payment.providerRef,
      status: payment.status,
      amount: payment.amount.value,
      currency: payment.amount.currency,
      metadata: (payment as any).metadata || {},
      timestamp: new Date().toISOString(),
    };

    try {
      this.logger.log(`Sending webhook to client: ${clientWebhookUrl}`);

      const response = await axios.post(clientWebhookUrl, payload, {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'X-OurPocket-Event': event,
          'X-OurPocket-Signature': this.generateSignature(payload),
        },
      });

      if (response.status >= 200 && response.status < 300) {
        this.logger.log(`Client webhook delivered successfully`);
        return true;
      }

      this.logger.warn(`Client webhook returned status ${response.status}`);
      return false;
    } catch (error) {
      const axiosError = error as AxiosError;
      this.logger.error(`Failed to send client webhook: ${axiosError.message}`);
      return false;
    }
  }

  private generateSignature(payload: ClientWebhookPayload): string {
    // HMAC signature for client to verify authenticity
    // In production, use a proper secret key

    const secret = process.env.WEBHOOK_SIGNING_SECRET || 'default-secret';
    const data = JSON.stringify(payload);
    return createHmac('sha256', secret).update(data).digest('hex');
  }
}
