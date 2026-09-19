import { BadGatewayException } from '@nestjs/common';
import { z } from 'zod';
import { PROVIDER_TYPE_ENUM } from '../../enums';
import { equalSignature } from '../../financial/financial-utils';
import {
  CheckoutInput,
  CheckoutResult,
  PaymentProviderAdapter,
  PaymentVerification,
  ProviderCapability,
  ProviderConnectionValidation,
} from '../contracts';
import { ProviderHttpClient } from '../shared/http-client';
import { ProviderOperationsAdapter } from '../operations';

const scalar = z.union([z.string(), z.number()]);

export class MonoAdapter
  implements PaymentProviderAdapter, ProviderOperationsAdapter
{
  readonly id = PROVIDER_TYPE_ENUM.MONO;
  readonly capabilities = new Set<ProviderCapability>([
    ProviderCapability.HostedCheckout,
    ProviderCapability.PaymentVerification,
  ]);
  readonly operations = new Set<string>();
  private readonly http = new ProviderHttpClient(
    'https://api.withmono.com/v2',
    (key) => ({
      'mono-sec-key': key,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    }),
  );

  async create(key: string, input: CheckoutInput): Promise<CheckoutResult> {
    if (!input.callbackUrl)
      throw new BadGatewayException('Mono requires a callback URL');
    const data = await this.http.request(
      key,
      'POST',
      '/payments/initiate',
      z.object({ mono_url: z.string().url(), reference: z.string() }),
      {
        amount: this.safeAmount(input.amount),
        type: 'onetime-debit',
        method: 'account',
        description: input.description ?? 'Payment',
        reference: input.reference,
        redirect_url: input.callbackUrl,
        customer: {
          email: input.contact.email,
          name: input.contact.name ?? 'Customer',
        },
      },
    );
    return { reference: data.reference, checkoutUrl: data.mono_url };
  }

  async verify(key: string, reference: string): Promise<PaymentVerification> {
    const data = await this.http.request(
      key,
      'GET',
      `/payments/verify/${encodeURIComponent(reference)}`,
      z.object({
        id: scalar,
        reference: z.string(),
        amount: scalar,
        currency: z.string(),
        status: z.string(),
      }),
    );
    if (typeof data.amount === 'number' && !Number.isSafeInteger(data.amount))
      throw new BadGatewayException('Unsafe provider amount');
    return {
      reference: data.reference,
      providerReference: String(data.id),
      amount: String(data.amount),
      currency: data.currency,
      status:
        data.status === 'successful'
          ? 'completed'
          : ['failed', 'cancelled', 'abandoned'].includes(data.status)
            ? 'failed'
            : 'pending',
    };
  }

  async validateConnection(key: string): Promise<ProviderConnectionValidation> {
    await this.http.request(key, 'GET', '/accounts', z.unknown());
    return { capabilities: [...this.capabilities] };
  }

  verifyWebhook(
    _raw: Buffer,
    headers: Record<string, string | undefined>,
    config: Record<string, unknown>,
  ): boolean {
    const secret = config.webhookSecret;
    return (
      typeof secret === 'string' &&
      secret.length > 0 &&
      equalSignature(secret, headers['mono-webhook-secret'])
    );
  }

  private safeAmount(amount: string): number {
    const value = BigInt(amount);
    if (value > BigInt(Number.MAX_SAFE_INTEGER))
      throw new BadGatewayException('Amount exceeds Mono safe integer limit');
    return Number(value);
  }
}
