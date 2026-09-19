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
import { maskedAccountNumber, section, stringValue } from '../shared/overview';
import {
  ProviderActivityItem,
  ProviderActivityQuery,
  ProviderOperationsAdapter,
  ProviderOverview,
} from '../operations';

const scalar = z.union([z.string(), z.number()]);

export class PaystackAdapter
  implements PaymentProviderAdapter, ProviderOperationsAdapter
{
  readonly id = PROVIDER_TYPE_ENUM.PAYSTACK;
  readonly capabilities = new Set<ProviderCapability>([
    ProviderCapability.HostedCheckout,
    ProviderCapability.PaymentVerification,
    ProviderCapability.Refunds,
    ProviderCapability.AccountResolution,
    ProviderCapability.PayoutRecipients,
    ProviderCapability.Payouts,
    ProviderCapability.VirtualAccounts,
    ProviderCapability.ProviderActivity,
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

  readonly operations = new Set([
    'account_resolution',
    'payout_recipients',
    'payouts',
    'virtual_accounts',
    'provider_activity',
  ]);

  async resolveAccount(
    key: string,
    input: { accountNumber: string; bankCode: string },
  ) {
    const query = new URLSearchParams({
      account_number: input.accountNumber,
      bank_code: input.bankCode,
    });
    const data = await this.http.request(
      key,
      'GET',
      `/bank/resolve?${query}`,
      z.object({ account_name: z.string(), account_number: z.string() }),
    );
    return {
      accountName: data.account_name,
      accountNumber: data.account_number,
      bankCode: input.bankCode,
    };
  }

  async createRecipient(key: string, input: Record<string, unknown>) {
    return this.http.request(
      key,
      'POST',
      '/transferrecipient',
      z.object({}).passthrough(),
      input,
    );
  }

  async getRecipient(key: string, reference: string) {
    return this.http.request(
      key,
      'GET',
      `/transferrecipient/${encodeURIComponent(reference)}`,
      z.object({}).passthrough(),
    );
  }

  async createPayout(key: string, input: Record<string, unknown>) {
    return this.http.request(
      key,
      'POST',
      '/transfer',
      z.object({}).passthrough(),
      input,
    );
  }

  async getPayout(key: string, reference: string) {
    return this.http.request(
      key,
      'GET',
      `/transfer/verify/${encodeURIComponent(reference)}`,
      z.object({}).passthrough(),
    );
  }

  async createVirtualAccount(key: string, input: Record<string, unknown>) {
    return this.http.request(
      key,
      'POST',
      '/dedicated_account/assign',
      z.object({}).passthrough(),
      input,
    );
  }

  async getVirtualAccount(key: string, reference: string) {
    return this.http.request(
      key,
      'GET',
      `/dedicated_account/${encodeURIComponent(reference)}`,
      z.object({}).passthrough(),
    );
  }

  async requeryVirtualAccount(key: string, input: Record<string, unknown>) {
    const query = new URLSearchParams(
      Object.entries(input).flatMap(([name, value]) =>
        typeof value === 'string' ? [[name, value]] : [],
      ),
    );
    return this.http.request(
      key,
      'GET',
      `/dedicated_account/requery?${query}`,
      z.object({}).passthrough(),
    );
  }

  async overview(
    key: string,
    query: ProviderActivityQuery,
  ): Promise<ProviderOverview> {
    const filters = new URLSearchParams({
      page: String(query.page),
      perPage: String(query.limit),
      ...(query.from ? { from: query.from } : {}),
      ...(query.to ? { to: query.to } : {}),
    });
    const [balances, totals, payments, payouts, virtualAccounts] =
      await Promise.all([
        section(async () => {
          const data = await this.http.request(
            key,
            'GET',
            '/balance',
            z.union([
              z.array(z.object({ currency: z.string(), balance: scalar })),
              z.object({ currency: z.string(), balance: scalar }),
            ]),
          );
          return (Array.isArray(data) ? data : [data]).map((balance) => ({
            currency: balance.currency,
            available: stringValue(balance.balance),
            ledger: null,
          }));
        }),
        section(async () => {
          const data = await this.http.request(
            key,
            'GET',
            `/transaction/totals?${filters}`,
            z.object({
              total_transactions: z.number().optional(),
              total_volume_by_currency: z
                .array(z.object({ currency: z.string(), amount: scalar }))
                .optional(),
              pending_transfers: scalar.optional(),
            }),
          );
          return {
            transactionCount: data.total_transactions ?? null,
            volumeByCurrency: (data.total_volume_by_currency ?? []).map(
              (entry) => ({
                currency: entry.currency,
                amount: String(entry.amount),
              }),
            ),
            pendingPayouts:
              data.pending_transfers === undefined
                ? null
                : Number(data.pending_transfers),
          };
        }),
        section(async () =>
          this.paymentActivity(key, `/transaction?${filters}`),
        ),
        section(async () => this.paymentActivity(key, `/transfer?${filters}`)),
        section(async () => {
          const accounts = await this.http.request(
            key,
            'GET',
            `/dedicated_account?${filters}`,
            z.array(z.object({}).passthrough()),
          );
          return accounts.map((account) =>
            this.virtualAccountActivity(account),
          );
        }),
      ]);
    return {
      provider: this.id,
      fetchedAt: new Date().toISOString(),
      source: 'live',
      capabilities: [...this.capabilities],
      balances,
      totals,
      payments,
      payouts,
      virtualAccounts,
    };
  }

  private async paymentActivity(
    key: string,
    path: string,
  ): Promise<ProviderActivityItem[]> {
    const records = await this.http.request(
      key,
      'GET',
      path,
      z.array(z.object({}).passthrough()),
    );
    return records.map((record) => ({
      id: stringValue(record.id) ?? stringValue(record.reference) ?? 'unknown',
      reference: stringValue(record.reference),
      status: stringValue(record.status) ?? 'unknown',
      amount: stringValue(record.amount),
      currency: stringValue(record.currency),
      occurredAt:
        stringValue(record.created_at) ?? stringValue(record.createdAt),
      channel: stringValue(record.channel),
    }));
  }

  private virtualAccountActivity(record: Record<string, unknown>) {
    const bank = record.bank;
    const bankName =
      bank && typeof bank === 'object'
        ? stringValue((bank as Record<string, unknown>).name)
        : null;
    const accountNumber = stringValue(record.account_number);
    return {
      id: stringValue(record.id) ?? accountNumber ?? 'unknown',
      bankName,
      accountNumber: null,
      maskedAccountNumber: maskedAccountNumber(accountNumber),
      status: record.active === false ? 'inactive' : 'active',
      createdAt:
        stringValue(record.created_at) ?? stringValue(record.createdAt),
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
