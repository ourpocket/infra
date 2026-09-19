import { BadGatewayException } from '@nestjs/common';
import { z } from 'zod';
import { PROVIDER_TYPE_ENUM } from '../../enums';
import {
  equalSignature,
  majorToMinor,
  minorToMajor,
} from '../../financial/financial-utils';
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
const terminalRefund = /^completed-(bank-transfer|momo|mpgs|offline|preauth)$/;

export class FlutterwaveAdapter implements PaymentProviderAdapter {
  readonly id = PROVIDER_TYPE_ENUM.FLUTTERWAVE;
  readonly capabilities = new Set<ProviderCapability>([
    ProviderCapability.HostedCheckout,
    ProviderCapability.PaymentVerification,
    ProviderCapability.Refunds,
  ]);
  private readonly http = new ProviderHttpClient(
    'https://api.flutterwave.com/v3',
    (key) => ({ Authorization: `Bearer ${key}` }),
  );

  async create(key: string, input: CheckoutInput): Promise<CheckoutResult> {
    if (!input.callbackUrl)
      throw new BadGatewayException('Flutterwave requires a callback URL');
    const data = await this.http.request(
      key,
      'POST',
      '/payments',
      z.object({ link: z.string().url() }),
      {
        tx_ref: input.reference,
        amount: minorToMajor(input.amount, input.currency),
        currency: input.currency,
        redirect_url: input.callbackUrl,
        customer: { email: input.contact.email, name: input.contact.name },
        customizations: input.description
          ? { title: input.description }
          : undefined,
      },
    );
    return { reference: input.reference, checkoutUrl: data.link };
  }

  async verify(key: string, reference: string): Promise<PaymentVerification> {
    const data = await this.http.request(
      key,
      'GET',
      `/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`,
      z.object({
        id: scalar,
        tx_ref: z.string(),
        amount: scalar,
        currency: z.string(),
        status: z.string(),
      }),
    );
    return {
      reference: data.tx_ref,
      providerReference: String(data.id),
      amount: this.majorToMinor(data.amount, data.currency),
      currency: data.currency,
      status:
        data.status === 'successful'
          ? 'completed'
          : ['failed', 'cancelled', 'abandoned'].includes(data.status)
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
      `/transactions/${encodeURIComponent(paymentReference)}/refund`,
      z.object({ id: scalar, status: z.string() }),
      { amount: minorToMajor(amount, currency) },
    );
    return {
      reference: String(data.id),
      status: this.refundStatus(data.status),
    };
  }

  async verifyRefund(
    key: string,
    reference: string,
    currency: string,
  ): Promise<RefundVerification> {
    const data = await this.http.request(
      key,
      'GET',
      `/refunds/${encodeURIComponent(reference)}`,
      z.object({
        id: scalar,
        status: z.string(),
        amount_refunded: scalar.optional(),
        AmountRefunded: scalar.optional(),
        currency: z.string().optional(),
        tx_id: scalar.optional(),
        TransactionId: scalar.optional(),
      }),
    );
    const amount = data.amount_refunded ?? data.AmountRefunded;
    const paymentReference = data.tx_id ?? data.TransactionId;
    if (amount === undefined || paymentReference === undefined)
      throw new BadGatewayException('Refund verification fields missing');
    const resolvedCurrency = data.currency ?? currency;
    return {
      reference: String(data.id),
      status: this.refundStatus(data.status),
      amount: this.majorToMinor(amount, resolvedCurrency),
      currency: resolvedCurrency,
      paymentReference: String(paymentReference),
    };
  }

  async validateConnection(key: string): Promise<ProviderConnectionValidation> {
    await this.http.request(key, 'GET', '/balances', z.unknown());
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
      equalSignature(secret, headers['verif-hash'])
    );
  }

  private majorToMinor(amount: string | number, currency: string): string {
    try {
      return majorToMinor(amount, currency);
    } catch {
      throw new BadGatewayException('Provider returned an invalid amount');
    }
  }

  private refundStatus(status: string): 'completed' | 'failed' | 'pending' {
    return terminalRefund.test(status)
      ? 'completed'
      : /^failed/.test(status)
        ? 'failed'
        : 'pending';
  }
}
