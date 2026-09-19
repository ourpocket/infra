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
import { section, stringValue, unavailableSection } from '../shared/overview';
import {
  ProviderActivityItem,
  ProviderActivityQuery,
  ProviderOperationsAdapter,
  ProviderOverview,
} from '../operations';

const scalar = z.union([z.string(), z.number()]);
const terminalRefund = /^completed-(bank-transfer|momo|mpgs|offline|preauth)$/;

export class FlutterwaveAdapter
  implements PaymentProviderAdapter, ProviderOperationsAdapter
{
  readonly id = PROVIDER_TYPE_ENUM.FLUTTERWAVE;
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
    const data = await this.http.request(
      key,
      'POST',
      '/accounts/resolve',
      z.object({
        account_name: z.string(),
        account_number: z.string().optional(),
      }),
      { account_number: input.accountNumber, account_bank: input.bankCode },
    );
    return {
      accountName: data.account_name,
      accountNumber: data.account_number ?? input.accountNumber,
      bankCode: input.bankCode,
    };
  }

  async createRecipient(key: string, input: Record<string, unknown>) {
    return this.http.request(
      key,
      'POST',
      '/beneficiaries',
      z.object({}).passthrough(),
      input,
    );
  }

  async getRecipient(key: string, reference: string) {
    return this.http.request(
      key,
      'GET',
      `/beneficiaries/${encodeURIComponent(reference)}`,
      z.object({}).passthrough(),
    );
  }

  async createPayout(key: string, input: Record<string, unknown>) {
    const amount = this.writeAmount(input.amount, input.currency);
    return this.http.request(
      key,
      'POST',
      '/transfers',
      z.object({}).passthrough(),
      { ...input, amount },
    );
  }

  async getPayout(key: string, reference: string) {
    return this.http.request(
      key,
      'GET',
      `/transfers/${encodeURIComponent(reference)}`,
      z.object({}).passthrough(),
    );
  }

  async createVirtualAccount(key: string, input: Record<string, unknown>) {
    const amount = this.writeAmount(input.amount, input.currency);
    return this.http.request(
      key,
      'POST',
      '/virtual-account-numbers',
      z.object({}).passthrough(),
      { ...input, amount },
    );
  }

  async getVirtualAccount(key: string, reference: string) {
    return this.http.request(
      key,
      'GET',
      `/virtual-account-numbers/${encodeURIComponent(reference)}`,
      z.object({}).passthrough(),
    );
  }

  async overview(
    key: string,
    query: ProviderActivityQuery,
  ): Promise<ProviderOverview> {
    const filters = new URLSearchParams({
      page: String(query.page),
      page_size: String(query.limit),
      ...(query.from ? { from: query.from } : {}),
      ...(query.to ? { to: query.to } : {}),
    });
    const [balances, totals, payments, payouts] = await Promise.all([
      section(async () => {
        const values = await this.http.request(
          key,
          'GET',
          '/balances',
          z.array(
            z.object({
              currency: z.string(),
              available_balance: scalar.optional(),
              ledger_balance: scalar.optional(),
              available: scalar.optional(),
              ledger: scalar.optional(),
            }),
          ),
        );
        return values.map((balance) => ({
          currency: balance.currency,
          available: stringValue(
            balance.available_balance ?? balance.available,
          ),
          ledger: stringValue(balance.ledger_balance ?? balance.ledger),
        }));
      }),
      section(async () => {
        const records = await this.http.request(
          key,
          'GET',
          `/transactions?${filters}`,
          z.array(z.object({}).passthrough()),
        );
        return {
          transactionCount: records.length,
          // Flutterwave returns values in major units. A client-side sum here
          // would lose decimal precision and misrepresent multi-currency data.
          volumeByCurrency: [],
          pendingPayouts: null,
        };
      }),
      section(async () => this.activity(key, `/transactions?${filters}`)),
      section(async () => this.activity(key, `/transfers?${filters}`)),
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
      virtualAccounts: unavailableSection(
        new Error(
          'Flutterwave does not provide a general virtual account listing endpoint',
        ),
      ),
    };
  }

  private async activity(
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
      id: stringValue(record.id) ?? stringValue(record.tx_ref) ?? 'unknown',
      reference: stringValue(record.tx_ref) ?? stringValue(record.reference),
      status: stringValue(record.status) ?? 'unknown',
      amount: stringValue(record.amount),
      currency: stringValue(record.currency),
      occurredAt:
        stringValue(record.created_at) ?? stringValue(record.createdAt),
      channel: stringValue(record.payment_type),
    }));
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

  private writeAmount(amount: unknown, currency: unknown): string {
    if (typeof amount !== 'string' || typeof currency !== 'string')
      throw new BadGatewayException('Provider payout amount is invalid');
    return minorToMajor(amount, currency);
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
