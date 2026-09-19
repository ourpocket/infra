import { BadGatewayException, Injectable } from '@nestjs/common';
import axios from 'axios';
import { z } from 'zod';
import { PaymentProvider, OperationStatus } from './financial.entity';
import { majorToMinor, minorToMajor } from './financial-utils';
function refundStatus(
  provider: PaymentProvider,
  status: string,
): OperationStatus {
  if (provider === 'paystack')
    return status === 'processed'
      ? 'completed'
      : status === 'failed'
        ? 'failed'
        : 'pending';
  // v3 'completed' means initiated, not disbursed. Only terminal success variants settle a refund.
  return /^completed-(bank-transfer|momo|mpgs|offline|preauth)$/.test(status)
    ? 'completed'
    : /^failed/.test(status)
      ? 'failed'
      : 'pending';
}
const scalar = z.union([z.string(), z.number()]);
const envelope = z.object({
  status: z.union([z.string(), z.boolean()]),
  data: z.unknown(),
});
export interface CheckoutInput {
  reference: string;
  amount: string;
  currency: string;
  email: string;
  name?: string;
  callbackUrl?: string;
}
export interface PaymentVerification {
  reference: string;
  providerReference: string;
  amount: string;
  currency: string;
  status: OperationStatus;
}
export interface CheckoutResult {
  reference: string;
  checkoutUrl: string;
}
export interface RefundResult {
  reference: string;
  status: OperationStatus;
}
@Injectable()
export class PaymentAdapters {
  private async request(
    provider: PaymentProvider,
    apiKey: string,
    method: 'GET' | 'POST',
    path: string,
    body?: unknown,
  ): Promise<unknown> {
    const response = await axios.request<unknown>({
      baseURL:
        provider === 'paystack'
          ? 'https://api.paystack.co'
          : 'https://api.flutterwave.com/v3',
      method,
      url: path,
      headers: { Authorization: `Bearer ${apiKey}` },
      data: body,
      timeout: 15000,
      maxRedirects: 0,
    });
    const parsed = envelope.parse(response.data);
    if (parsed.status !== true && parsed.status !== 'success')
      throw new BadGatewayException('Provider rejected operation');
    return parsed.data;
  }
  async create(
    provider: PaymentProvider,
    key: string,
    input: CheckoutInput,
  ): Promise<CheckoutResult> {
    if (provider === 'paystack') {
      const data = z
        .object({ authorization_url: z.string().url(), reference: z.string() })
        .parse(
          await this.request(provider, key, 'POST', '/transaction/initialize', {
            reference: input.reference,
            amount: input.amount,
            currency: input.currency,
            email: input.email,
            callback_url: input.callbackUrl,
          }),
        );
      return { reference: data.reference, checkoutUrl: data.authorization_url };
    }
    const data = z.object({ link: z.string().url() }).parse(
      await this.request(provider, key, 'POST', '/payments', {
        tx_ref: input.reference,
        amount: minorToMajor(input.amount, input.currency),
        currency: input.currency,
        redirect_url: input.callbackUrl,
        customer: { email: input.email, name: input.name },
      }),
    );
    return { reference: input.reference, checkoutUrl: data.link };
  }
  async verify(
    provider: PaymentProvider,
    key: string,
    reference: string,
  ): Promise<PaymentVerification> {
    const data = z
      .object({
        id: scalar,
        reference: z.string().optional(),
        tx_ref: z.string().optional(),
        amount: scalar,
        currency: z.string(),
        status: z.string(),
      })
      .parse(
        await this.request(
          provider,
          key,
          'GET',
          provider === 'paystack'
            ? `/transaction/verify/${encodeURIComponent(reference)}`
            : `/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`,
        ),
      );
    if (
      provider === 'paystack' &&
      typeof data.amount === 'number' &&
      !Number.isSafeInteger(data.amount)
    )
      throw new BadGatewayException('Unsafe provider amount');
    const resolved = data.reference ?? data.tx_ref;
    if (!resolved)
      throw new BadGatewayException('Provider response has no reference');
    return {
      reference: resolved,
      providerReference: String(data.id),
      amount:
        provider === 'paystack'
          ? String(data.amount)
          : majorToMinor(data.amount, data.currency),
      currency: data.currency,
      status:
        data.status === 'success' || data.status === 'successful'
          ? 'completed'
          : ['failed', 'cancelled', 'abandoned'].includes(data.status)
            ? 'failed'
            : 'pending',
    };
  }
  async refund(
    provider: PaymentProvider,
    key: string,
    paymentReference: string,
    amount: string,
    currency: string,
  ): Promise<RefundResult> {
    const data = z
      .object({ id: scalar, status: z.string() })
      .parse(
        await this.request(
          provider,
          key,
          'POST',
          provider === 'paystack'
            ? '/refund'
            : `/transactions/${encodeURIComponent(paymentReference)}/refund`,
          provider === 'paystack'
            ? { transaction: paymentReference, amount, currency }
            : { amount: minorToMajor(amount, currency) },
        ),
      );
    return {
      reference: String(data.id),
      status: refundStatus(provider, data.status),
    };
  }
  async verifyRefund(
    provider: PaymentProvider,
    key: string,
    reference: string,
    currency: string,
  ): Promise<
    RefundResult & {
      amount: string;
      currency: string;
      paymentReference: string;
    }
  > {
    const data = z
      .object({
        id: scalar,
        status: z.string(),
        amount: scalar.optional(),
        currency: z.string().optional(),
        transaction: scalar.optional(),
        amount_refunded: scalar.optional(),
        AmountRefunded: scalar.optional(),
        tx_id: scalar.optional(),
        TransactionId: scalar.optional(),
      })
      .parse(
        await this.request(
          provider,
          key,
          'GET',
          provider === 'paystack'
            ? `/refund/${encodeURIComponent(reference)}`
            : `/refunds/${encodeURIComponent(reference)}`,
        ),
      );
    const amount =
      provider === 'paystack'
        ? data.amount
        : (data.amount_refunded ?? data.AmountRefunded);
    const payment =
      provider === 'paystack'
        ? data.transaction
        : (data.tx_id ?? data.TransactionId);
    if (
      amount === undefined ||
      payment === undefined ||
      (provider === 'paystack' && data.currency === undefined)
    )
      throw new BadGatewayException('Refund verification fields missing');
    if (
      provider === 'paystack' &&
      typeof amount === 'number' &&
      !Number.isSafeInteger(amount)
    )
      throw new BadGatewayException('Unsafe provider amount');
    return {
      reference: String(data.id),
      status: refundStatus(provider, data.status),
      amount:
        provider === 'paystack'
          ? String(amount)
          : majorToMinor(amount, data.currency ?? currency),
      currency: data.currency ?? currency,
      paymentReference: String(payment),
    };
  }
}
