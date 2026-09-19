import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { DataSource, LessThan } from 'typeorm';
import { Queue, Worker } from 'bullmq';
import { createHmac, randomBytes } from 'node:crypto';
import { request } from 'node:https';
import { Webhook } from '../entities/webhook.entity';
import { ProjectProviderService } from '../project/project-provider.service';
import { ProviderRegistry } from '../providers/provider-registry';
import { PROVIDER_TYPE_ENUM } from '../enums';
import { FinancialContext, FinancialService } from './financial.service';
import {
  FinancialDelivery,
  FinancialEvent,
  FinancialResource,
  PaymentProvider,
} from './financial.entity';
import { FinancialWebhookDto } from './financial.dto';
import { redact } from './financial-utils';
import { webhookDestination } from './webhook-destination';
export const retryDelays = [60000, 300000, 1800000, 7200000, 43200000];
const eventTypes = [
  'payment.created',
  'payment.pending',
  'payment.unknown',
  'payment.completed',
  'payment.failed',
  'refund.created',
  'refund.pending',
  'refund.unknown',
  'refund.completed',
  'refund.failed',
  'transfer.created',
  'transfer.pending',
  'transfer.unknown',
  'transfer.completed',
  'transfer.failed',
  'wallet.created',
  'wallet.completed',
  'customer.created',
];
@Injectable()
export class FinancialWebhooksService implements OnModuleInit, OnModuleDestroy {
  private queue?: Queue<{ deliveryId: string }>;
  private worker?: Worker<{ deliveryId: string }>;
  private dispatching = false;
  constructor(
    private readonly db: DataSource,
    private readonly financial: FinancialService,
    private readonly providers: ProjectProviderService,
    private readonly providerRegistry: ProviderRegistry,
  ) {}
  onModuleInit() {
    if (process.env.FINANCIAL_WEBHOOK_WORKER !== 'true') return;
    if (!process.env.REDIS_HOST)
      throw new Error('REDIS_HOST is required for webhook worker');
    const connection = {
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT ?? 6379),
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: null,
    };
    this.queue = new Queue('financial-webhooks', { connection });
    this.worker = new Worker(
      'financial-webhooks',
      (job) => this.deliver(job.data.deliveryId),
      {
        connection,
        concurrency: 5,
        settings: {
          backoffStrategy: (attemptsMade) =>
            retryDelays[attemptsMade - 1] ??
            retryDelays[retryDelays.length - 1],
        },
      },
    );
    this.worker.on('error', (error) =>
      console.error('Webhook worker error:', error.name),
    );
  }
  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
  }
  @Interval(5000)
  async dispatch() {
    if (!this.queue || this.dispatching) return;
    this.dispatching = true;
    try {
      // PostgreSQL owns the outbox. Row locks permit recovery and prevent competing dispatchers from duplicating deliveries.
      await this.db.transaction(async (manager) => {
        const events = await manager
          .getRepository(FinancialEvent)
          .createQueryBuilder('event')
          .where('event.dispatched = false')
          .andWhere('event.environment != :production', {
            production: 'production',
          })
          .orderBy('event.createdAt', 'ASC')
          .take(50)
          .setLock('pessimistic_write')
          .setOnLocked('skip_locked')
          .getMany();
        for (const event of events) {
          const endpoints = await manager.find(Webhook, {
            where: {
              project: { id: event.projectId },
              environment: event.environment,
              isActive: true,
            },
          });
          for (const endpoint of endpoints) {
            if (
              endpoint.eventTypes?.length &&
              !endpoint.eventTypes.includes(event.type)
            )
              continue;
            await manager.save(
              FinancialDelivery,
              manager.create(FinancialDelivery, {
                projectId: event.projectId,
                environment: event.environment,
                eventId: event.id,
                requestId: event.requestId,
                webhookId: endpoint.id,
              }),
            );
          }
          event.dispatched = true;
          await manager.save(event);
        }
      });
      const pending = await this.db.manager.find(FinancialDelivery, {
        where: [
          { status: 'pending' },
          { status: 'processing', leaseExpiresAt: LessThan(new Date()) },
        ],
        order: { createdAt: 'ASC' },
      });
      for (const item of pending) {
        const job = await this.queue.getJob(item.id);
        if (!job) {
          await this.queue.add(
            'deliver',
            { deliveryId: item.id },
            { jobId: item.id, attempts: 6, backoff: { type: 'custom' } },
          );
        } else if (item.attempts < 6) {
          const state = await job.getState();
          if (state === 'failed') await job.retry('failed');
          if (state === 'completed' && item.status === 'processing') {
            await job.remove();
            await this.queue.add(
              'deliver',
              { deliveryId: item.id },
              { jobId: item.id, attempts: 6, backoff: { type: 'custom' } },
            );
          }
        }
      }
    } finally {
      this.dispatching = false;
    }
  }
  async create(ctx: FinancialContext, dto: FinancialWebhookDto) {
    await webhookDestination(dto.url);
    const types =
      dto.events
        ?.split(',')
        .map((value) => value.trim())
        .filter(Boolean) ?? [];
    if (types.some((type) => !eventTypes.includes(type)))
      throw new BadRequestException('Unsupported event filter');
    const endpoint = await this.db.manager.save(
      Webhook,
      this.db.manager.create(Webhook, {
        project: { id: ctx.projectId },
        environment: ctx.environment,
        url: dto.url,
        eventTypes: types,
        secret: `whsec_${randomBytes(32).toString('hex')}`,
        isActive: true,
      }),
    );
    return endpoint;
  }
  async endpoints(ctx: FinancialContext) {
    const endpoints = await this.db.manager.find(Webhook, {
      where: { project: { id: ctx.projectId }, environment: ctx.environment },
    });
    return endpoints.map(({ secret, ...item }) => item);
  }
  async remove(ctx: FinancialContext, id: string) {
    const endpoint = await this.db.manager.findOne(Webhook, {
      where: {
        id,
        project: { id: ctx.projectId },
        environment: ctx.environment,
      },
    });
    if (!endpoint) throw new NotFoundException('Webhook not found');
    endpoint.isActive = false;
    await this.db.manager.save(endpoint);
    return { id, isActive: false };
  }
  deliveries(ctx: FinancialContext) {
    return this.db.manager.find(FinancialDelivery, {
      where: { projectId: ctx.projectId, environment: ctx.environment },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }
  async replay(ctx: FinancialContext, id: string) {
    const original = await this.db.manager.findOne(FinancialDelivery, {
      where: { id, projectId: ctx.projectId, environment: ctx.environment },
    });
    if (!original) throw new NotFoundException('Delivery not found');
    const endpoint = await this.db.manager.findOne(Webhook, {
      where: {
        id: original.webhookId,
        environment: ctx.environment,
        isActive: true,
      },
    });
    if (!endpoint)
      throw new BadRequestException('Webhook endpoint is inactive');
    return this.db.manager.save(
      FinancialDelivery,
      this.db.manager.create(FinancialDelivery, {
        projectId: ctx.projectId,
        environment: ctx.environment,
        eventId: original.eventId,
        requestId: original.requestId,
        webhookId: original.webhookId,
      }),
    );
  }
  test(_ctx: FinancialContext): Promise<never> {
    return Promise.reject(
      new BadRequestException(
        'Test event creation is unavailable because OurPocket does not persist customer or provider event data',
      ),
    );
  }
  async deliver(id: string) {
    const claim = await this.db.transaction(async (manager) => {
      const delivery = await manager.findOne(FinancialDelivery, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (
        !delivery ||
        (delivery.status !== 'pending' &&
          !(
            delivery.status === 'processing' &&
            delivery.leaseExpiresAt &&
            delivery.leaseExpiresAt < new Date()
          ))
      )
        return null;
      const endpoint = await manager.findOne(Webhook, {
        where: {
          id: delivery.webhookId,
          project: { id: delivery.projectId },
          environment: delivery.environment,
          isActive: true,
        },
      });
      const event = await manager.findOneByOrFail(FinancialEvent, {
        id: delivery.eventId,
      });
      if (!endpoint) {
        delivery.status = 'failed';
        delivery.leaseExpiresAt = null;
        await manager.save(delivery);
        return null;
      }
      delivery.status = 'processing';
      delivery.leaseExpiresAt = new Date(Date.now() + 60000);
      await manager.save(delivery);
      return { delivery, endpoint, event };
    });
    if (!claim) return;
    const { delivery, endpoint, event } = claim;
    const started = Date.now();
    let statusCode: number | null = null;
    let response = '';
    try {
      const { url, address } = await webhookDestination(endpoint.url);
      const payload = JSON.stringify({
        id: event.id,
        type: event.type,
        environment: event.environment,
        requestId: event.requestId,
        createdAt: event.createdAt,
        data: event.data,
      });
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = createHmac('sha256', endpoint.secret)
        .update(`${timestamp}.${payload}`)
        .digest('hex');
      const result = await new Promise<{ status: number; body: string }>(
        (resolve, reject) => {
          const outgoing = request(
            url,
            {
              method: 'POST',
              hostname: address.address,
              servername: url.hostname,
              headers: {
                Host: url.host,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload),
                'OurPocket-Signature': `t=${timestamp},v1=${signature}`,
                'X-Request-Id': event.requestId,
                'OurPocket-Delivery-Id': delivery.id,
              },
              timeout: 10000,
            },
            (incoming) => {
              let bytes = 0;
              const chunks: Buffer[] = [];
              incoming.on('data', (chunk: Buffer) => {
                bytes += chunk.length;
                if (bytes <= 4096) chunks.push(chunk);
                if (bytes > 65536)
                  incoming.destroy(new Error('Response too large'));
              });
              incoming.on('error', reject);
              incoming.on('end', () =>
                resolve({
                  status: incoming.statusCode ?? 0,
                  body: Buffer.concat(chunks).toString('utf8'),
                }),
              );
            },
          );
          outgoing.on('timeout', () =>
            outgoing.destroy(new Error('Webhook timed out')),
          );
          outgoing.on('error', reject);
          outgoing.end(payload);
        },
      );
      statusCode = result.status;
      try {
        response = JSON.stringify(redact(JSON.parse(result.body)));
      } catch {
        response = '[Non-JSON response omitted]';
      }
    } catch {
      response = '[Delivery failed]';
    }
    const attempt = {
      attemptedAt: new Date().toISOString(),
      statusCode,
      latencyMs: Date.now() - started,
      response: response.slice(0, 4096),
    };
    const success =
      statusCode !== null && statusCode >= 200 && statusCode < 300;
    await this.db.transaction(async (manager) => {
      const current = await manager.findOne(FinancialDelivery, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!current || current.status !== 'processing') return;
      current.attempts += 1;
      current.history = [...current.history, attempt];
      current.status = success
        ? 'completed'
        : current.attempts >= 6
          ? 'failed'
          : 'pending';
      current.leaseExpiresAt = null;
      await manager.save(current);
      await this.financial.log(
        {
          projectId: current.projectId,
          environment: current.environment,
          requestId: current.requestId,
        },
        'webhooks.deliver',
        'application',
        {
          deliveryId: current.id,
          eventId: event.id,
          statusCode,
          latencyMs: attempt.latencyMs,
          attempt: current.attempts,
        },
        manager,
      );
    });
    if (!success) throw new Error('Webhook delivery failed');
  }
  async receive(
    ctx: FinancialContext,
    provider: PaymentProvider,
    raw: Buffer,
    signature?: string,
    legacySignature?: string,
    monoSignature?: string,
  ) {
    if (ctx.environment !== 'production')
      throw new BadRequestException('Provider webhooks are production-only');
    const config = await this.providers.getProviderConfigForProject(
      ctx.projectId,
      provider as PROVIDER_TYPE_ENUM,
      'production',
    );
    const verified = this.providerRegistry.adapter(provider).verifyWebhook(
      raw,
      {
        'x-paystack-signature': signature,
        'flutterwave-signature': signature,
        'verif-hash': legacySignature,
        'mono-webhook-secret': monoSignature,
      },
      config,
    );
    if (!verified)
      throw new UnauthorizedException('Invalid provider signature');
    // This endpoint only authenticates delivery. Provider payloads and outcomes
    // are intentionally never queued, logged, or persisted by OurPocket.
    return { received: true };
  }
  @Interval(30000)
  recoverReceipts(): void {
    // Production receipts are intentionally never stored or recovered.
  }
}
