import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';
import { randomUUID } from 'node:crypto';
import axios from 'axios';
import { ProjectApiKey } from '../entities/project-api-key.entity';
import { ProviderCatalog } from '../entities/provider-catalog.entity';
import { ProjectProvider } from '../entities/project-provider.entity';
import { ProjectProviderService } from '../project/project-provider.service';
import { PROVIDER_TYPE_ENUM, PROVIDER_CATALOG_STATUS_ENUM } from '../enums';
import {
  AmountDto,
  CustomerDto,
  PaymentDto,
  RefundDto,
  Scenario,
  TransferDto,
  WalletDto,
  RoutingPolicyDto,
  ProviderHealthDto,
} from './financial.dto';
import {
  Environment,
  FinancialEvent,
  FinancialIdempotency,
  FinancialLog,
  FinancialResource,
  FinancialRoutingPolicy,
  FinancialProviderHealth,
  FinancialReconciliationRun,
  OperationStatus,
  PaymentProvider,
  WalletProvider,
  ResourceKind,
} from './financial.entity';
import { fingerprint, redact } from './financial-utils';
import { PaymentAdapters } from './payment-adapters';
import { WalletAdapters } from './wallet-adapters';
export interface FinancialContext {
  projectId: string;
  environment: Environment;
  requestId: string;
  apiKeyId?: string;
}
export const paymentProviders: PaymentProvider[] = ['paystack', 'flutterwave'];
export function keyContext(
  key: ProjectApiKey,
  requestId: string = randomUUID(),
): FinancialContext {
  return {
    projectId: key.project.id,
    environment: key.scope === 'test' ? 'sandbox' : 'production',
    requestId,
    apiKeyId: key.id,
  };
}
@Injectable()
export class FinancialService {
  constructor(
    private readonly db: DataSource,
    private readonly providers: ProjectProviderService,
    private readonly adapters: PaymentAdapters,
    private readonly walletAdapters: WalletAdapters,
  ) {}
  async locked<T>(
    ctx: FinancialContext,
    operation: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    return this.db.transaction(async (manager) => {
      await manager.query(
        'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
        [`financial:${ctx.projectId}:${ctx.environment}`],
      );
      return operation(manager);
    });
  }
  async resource(
    ctx: FinancialContext,
    id: string,
    kind?: ResourceKind,
    manager: EntityManager = this.db.manager,
  ): Promise<FinancialResource> {
    const item = await manager.findOne(FinancialResource, {
      where: {
        id,
        projectId: ctx.projectId,
        environment: ctx.environment,
        ...(kind ? { kind } : {}),
      },
    });
    if (!item) throw new NotFoundException('Resource not found');
    return item;
  }
  list(ctx: FinancialContext, kind?: ResourceKind | ResourceKind[]) {
    return this.db.manager.find(FinancialResource, {
      where: {
        projectId: ctx.projectId,
        environment: ctx.environment,
        ...(kind ? { kind: Array.isArray(kind) ? In(kind) : kind } : {}),
      },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }
  async integrations(ctx: FinancialContext) {
    const connections = await this.db.manager.find(ProjectProvider, {
      where: { project: { id: ctx.projectId }, environment: ctx.environment },
      order: { createdAt: 'DESC' },
    });
    return connections.map((connection) => ({
      id: connection.id,
      provider: connection.type,
      providerId: connection.providerCatalogId,
      environment: connection.environment,
      isActive: connection.isActive,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
    }));
  }
  events(ctx: FinancialContext) {
    return this.db.manager.find(FinancialEvent, {
      where: { projectId: ctx.projectId, environment: ctx.environment },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }
  logs(ctx: FinancialContext) {
    return this.db.manager.find(FinancialLog, {
      where: { projectId: ctx.projectId, environment: ctx.environment },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }
  async log(
    ctx: FinancialContext,
    operation: string,
    source: 'application' | 'provider',
    details: Record<string, unknown>,
    manager: EntityManager = this.db.manager,
  ) {
    await manager.save(
      FinancialLog,
      manager.create(FinancialLog, {
        ...ctx,
        operation,
        source,
        details: redact(details),
      }),
    );
  }
  async emit(manager: EntityManager, item: FinancialResource, type: string) {
    const data: Record<string, unknown> = {
      id: item.id,
      kind: item.kind,
      amount: item.amount,
      currency: item.currency,
      status: item.status,
      provider: item.provider,
      providerReference: item.providerReference,
    };
    await manager.save(
      FinancialEvent,
      manager.create(FinancialEvent, {
        projectId: item.projectId,
        environment: item.environment,
        requestId: item.requestId,
        resourceId: item.id,
        type,
        data,
      }),
    );
  }
  private async create(
    ctx: FinancialContext,
    operation: string,
    key: string | undefined,
    payload: unknown,
    initialize: (
      manager: EntityManager,
    ) => Promise<Partial<FinancialResource>> | Partial<FinancialResource>,
  ) {
    if (!key || key.length > 200 || !key.trim())
      throw new BadRequestException(
        'Idempotency-Key is required (maximum 200 characters)',
      );
    const hash = fingerprint(operation, payload);
    return this.locked(ctx, async (manager) => {
      const existing = await manager.findOne(FinancialIdempotency, {
        where: { projectId: ctx.projectId, environment: ctx.environment, key },
      });
      if (existing) {
        if (existing.fingerprint !== hash)
          throw new ConflictException(
            'Idempotency key was used for a different request',
          );
        return {
          item: await this.resource(
            ctx,
            existing.resourceId,
            undefined,
            manager,
          ),
          created: false,
        };
      }
      if (ctx.apiKeyId) {
        const incremented = await manager
          .createQueryBuilder()
          .update(ProjectApiKey)
          .set({ used: () => '"used" + 1' })
          .where('id = :id AND used < quota', { id: ctx.apiKeyId })
          .execute();
        if (!incremented.affected)
          throw new UnauthorizedException(
            'Project API key quota exceeded or revoked',
          );
      }
      const fields = await initialize(manager);
      const item = await manager.save(
        FinancialResource,
        manager.create(FinancialResource, {
          ...ctx,
          status: 'pending',
          amount: null,
          currency: null,
          provider: null,
          providerReference: null,
          parentId: null,
          details: {},
          ...fields,
        }),
      );
      await manager.save(
        FinancialIdempotency,
        manager.create(FinancialIdempotency, {
          projectId: ctx.projectId,
          environment: ctx.environment,
          key,
          fingerprint: hash,
          resourceId: item.id,
        }),
      );
      await this.emit(manager, item, `${item.kind}.created`);
      if (item.kind !== 'customer' && item.kind !== 'wallet')
        await this.emit(manager, item, `${item.kind}.${item.status}`);
      await this.log(
        ctx,
        operation,
        'application',
        { resourceId: item.id, status: item.status },
        manager,
      );
      return { item, created: true };
    });
  }
  async customer(ctx: FinancialContext, dto: CustomerDto, key?: string) {
    return (
      await this.create(ctx, 'customers.create', key, dto, () => ({
        kind: 'customer',
        status: 'completed',
        details: { email: dto.email, name: dto.name },
      }))
    ).item;
  }
  private sandbox(ctx: FinancialContext) {
    if (ctx.environment !== 'sandbox')
      throw new BadRequestException(
        'Simulated wallet operations are sandbox-only',
      );
  }
  private scenario(ctx: FinancialContext, scenario?: Scenario) {
    if (ctx.environment === 'production' && scenario)
      throw new BadRequestException('Simulation scenarios are sandbox-only');
    return scenario ?? 'success';
  }
  private scenarioStatus(scenario: Scenario): OperationStatus {
    return ['timeout', 'provider_outage'].includes(scenario)
      ? 'unknown'
      : scenario === 'pending'
        ? 'pending'
        : ['failure', 'insufficient_funds'].includes(scenario)
          ? 'failed'
          : 'completed';
  }
  private async provider(
    ctx: FinancialContext,
    requested?: PaymentProvider,
  ): Promise<{
    provider: PaymentProvider;
    decision: Record<string, unknown>;
  }> {
    if (ctx.environment === 'sandbox') {
      const provider = requested ?? 'paystack';
      return {
        provider,
        decision: {
          mode: 'simulator',
          selected: provider,
          reason: requested ? 'explicit provider' : 'sandbox default',
        },
      };
    }
    const catalog = await this.db.manager.find(ProviderCatalog, {
      where: {
        slug: In(paymentProviders),
        status: PROVIDER_CATALOG_STATUS_ENUM.ACTIVE,
      },
    });
    const connections = await this.db.manager.find(ProjectProvider, {
      where: {
        project: { id: ctx.projectId },
        environment: ctx.environment,
        isActive: true,
        type: In(paymentProviders),
      },
    });
    const connected = connections.filter((connection) =>
      catalog.some((provider) => provider.adapterType === connection.type),
    );
    if (requested) {
      if (!connected.some((item) => String(item.type) === requested))
        throw new BadRequestException(
          'Provider is not connected in this environment',
        );
      return {
        provider: requested,
        decision: {
          mode: 'explicit',
          selected: requested,
          candidates: connected.map((item) => item.type),
          reason: 'provider supplied by request',
        },
      };
    }
    if (!connected.length)
      throw new BadRequestException('Connect a payment provider first');
    if (connected.length === 1) {
      const provider = String(connected[0].type) as PaymentProvider;
      return {
        provider,
        decision: {
          mode: 'sole_eligible',
          selected: provider,
          candidates: [provider],
          reason: 'only eligible connected provider',
        },
      };
    }
    const policy = await this.db.manager.findOne(FinancialRoutingPolicy, {
      where: { projectId: ctx.projectId, environment: ctx.environment },
    });
    if (!policy)
      throw new BadRequestException(
        'Select a provider explicitly or configure a routing policy',
      );
    const candidates = connected.map(
      (item) => String(item.type) as PaymentProvider,
    );
    const health = await this.db.manager.find(FinancialProviderHealth, {
      where: {
        projectId: ctx.projectId,
        environment: ctx.environment,
        provider: In(candidates),
      },
    });
    const payments = await this.recentPayments(ctx);
    const sample = (provider: PaymentProvider) =>
      health.find((item) => item.provider === provider);
    const successRate = (provider: PaymentProvider) => {
      const settled = payments.filter(
        (item) =>
          item.provider === provider &&
          (item.status === 'completed' || item.status === 'failed'),
      );
      return settled.length
        ? settled.filter((item) => item.status === 'completed').length /
            settled.length
        : null;
    };
    const latency = (provider: PaymentProvider) => {
      const samples = payments
        .filter((item) => item.provider === provider)
        .map((item) => item.details.providerLatencyMs)
        .filter(
          (value): value is number =>
            typeof value === 'number' && Number.isFinite(value) && value >= 0,
        )
        .sort((left, right) => left - right);
      return samples.length
        ? samples[Math.ceil(samples.length * 0.95) - 1]
        : null;
    };
    const priority = policy.providerPriority.filter((provider) =>
      candidates.includes(provider),
    );
    const priorityIndex = (provider: PaymentProvider) => {
      const index = priority.indexOf(provider);
      return index === -1
        ? priority.length + candidates.indexOf(provider)
        : index;
    };
    const metric = (provider: PaymentProvider) => {
      const snapshot = sample(provider);
      if (policy.strategy === 'lowest_fees')
        return snapshot?.estimatedFeeBps ?? Number.POSITIVE_INFINITY;
      if (policy.strategy === 'fastest_response')
        return latency(provider) ?? Number.POSITIVE_INFINITY;
      if (policy.strategy === 'best_success_rate')
        return successRate(provider) === null
          ? Number.POSITIVE_INFINITY
          : -successRate(provider)!;
      return priorityIndex(provider);
    };
    const ranked = [...candidates].sort((left, right) => {
      const difference = metric(left) - metric(right);
      if (difference) return difference;
      return priorityIndex(left) - priorityIndex(right);
    });
    const eligible = policy.requireHealthy
      ? ranked.filter((provider) => sample(provider)?.status !== 'down')
      : ranked;
    const preferred = ranked[0];
    if (!eligible.length || (preferred !== eligible[0] && !policy.safeFailover))
      throw new BadRequestException(
        'Preferred provider is down; enable pre-request failover or select a provider',
      );
    const provider = eligible[0];
    return {
      provider,
      decision: {
        mode: 'policy',
        policyId: policy.id,
        strategy: policy.strategy,
        selected: provider,
        candidates,
        eligible,
        health: candidates.map((candidate) => ({
          provider: candidate,
          status: sample(candidate)?.status ?? 'unknown',
          successRate: successRate(candidate),
          settledCount: payments.filter(
            (item) =>
              item.provider === candidate &&
              (item.status === 'completed' || item.status === 'failed'),
          ).length,
          p95LatencyMs: latency(candidate),
          estimatedFeeBps: sample(candidate)?.estimatedFeeBps ?? null,
        })),
        safeFailover: policy.safeFailover,
        reason:
          provider !== preferred
            ? `preferred provider down; selected ${provider} before any provider write`
            : !Number.isFinite(metric(provider)) &&
                policy.strategy !== 'custom_priority'
              ? 'no provider measurements; used configured priority'
              : `selected by ${policy.strategy}`,
      },
    };
  }
  private credentials(ctx: FinancialContext, provider: PaymentProvider) {
    return this.providers.getProviderApiKeyForProject(
      ctx.projectId,
      provider === 'paystack'
        ? PROVIDER_TYPE_ENUM.PAYSTACK
        : PROVIDER_TYPE_ENUM.FLUTTERWAVE,
      ctx.environment,
    );
  }
  async payment(ctx: FinancialContext, dto: PaymentDto, key?: string) {
    const scenario = this.scenario(ctx, dto.scenario);
    const created = await this.create(
      ctx,
      'payments.create',
      key,
      dto,
      async (manager) => {
        await this.resource(ctx, dto.customer, 'customer', manager);
        const route = await this.provider(ctx, dto.provider);
        const provider = route.provider;
        if (
          ctx.environment === 'production' &&
          provider === 'flutterwave' &&
          !dto.callbackUrl
        )
          throw new BadRequestException(
            'callbackUrl is required for Flutterwave checkout',
          );
        return {
          kind: 'payment',
          amount: dto.amount,
          currency: dto.currency,
          provider,
          parentId: dto.customer,
          status:
            ctx.environment === 'sandbox'
              ? this.scenarioStatus(scenario)
              : 'pending',
          details: {
            scenario: ctx.environment === 'sandbox' ? scenario : undefined,
            callbackUrl: dto.callbackUrl,
            routingDecision: route.decision,
          },
        };
      },
    );
    if (!created.created || ctx.environment === 'sandbox') return created.item;
    const item = created.item;
    if (!item.provider)
      throw new BadRequestException('Payment provider missing');
    let providerStartedAt: number | undefined;
    try {
      const customer = await this.resource(ctx, dto.customer, 'customer');
      const email = customer.details.email;
      if (typeof email !== 'string')
        throw new BadRequestException('Customer email missing');
      const provider = item.provider as PaymentProvider;
      providerStartedAt = Date.now();
      const result = await this.adapters.create(
        provider,
        await this.credentials(ctx, provider),
        {
          reference: item.id,
          amount: dto.amount,
          currency: dto.currency,
          email,
          callbackUrl: dto.callbackUrl,
        },
      );
      if (result.reference !== item.id)
        throw new BadRequestException('Provider reference mismatch');
      return this.locked(ctx, async (manager) => {
        const saved = await this.resource(ctx, item.id, 'payment', manager);
        saved.details = {
          ...saved.details,
          checkoutUrl: result.checkoutUrl,
          checkoutReference: result.reference,
          providerLatencyMs: Date.now() - providerStartedAt!,
        };
        await manager.save(saved);
        await this.log(
          ctx,
          'payments.create',
          'provider',
          { resourceId: item.id, reference: result.reference },
          manager,
        );
        return saved;
      });
    } catch (error) {
      return this.providerFailure(
        ctx,
        item.id,
        error,
        providerStartedAt === undefined
          ? undefined
          : Date.now() - providerStartedAt,
      );
    }
  }
  private async providerFailure(
    ctx: FinancialContext,
    id: string,
    error: unknown,
    latencyMs?: number,
  ) {
    const rejected =
      axios.isAxiosError(error) &&
      error.response !== undefined &&
      [400, 401, 403, 404, 422].includes(error.response.status);
    return this.locked(ctx, async (manager) => {
      const item = await this.resource(ctx, id, undefined, manager);
      if (item.status === 'pending' || item.status === 'unknown') {
        item.details = {
          ...item.details,
          providerOutcome: rejected ? 'rejected' : 'unknown',
          ...(latencyMs === undefined ? {} : { providerLatencyMs: latencyMs }),
        };
        if (rejected) {
          item.status = 'failed';
          await this.emit(manager, item, `${item.kind}.failed`);
        } else item.status = 'unknown';
        await manager.save(item);
      }
      await this.log(
        ctx,
        `${item.kind}.provider_response`,
        'provider',
        { resourceId: id, outcome: rejected ? 'rejected' : 'unknown' },
        manager,
      );
      return item;
    });
  }
  async verify(ctx: FinancialContext, id: string) {
    const item = await this.resource(ctx, id, 'payment');
    if (
      ctx.environment === 'sandbox' ||
      !['pending', 'unknown'].includes(item.status)
    )
      return item;
    if (!item.provider)
      throw new BadRequestException('Payment provider missing');
    const provider = item.provider as PaymentProvider;
    const result = await this.adapters.verify(
      provider,
      await this.credentials(ctx, provider),
      item.id,
    );
    if (
      result.reference !== item.id ||
      result.amount !== item.amount ||
      result.currency !== item.currency
    )
      throw new ConflictException(
        'Provider payment does not match expected reference, amount, and currency',
      );
    return this.locked(ctx, async (manager) => {
      const current = await this.resource(ctx, id, 'payment', manager);
      if (['pending', 'unknown'].includes(current.status)) {
        current.providerReference = result.providerReference;
        if (result.status !== current.status) {
          current.status = result.status;
          await this.emit(manager, current, `payment.${current.status}`);
        }
        await manager.save(current);
      }
      await this.log(
        ctx,
        'payments.verify',
        'provider',
        { resourceId: id, status: result.status },
        manager,
      );
      return current;
    });
  }
  async refund(ctx: FinancialContext, dto: RefundDto, key?: string) {
    const scenario = this.scenario(ctx, dto.scenario);
    const created = await this.create(
      ctx,
      'refunds.create',
      key,
      dto,
      async (manager) => {
        const payment = await this.resource(
          ctx,
          dto.payment,
          'payment',
          manager,
        );
        if (payment.status !== 'completed')
          throw new BadRequestException(
            'Only completed payments can be refunded',
          );
        const refunds = await manager.find(FinancialResource, {
          where: {
            projectId: ctx.projectId,
            environment: ctx.environment,
            kind: 'refund',
            parentId: payment.id,
          },
        });
        const reserved = refunds
          .filter((item) => item.status !== 'failed')
          .reduce((sum, item) => sum + BigInt(item.amount ?? '0'), 0n);
        const remaining = BigInt(payment.amount ?? '0') - reserved;
        const amount = dto.amount ? BigInt(dto.amount) : remaining;
        if (amount <= 0n || amount > remaining)
          throw new ConflictException(
            'Refund exceeds remaining refundable amount',
          );
        return {
          kind: 'refund',
          parentId: payment.id,
          provider: payment.provider,
          amount: amount.toString(),
          currency: payment.currency,
          status:
            ctx.environment === 'sandbox'
              ? this.scenarioStatus(scenario)
              : 'pending',
          details: {
            scenario: ctx.environment === 'sandbox' ? scenario : undefined,
          },
        };
      },
    );
    if (!created.created || ctx.environment === 'sandbox') return created.item;
    const item = created.item;
    const payment = await this.resource(ctx, dto.payment, 'payment');
    if (
      !item.provider ||
      !item.amount ||
      !item.currency ||
      !payment.providerReference
    )
      return this.providerFailure(
        ctx,
        item.id,
        new Error('Verified provider payment reference unavailable'),
      );
    try {
      const provider = item.provider as PaymentProvider;
      const result = await this.adapters.refund(
        provider,
        await this.credentials(ctx, provider),
        payment.providerReference,
        item.amount,
        item.currency,
      );
      return this.locked(ctx, async (manager) => {
        const current = await this.resource(ctx, item.id, 'refund', manager);
        current.providerReference = result.reference;
        await manager.save(current);
        await this.log(
          ctx,
          'refunds.create',
          'provider',
          { resourceId: item.id, status: current.status },
          manager,
        );
        return current;
      });
    } catch (error) {
      return this.providerFailure(ctx, item.id, error);
    }
  }
  async verifyRefund(ctx: FinancialContext, id: string) {
    const item = await this.resource(ctx, id, 'refund');
    if (
      ctx.environment === 'sandbox' ||
      !['pending', 'unknown'].includes(item.status)
    )
      return item;
    if (!item.provider || !item.providerReference)
      throw new ConflictException(
        'Refund outcome is uncertain; provider reference is not available',
      );
    if (!item.parentId || !item.currency)
      throw new ConflictException('Refund parent missing');
    const payment = await this.resource(ctx, item.parentId, 'payment');
    const provider = item.provider as PaymentProvider;
    const result = await this.adapters.verifyRefund(
      provider,
      await this.credentials(ctx, provider),
      item.providerReference,
      item.currency,
    );
    if (
      result.reference !== item.providerReference ||
      result.amount !== item.amount ||
      result.currency !== item.currency ||
      result.paymentReference !== payment.providerReference
    )
      throw new ConflictException(
        'Provider refund does not match expected reference, payment, amount, and currency',
      );
    return this.locked(ctx, async (manager) => {
      const current = await this.resource(ctx, id, 'refund', manager);
      if (
        ['pending', 'unknown'].includes(current.status) &&
        result.status !== 'pending'
      ) {
        current.status = result.status;
        await manager.save(current);
        await this.emit(manager, current, `refund.${current.status}`);
      }
      return current;
    });
  }
  async wallet(ctx: FinancialContext, dto: WalletDto, key?: string) {
    const walletProvider = dto.provider;
    if (ctx.environment === 'sandbox' && !dto.currency)
      throw new BadRequestException('Fiat currency is required in Sandbox');
    if (ctx.environment === 'sandbox' && (dto.provider || dto.chain))
      throw new BadRequestException('Provider and chain are production-only');
    if (ctx.environment === 'production' && !walletProvider)
      throw new BadRequestException(
        'Select Turnkey or Privy for a production wallet',
      );
    if (ctx.environment === 'production' && !dto.chain)
      throw new BadRequestException('Select a production wallet chain');
    if (ctx.environment === 'production' && dto.currency)
      throw new BadRequestException(
        'Production chain wallets have no fiat currency or simulated balance',
      );
    const walletConfig =
      ctx.environment === 'production' && walletProvider
        ? await this.providers.getProviderConfigForProject(
            ctx.projectId,
            walletProvider === 'turnkey'
              ? PROVIDER_TYPE_ENUM.TURNKEY
              : PROVIDER_TYPE_ENUM.PRIVY,
            ctx.environment,
          )
        : null;
    const created = await this.create(
      ctx,
      'wallets.create',
      key,
      dto,
      async (manager) => {
        if (dto.customer)
          await this.resource(ctx, dto.customer, 'customer', manager);
        return {
          kind: 'wallet',
          status: ctx.environment === 'sandbox' ? 'completed' : 'pending',
          currency: ctx.environment === 'sandbox' ? dto.currency : null,
          parentId: dto.customer ?? null,
          provider: walletProvider ?? null,
          details: {
            balance: ctx.environment === 'sandbox' ? '0' : null,
            chain: dto.chain,
            custody: ctx.environment === 'sandbox' ? 'simulated' : 'provider',
          },
        };
      },
    );
    if (!created.created || ctx.environment === 'sandbox') return created.item;
    const item = created.item;
    const provider = item.provider as WalletProvider | null;
    if (!provider) throw new BadRequestException('Wallet provider missing');
    try {
      const result = await this.walletAdapters.create(
        provider,
        walletConfig ?? {},
        {
          reference: item.id,
          chain: dto.chain!,
        },
      );
      return this.locked(ctx, async (manager) => {
        const current = await this.resource(ctx, item.id, 'wallet', manager);
        current.status = 'completed';
        current.providerReference = result.reference;
        current.details = {
          ...current.details,
          address: result.address,
          chain: result.chain,
        };
        await manager.save(current);
        await this.emit(manager, current, 'wallet.completed');
        return current;
      });
    } catch (error) {
      return this.providerFailure(ctx, item.id, error);
    }
  }
  async walletOperation(
    ctx: FinancialContext,
    operation: 'fund' | 'debit' | 'transfer',
    dto: AmountDto,
    key?: string,
    fromWallet?: string,
    toWallet?: string,
  ) {
    this.sandbox(ctx);
    const scenario = this.scenario(ctx, dto.scenario);
    return (
      await this.create(
        ctx,
        `wallets.${operation}`,
        key,
        { ...dto, fromWallet, toWallet },
        async (manager) => {
          if (fromWallet && fromWallet === toWallet)
            throw new BadRequestException('Source and destination must differ');
          const from = fromWallet
            ? await this.resource(ctx, fromWallet, 'wallet', manager)
            : null;
          const to = toWallet
            ? await this.resource(ctx, toWallet, 'wallet', manager)
            : null;
          if (!from && !to) throw new BadRequestException('Wallet is required');
          if (
            (from && from.currency !== dto.currency) ||
            (to && to.currency !== dto.currency)
          )
            throw new BadRequestException('Wallet currency mismatch');
          let status = this.scenarioStatus(scenario);
          const amount = BigInt(dto.amount);
          if (from && BigInt(String(from.details.balance)) < amount)
            status = 'failed';
          if (status !== 'failed' && from) {
            from.details.balance = (
              BigInt(String(from.details.balance)) - amount
            ).toString();
            await manager.save(from);
          }
          if (status === 'completed' && to) {
            to.details.balance = (
              BigInt(String(to.details.balance)) + amount
            ).toString();
            await manager.save(to);
          }
          return {
            kind: 'transfer',
            amount: dto.amount,
            currency: dto.currency,
            status,
            details: {
              operation,
              fromWallet,
              toWallet,
              reserved: Boolean(
                from && ['pending', 'unknown'].includes(status),
              ),
              scenario,
            },
          };
        },
      )
    ).item;
  }
  transfer(ctx: FinancialContext, dto: TransferDto, key?: string) {
    return this.walletOperation(
      ctx,
      'transfer',
      dto,
      key,
      dto.fromWallet,
      dto.toWallet,
    );
  }
  async simulate(
    ctx: FinancialContext,
    id: string,
    status: 'completed' | 'failed',
  ) {
    this.sandbox(ctx);
    return this.locked(ctx, async (manager) => {
      const item = await this.resource(ctx, id, undefined, manager);
      if (!['payment', 'refund', 'transfer'].includes(item.kind))
        throw new BadRequestException('Resource cannot be simulated');
      if (!['pending', 'unknown'].includes(item.status)) {
        if (item.status !== status)
          throw new ConflictException('Operation is already terminal');
        return item;
      }
      if (item.kind === 'transfer') {
        const target =
          status === 'completed'
            ? item.details.toWallet
            : item.details.reserved
              ? item.details.fromWallet
              : undefined;
        if (typeof target === 'string') {
          const wallet = await this.resource(ctx, target, 'wallet', manager);
          wallet.details.balance = (
            BigInt(String(wallet.details.balance)) + BigInt(item.amount ?? '0')
          ).toString();
          await manager.save(wallet);
        }
      }
      item.status = status;
      item.details.reserved = false;
      await manager.save(item);
      await this.emit(manager, item, `${item.kind}.${status}`);
      return item;
    });
  }
  async routingPolicy(ctx: FinancialContext) {
    const existing = await this.db.manager.findOne(FinancialRoutingPolicy, {
      where: { projectId: ctx.projectId, environment: ctx.environment },
    });
    return (
      existing ?? {
        id: null,
        projectId: ctx.projectId,
        environment: ctx.environment,
        strategy: 'best_success_rate',
        providerPriority: ['paystack', 'flutterwave'],
        requireHealthy: true,
        safeFailover: false,
      }
    );
  }
  async saveRoutingPolicy(ctx: FinancialContext, dto: RoutingPolicyDto) {
    return this.locked(ctx, async (manager) => {
      const existing = await manager.findOne(FinancialRoutingPolicy, {
        where: { projectId: ctx.projectId, environment: ctx.environment },
      });
      const policy = manager.create(FinancialRoutingPolicy, {
        ...(existing ?? {}),
        projectId: ctx.projectId,
        environment: ctx.environment,
        strategy: dto.strategy,
        providerPriority: dto.providerPriority,
        requireHealthy: dto.requireHealthy,
        safeFailover: dto.safeFailover,
      });
      const saved = await manager.save(policy);
      await this.log(
        ctx,
        'routing.policy.updated',
        'application',
        {
          policyId: saved.id,
          strategy: saved.strategy,
          providerPriority: saved.providerPriority,
        },
        manager,
      );
      return saved;
    });
  }
  async providerHealth(ctx: FinancialContext) {
    const records = await this.db.manager.find(FinancialProviderHealth, {
      where: { projectId: ctx.projectId, environment: ctx.environment },
    });
    const payments = await this.recentPayments(ctx);
    const integrations = await this.integrations(ctx);
    return paymentProviders.map((provider) => {
      const record = records.find((item) => item.provider === provider);
      const providerPayments = payments.filter(
        (item) => item.provider === provider,
      );
      const settledPayments = providerPayments.filter(
        (item) => item.status === 'completed' || item.status === 'failed',
      );
      const completed = settledPayments.filter(
        (item) => item.status === 'completed',
      ).length;
      const latencySamples = providerPayments
        .map((item) => item.details.providerLatencyMs)
        .filter(
          (value): value is number =>
            typeof value === 'number' && Number.isFinite(value) && value >= 0,
        )
        .sort((left, right) => left - right);
      return {
        provider,
        connected: integrations.some(
          (item) => String(item.provider) === provider && item.isActive,
        ),
        status: record?.status ?? 'unknown',
        successRate: settledPayments.length
          ? ((completed / settledPayments.length) * 100).toFixed(2)
          : null,
        settledCount: settledPayments.length,
        p95LatencyMs: latencySamples.length
          ? latencySamples[Math.ceil(latencySamples.length * 0.95) - 1]
          : null,
        latencyCount: latencySamples.length,
        estimatedFeeBps: record?.estimatedFeeBps ?? null,
        updatedAt: record?.updatedAt ?? null,
      };
    });
  }
  private recentPayments(ctx: FinancialContext) {
    return this.db.manager.find(FinancialResource, {
      where: {
        projectId: ctx.projectId,
        environment: ctx.environment,
        kind: 'payment',
      },
      order: { createdAt: 'DESC' },
      take: 1000,
    });
  }
  async saveProviderHealth(
    ctx: FinancialContext,
    provider: string,
    dto: ProviderHealthDto,
  ) {
    if (!paymentProviders.includes(provider as PaymentProvider))
      throw new BadRequestException('Unknown payment provider');
    return this.locked(ctx, async (manager) => {
      const existing = await manager.findOne(FinancialProviderHealth, {
        where: {
          projectId: ctx.projectId,
          environment: ctx.environment,
          provider: provider as PaymentProvider,
        },
      });
      const saved = await manager.save(
        manager.create(FinancialProviderHealth, {
          ...(existing ?? {}),
          projectId: ctx.projectId,
          environment: ctx.environment,
          provider: provider as PaymentProvider,
          status: dto.status,
          estimatedFeeBps:
            dto.estimatedFeeBps === undefined
              ? (existing?.estimatedFeeBps ?? null)
              : dto.estimatedFeeBps,
        }),
      );
      await this.log(
        ctx,
        'provider.health.updated',
        'application',
        {
          provider,
          status: saved.status,
          estimatedFeeBps: saved.estimatedFeeBps,
        },
        manager,
      );
      return saved;
    });
  }
  reconciliationRuns(ctx: FinancialContext) {
    return this.db.manager.find(FinancialReconciliationRun, {
      where: { projectId: ctx.projectId, environment: ctx.environment },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }
  async reconcile(ctx: FinancialContext) {
    if (ctx.environment !== 'production')
      throw new BadRequestException(
        'Provider reconciliation runs in production only',
      );
    const resources = await this.db.manager.find(FinancialResource, {
      where: {
        projectId: ctx.projectId,
        environment: ctx.environment,
        kind: In(['payment', 'refund']),
        status: In(['pending', 'unknown']),
      },
      order: { createdAt: 'ASC' },
      take: 100,
    });
    const run = await this.db.manager.save(
      FinancialReconciliationRun,
      this.db.manager.create(FinancialReconciliationRun, {
        projectId: ctx.projectId,
        environment: ctx.environment,
        requestId: ctx.requestId,
        status: 'running',
        inspected: resources.length,
        resourceIds: resources.map((item) => item.id),
      }),
    );
    let resolved = 0;
    for (const resource of resources) {
      try {
        const result =
          resource.kind === 'payment'
            ? await this.verify(ctx, resource.id)
            : await this.verifyRefund(ctx, resource.id);
        if (['completed', 'failed'].includes(result.status)) resolved += 1;
      } catch (error) {
        await this.log(ctx, 'reconciliation.inspect', 'provider', {
          resourceId: resource.id,
          outcome: 'unresolved',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    run.status = 'completed';
    run.resolved = resolved;
    run.unresolved = resources.length - resolved;
    await this.db.manager.save(run);
    await this.log(ctx, 'reconciliation.completed', 'application', {
      runId: run.id,
      inspected: run.inspected,
      resolved,
      unresolved: run.unresolved,
    });
    return run;
  }
  async metrics(ctx: FinancialContext) {
    const scope = [ctx.projectId, ctx.environment];
    const resources = await this.db.manager.find(FinancialResource, {
      where: { projectId: ctx.projectId, environment: ctx.environment },
    });
    const operations = resources.filter((item) =>
      ['payment', 'refund', 'transfer'].includes(item.kind),
    );
    const successful = operations.filter(
      (item) => item.status === 'completed',
    ).length;
    const logs: Array<{ day: string; requests: number }> = await this.db.query(
      `SELECT to_char("createdAt", 'YYYY-MM-DD') AS day, count(*)::int AS requests FROM financial_logs WHERE "projectId"=$1 AND environment=$2 AND (operation LIKE 'GET %' OR operation LIKE 'POST %' OR operation LIKE 'DELETE %') GROUP BY day ORDER BY day`,
      scope,
    );
    const payments = resources.filter((item) => item.kind === 'payment');
    const volume = (items: FinancialResource[]) =>
      Number(
        items
          .filter(
            (item) => item.status === 'completed' && item.currency === 'NGN',
          )
          .reduce((sum, item) => sum + BigInt(item.amount ?? '0'), 0n),
      ) / 100;
    const months = [
      ...new Set(
        payments.map((item) => item.createdAt.toISOString().slice(0, 7)),
      ),
    ].sort();
    return {
      totals: {
        apiRequests: logs.reduce((sum, item) => sum + item.requests, 0),
        successfulTransactions: successful,
        failedTransactions: operations.filter(
          (item) => item.status === 'failed',
        ).length,
        unknownTransactions: operations.filter(
          (item) => item.status === 'unknown',
        ).length,
        activeWallets: resources.filter((item) => item.kind === 'wallet')
          .length,
        transactionVolume: volume(payments),
        successRate: operations.length
          ? (successful / operations.length) * 100
          : 0,
      },
      providerPerformance: paymentProviders.map((provider) => {
        const items = payments.filter((item) => item.provider === provider);
        const completed = items.filter(
          (item) => item.status === 'completed',
        ).length;
        return {
          provider,
          total: items.length,
          successful: completed,
          failed: items.filter((item) => item.status === 'failed').length,
          successRate: items.length ? (completed / items.length) * 100 : 0,
        };
      }),
      monthlyTransactionVolume: months.map((month) => ({
        month,
        value: volume(
          payments.filter((item) =>
            item.createdAt.toISOString().startsWith(month),
          ),
        ),
      })),
      apiUsage: logs,
    };
  }
}
