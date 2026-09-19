import { BadGatewayException } from '@nestjs/common';
import { createHmac } from 'node:crypto';
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
  RefundResult,
  RefundVerification,
} from '../contracts';
import { ProviderHttpClient } from '../shared/http-client';

const scalar = z.union([z.string(), z.number()]);

export class PaystackAdapter implements PaymentProviderAdapter {
  readonly id = PROVIDER_TYPE_ENUM.PAYSTACK;
  readonly capabilities = new Set<ProviderCapability>([
    ProviderCapability.HostedCheckout,
    ProviderCapability.PaymentVerification,
    ProviderCapability.Refunds,
  ]);
  private readonly http = new ProviderHttpClient(
    'https://api.paystack.co',
    (key) => ({ Authorization: `Bearer ${key}` }),
  );

  async create(key: string, input: CheckoutInput): Promise<CheckoutResult> {
    const data = await this.http.request(
      key,
      'POST',
      '/transaction/initialize',
      z.object({ authorization_url: z.string().url(), reference: z.string() }),
      {
        reference: input.reference,
        amount: input.amount,
        currency: input.currency,
        email: input.contact.email,
        callback_url: input.callbackUrl,
        metadata: input.description
          ? { description: input.description }
          : undefined,
      },
    );
    return { reference: data.reference, checkoutUrl: data.authorization_url };
  }

  async verify(key: string, reference: string): Promise<PaymentVerification> {
    const data = await this.http.request(
      key,
      'GET',
      `/transaction/verify/${encodeURIComponent(reference)}`,
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
        data.status === 'success'
          ? 'completed'
          : data.status === 'failed'
            ? 'failed'
            : 'pending',
    };
  }

  async refund(
    key: string,
    paymentReference: string,
    amount: string,
    currency: string,
  ): Promise<RefundResult> {
    const data = await this.http.request(
      key,
      'POST',
      '/refund',
      z.object({ id: scalar, status: z.string() }),
      { transaction: paymentReference, amount, currency },
    );
    return {
      reference: String(data.id),
      status:
        data.status === 'processed'
          ? 'completed'
          : data.status === 'failed'
            ? 'failed'
            : 'pending',
    };
  }

  async verifyRefund(
    key: string,
    reference: string,
    _currency: string,
  ): Promise<RefundVerification> {
    const data = await this.http.request(
      key,
      'GET',
      `/refund/${encodeURIComponent(reference)}`,
      z.object({
        id: scalar,
        status: z.string(),
        amount: scalar,
        currency: z.string(),
        transaction: scalar,
      }),
    );
    if (typeof data.amount === 'number' && !Number.isSafeInteger(data.amount))
      throw new BadGatewayException('Unsafe provider amount');
    return {
      reference: String(data.id),
      status:
        data.status === 'processed'
          ? 'completed'
          : data.status === 'failed'
            ? 'failed'
            : 'pending',
      amount: String(data.amount),
      currency: data.currency,
      paymentReference: String(data.transaction),
    };
  }

  async validateConnection(key: string): Promise<ProviderConnectionValidation> {
    await this.http.request(key, 'GET', '/balance', z.unknown());
    return { capabilities: [...this.capabilities] };
  }

  verifyWebhook(
    raw: Buffer,
    headers: Record<string, string | undefined>,
    config: Record<string, unknown>,
  ): boolean {
    const apiKey = config.apiKey;
    if (typeof apiKey !== 'string' || !apiKey) return false;
    return equalSignature(
      createHmac('sha512', apiKey).update(raw).digest('hex'),
      headers['x-paystack-signature'],
    );
  }
}
