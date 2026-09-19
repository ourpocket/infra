import {
  BadRequestException,
  Injectable,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { z } from 'zod';
import { PROVIDER_TYPE_ENUM } from '../enums';
import { FlutterwaveAdapter } from './flutterwave/flutterwave.adapter';
import { MonoAdapter } from './mono/mono.adapter';
import { PaystackAdapter } from './paystack/paystack.adapter';
import { ProviderOperationsAdapter } from './operations';
import {
  PaymentProviderAdapter,
  PaymentProviderId,
  ProviderCapability,
  isPaymentProviderId,
} from './contracts';

const providerConfigSchemas = {
  [PROVIDER_TYPE_ENUM.PAYSTACK]: z
    .object({
      apiKey: z.string().trim().min(1),
      webhookSecret: z.string().trim().min(1).optional(),
    })
    .passthrough(),
  [PROVIDER_TYPE_ENUM.FLUTTERWAVE]: z
    .object({
      apiKey: z.string().trim().min(1),
      webhookSecret: z.string().trim().min(1),
    })
    .passthrough(),
  [PROVIDER_TYPE_ENUM.MONO]: z
    .object({
      secretKey: z.string().trim().min(1),
      webhookSecret: z.string().trim().min(1),
    })
    .passthrough(),
} as const;

export interface ProviderDefinition {
  readonly id: PaymentProviderId;
  readonly capabilities: ReadonlySet<ProviderCapability>;
  readonly requiredCredentialKeys: readonly string[];
}

@Injectable()
export class ProviderRegistry {
  private readonly adapters = new Map<
    PaymentProviderId,
    PaymentProviderAdapter & ProviderOperationsAdapter
  >([
    [PROVIDER_TYPE_ENUM.PAYSTACK, new PaystackAdapter()],
    [PROVIDER_TYPE_ENUM.FLUTTERWAVE, new FlutterwaveAdapter()],
    [PROVIDER_TYPE_ENUM.MONO, new MonoAdapter()],
  ]);

  readonly definitions: readonly ProviderDefinition[] = [
    ...this.adapters.values(),
  ].map((adapter) => ({
    id: adapter.id,
    capabilities: adapter.capabilities,
    requiredCredentialKeys:
      adapter.id === 'paystack'
        ? ['apiKey']
        : adapter.id === 'flutterwave'
          ? ['apiKey', 'webhookSecret']
          : ['secretKey', 'webhookSecret'],
  }));

  adapter(id: PaymentProviderId): PaymentProviderAdapter {
    const adapter = this.adapters.get(id);
    if (!adapter) throw new BadRequestException('Unsupported payment provider');
    return adapter;
  }

  operations(id: PaymentProviderId): ProviderOperationsAdapter {
    const adapter = this.adapters.get(id);
    if (!adapter) throw new BadRequestException('Unsupported payment provider');
    return adapter;
  }

  assertCapability(
    id: PaymentProviderId,
    capability: ProviderCapability,
  ): void {
    if (!this.adapter(id).capabilities.has(capability))
      throw new UnsupportedMediaTypeException({
        code: 'capability_unavailable',
        provider: id,
        capability,
        message: `${id} does not support ${capability} through OurPocket`,
      });
  }

  parseConfig(
    id: PaymentProviderId,
    config: Record<string, unknown>,
  ): Record<string, unknown> {
    const parsed = providerConfigSchemas[id].safeParse(config);
    if (!parsed.success)
      throw new BadRequestException({
        code: 'invalid_provider_configuration',
        provider: id,
        message: 'Provider credentials are incomplete or invalid',
      });
    return parsed.data;
  }

  apiKey(id: PaymentProviderId, config: Record<string, unknown>): string {
    const parsed = this.parseConfig(id, config);
    const key = id === 'mono' ? parsed.secretKey : parsed.apiKey;
    if (typeof key !== 'string')
      throw new BadRequestException('Provider API key is missing');
    return key;
  }

  isPaymentProvider(value: string): value is PaymentProviderId {
    return isPaymentProviderId(value);
  }
}
