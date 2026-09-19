import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ProjectProvider } from '../entities/project-provider.entity';
import { PROVIDER_TYPE_ENUM } from '../enums';
import { ProjectProviderService } from '../project/project-provider.service';
import { PaymentProviderId, ProviderCapability } from '../providers/contracts';
import {
  ProviderActivityQuery,
  ProviderOverview,
} from '../providers/operations';
import { ProviderRegistry } from '../providers/provider-registry';
import { FinancialContext } from './financial.service';

@Injectable()
export class ProviderOperationsService {
  constructor(
    private readonly db: DataSource,
    private readonly connections: ProjectProviderService,
    private readonly registry: ProviderRegistry,
  ) {}

  async resolveAccount(
    ctx: FinancialContext,
    provider: PaymentProviderId,
    input: { accountNumber: string; bankCode: string },
  ) {
    const adapter = await this.adapter(
      ctx,
      provider,
      ProviderCapability.AccountResolution,
    );
    if (!adapter.resolveAccount)
      throw new BadRequestException('Account resolution is unavailable');
    return adapter.resolveAccount(await this.key(ctx, provider), input);
  }

  async createRecipient(
    ctx: FinancialContext,
    provider: PaymentProviderId,
    input: Record<string, unknown>,
  ) {
    const adapter = await this.adapter(
      ctx,
      provider,
      ProviderCapability.PayoutRecipients,
    );
    if (!adapter.createRecipient)
      throw new BadRequestException('Recipients are unavailable');
    return adapter.createRecipient(await this.key(ctx, provider), input);
  }

  async getRecipient(
    ctx: FinancialContext,
    provider: PaymentProviderId,
    reference: string,
  ) {
    const adapter = await this.adapter(
      ctx,
      provider,
      ProviderCapability.PayoutRecipients,
    );
    if (!adapter.getRecipient)
      throw new BadRequestException('Recipients are unavailable');
    return adapter.getRecipient(await this.key(ctx, provider), reference);
  }

  async createPayout(
    ctx: FinancialContext,
    provider: PaymentProviderId,
    input: Record<string, unknown>,
  ) {
    const adapter = await this.adapter(
      ctx,
      provider,
      ProviderCapability.Payouts,
    );
    if (!adapter.createPayout)
      throw new BadRequestException('Payouts are unavailable');
    return adapter.createPayout(await this.key(ctx, provider), input);
  }

  async getPayout(
    ctx: FinancialContext,
    provider: PaymentProviderId,
    reference: string,
  ) {
    const adapter = await this.adapter(
      ctx,
      provider,
      ProviderCapability.Payouts,
    );
    if (!adapter.getPayout)
      throw new BadRequestException('Payouts are unavailable');
    return adapter.getPayout(await this.key(ctx, provider), reference);
  }

  async createVirtualAccount(
    ctx: FinancialContext,
    provider: PaymentProviderId,
    input: Record<string, unknown>,
  ) {
    const adapter = await this.adapter(
      ctx,
      provider,
      ProviderCapability.VirtualAccounts,
    );
    if (!adapter.createVirtualAccount)
      throw new BadRequestException('Virtual accounts are unavailable');
    return adapter.createVirtualAccount(await this.key(ctx, provider), input);
  }

  async getVirtualAccount(
    ctx: FinancialContext,
    provider: PaymentProviderId,
    reference: string,
  ) {
    const adapter = await this.adapter(
      ctx,
      provider,
      ProviderCapability.VirtualAccounts,
    );
    if (!adapter.getVirtualAccount)
      throw new BadRequestException('Virtual accounts are unavailable');
    return adapter.getVirtualAccount(await this.key(ctx, provider), reference);
  }

  async requeryPaystackVirtualAccount(
    ctx: FinancialContext,
    input: Record<string, unknown>,
  ) {
    const adapter = await this.adapter(
      ctx,
      'paystack',
      ProviderCapability.VirtualAccounts,
    );
    if (!adapter.requeryVirtualAccount)
      throw new BadRequestException('Virtual account requery is unavailable');
    return adapter.requeryVirtualAccount(
      await this.key(ctx, 'paystack'),
      input,
    );
  }

  async overview(
    ctx: FinancialContext,
    provider: PaymentProviderId,
    query: ProviderActivityQuery,
  ): Promise<ProviderOverview> {
    this.production(ctx);
    await this.connection(ctx, provider);
    const adapter = this.registry.operations(provider);
    if (!adapter.overview) {
      return {
        provider,
        fetchedAt: new Date().toISOString(),
        source: 'live',
        capabilities: [...this.registry.adapter(provider).capabilities],
        balances: {
          state: 'unavailable',
          data: null,
          message: 'Balances are unavailable for this provider.',
        },
        totals: {
          state: 'unavailable',
          data: null,
          message: 'Activity is unavailable for this provider.',
        },
        payments: {
          state: 'unavailable',
          data: null,
          message: 'Activity is unavailable for this provider.',
        },
        payouts: {
          state: 'unavailable',
          data: null,
          message: 'Payouts are unavailable for this provider.',
        },
        virtualAccounts: {
          state: 'unavailable',
          data: null,
          message: 'Virtual accounts are unavailable for this provider.',
        },
      };
    }
    return adapter.overview(await this.key(ctx, provider), query);
  }

  private async adapter(
    ctx: FinancialContext,
    provider: PaymentProviderId,
    capability: ProviderCapability,
  ) {
    this.production(ctx);
    await this.connection(ctx, provider);
    this.registry.assertCapability(provider, capability);
    return this.registry.operations(provider);
  }

  private production(ctx: FinancialContext): void {
    if (ctx.environment !== 'production')
      throw new BadRequestException('Provider operations are production-only');
  }

  private async connection(
    ctx: FinancialContext,
    provider: PaymentProviderId,
  ): Promise<void> {
    const connection = await this.db.manager.findOne(ProjectProvider, {
      where: {
        project: { id: ctx.projectId },
        type: provider as PROVIDER_TYPE_ENUM,
        environment: 'production',
        isActive: true,
        isVerified: true,
      },
    });
    if (!connection)
      throw new BadRequestException(
        'Provider is not connected and validated in production',
      );
  }

  private async key(
    ctx: FinancialContext,
    provider: PaymentProviderId,
  ): Promise<string> {
    const config = await this.connections.getProviderConfigForProject(
      ctx.projectId,
      provider as PROVIDER_TYPE_ENUM,
      'production',
    );
    return this.registry.apiKey(provider, config);
  }
}
