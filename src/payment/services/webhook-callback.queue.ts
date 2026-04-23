// ============================================================================
// Webhook Callback Queue
// ============================================================================
// Persistent queue for client webhook delivery with retry and dead-letter support.
// Uses BullMQ (Redis-backed) for fault tolerance.

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue, Worker, Job } from 'bullmq';
import axios, { AxiosError } from 'axios';
import { Payment, ProviderId } from '../core/types/payment.types';
import { createHmac } from 'crypto';

export interface ClientWebhookJob {
  url: string;
  event: 'payment.success' | 'payment.failed' | 'payment.pending';
  provider: ProviderId;
  transactionRef: string;
  status: string;
  amount: number;
  currency: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

interface WebhookAttempt {
  status: number;
  response?: string;
  error?: string;
}

@Injectable()
export class WebhookCallbackQueue implements OnModuleInit {
  private readonly logger = new Logger(WebhookCallbackQueue.name);
  private queue!: Queue<ClientWebhookJob, WebhookAttempt>;
  private worker!: Worker<ClientWebhookJob, WebhookAttempt>;

  async onModuleInit(): Promise<void> {
    const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

    this.queue = new Queue<ClientWebhookJob, WebhookAttempt>(
      'webhook-callbacks',
      {
        connection: { url: redisUrl },
        defaultJobOptions: {
          attempts: 10,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: 100,
          removeOnFail: 100,
        },
      },
    );

    this.worker = new Worker<ClientWebhookJob, WebhookAttempt>(
      'webhook-callbacks',
      async (job) => this.processJob(job),
      {
        connection: { url: redisUrl },
        concurrency: 5,
        stalledInterval: 30000,
      },
    );

    // Wait for worker to be ready
    await this.worker.waitUntilReady();
    await this.queue.waitUntilReady();

    this.worker.on('completed', (job) => {
      this.logger.log(
        `Webhook delivered: ${job.data.transactionRef} to ${job.data.url}`,
      );
    });

    this.worker.on('failed', (job, err) => {
      if (job) {
        this.logger.error(
          `Webhook failed after ${job.attemptsMade} attempts: ${job.data.transactionRef}. Error: ${err.message}`,
        );
      }
    });

    this.logger.log('Webhook callback queue initialized');
  }

  async enqueue(
    url: string,
    payment: Payment,
    event: 'payment.success' | 'payment.failed' | 'payment.pending',
  ): Promise<Job<ClientWebhookJob, WebhookAttempt>> {
    const jobData: ClientWebhookJob = {
      url,
      event,
      provider: payment.provider,
      transactionRef: payment.providerRef,
      status: payment.status,
      amount: payment.amount.value,
      currency: payment.amount.currency,
      metadata: (payment as any).metadata || {},
      timestamp: new Date().toISOString(),
    };

    this.logger.log(`Enqueuing webhook for ${payment.providerRef} to ${url}`);
    return this.queue.add('send-webhook', jobData);
  }

  private async processJob(
    job: Job<ClientWebhookJob, WebhookAttempt>,
  ): Promise<WebhookAttempt> {
    const { data } = job;

    this.logger.log(
      `Attempt ${job.attemptsMade + 1} for ${data.transactionRef} to ${data.url}`,
    );

    try {
      const response = await axios.post(data.url, data, {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'X-OurPocket-Event': data.event,
          'X-OurPocket-Signature': this.generateSignature(data),
          'X-OurPocket-Attempt': String(job.attemptsMade + 1),
        },
        validateStatus: () => true, // Don't throw, handle all status codes
      });

      const status = response.status;
      const responseBody =
        typeof response.data === 'string'
          ? response.data
          : JSON.stringify(response.data);

      // Success: 2xx status codes
      if (status >= 200 && status < 300) {
        this.logger.log(
          `Webhook delivered: ${data.transactionRef} (status ${status})`,
        );
        return { status, response: responseBody };
      }

      // Client errors (4xx): don't retry
      if (status >= 400 && status < 500) {
        this.logger.warn(
          `Webhook client error ${status} for ${data.transactionRef}: ${responseBody}`,
        );
        throw new Error(`Client error ${status}: ${responseBody}`);
      }

      // Server errors (5xx): retry
      this.logger.warn(
        `Webhook server error ${status} for ${data.transactionRef}. Will retry.`,
      );
      throw new Error(`Server error ${status}: ${responseBody}`);
    } catch (error) {
      const axiosError = error as AxiosError;
      const errorMsg = axiosError.message || 'Unknown error';

      this.logger.error(
        `Webhook attempt failed for ${data.transactionRef}: ${errorMsg}`,
      );
      throw error; // Let BullMQ handle retry
    }
  }

  private generateSignature(data: ClientWebhookJob): string {
    const secret = process.env.WEBHOOK_SIGNING_SECRET || 'default-secret';
    const payload = JSON.stringify(data);
    return createHmac('sha256', secret).update(payload).digest('hex');
  }

  async getQueueStatus(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    return {
      waiting: await this.queue.getWaitingCount(),
      active: await this.queue.getActiveCount(),
      completed: await this.queue.getCompletedCount(),
      failed: await this.queue.getFailedCount(),
      delayed: await this.queue.getDelayedCount(),
    };
  }

  async getFailedJobs(
    start = 0,
    end = 99,
  ): Promise<Job<ClientWebhookJob, WebhookAttempt>[]> {
    return this.queue.getFailed(start, end);
  }

  async close(): Promise<void> {
    await this.worker.close();
    await this.queue.close();
  }
}
