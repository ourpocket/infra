import { z } from 'zod';
import { PaymentProviderId } from './contracts';

export const providerActivityQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export type ProviderActivityQuery = z.infer<typeof providerActivityQuerySchema>;

export interface ProviderActivityItem {
  id: string;
  reference: string | null;
  status: string;
  amount: string | null;
  currency: string | null;
  occurredAt: string | null;
  channel?: string | null;
}

export interface ProviderAccountItem {
  id: string;
  bankName: string | null;
  accountNumber: string | null;
  maskedAccountNumber: string | null;
  status: string;
  createdAt: string | null;
}

export interface ProviderOverviewSection<T> {
  state: 'available' | 'unavailable';
  data: T | null;
  message?: string;
}

export interface ProviderOverview {
  provider: PaymentProviderId;
  fetchedAt: string;
  source: 'live';
  capabilities: readonly string[];
  balances: ProviderOverviewSection<
    Array<{ currency: string; available: string | null; ledger: string | null }>
  >;
  totals: ProviderOverviewSection<{
    transactionCount: number | null;
    volumeByCurrency: Array<{ currency: string; amount: string }>;
    pendingPayouts: number | null;
  }>;
  payments: ProviderOverviewSection<ProviderActivityItem[]>;
  payouts: ProviderOverviewSection<ProviderActivityItem[]>;
  virtualAccounts: ProviderOverviewSection<ProviderAccountItem[]>;
}

export interface ProviderOperationsAdapter {
  readonly operations: ReadonlySet<string>;
  resolveAccount?(
    key: string,
    input: { accountNumber: string; bankCode: string },
  ): Promise<{ accountName: string; accountNumber: string; bankCode: string }>;
  createRecipient?(
    key: string,
    input: Record<string, unknown>,
  ): Promise<Record<string, unknown>>;
  getRecipient?(
    key: string,
    reference: string,
  ): Promise<Record<string, unknown>>;
  createPayout?(
    key: string,
    input: Record<string, unknown>,
  ): Promise<Record<string, unknown>>;
  getPayout?(key: string, reference: string): Promise<Record<string, unknown>>;
  createVirtualAccount?(
    key: string,
    input: Record<string, unknown>,
  ): Promise<Record<string, unknown>>;
  getVirtualAccount?(
    key: string,
    reference: string,
  ): Promise<Record<string, unknown>>;
  requeryVirtualAccount?(
    key: string,
    input: Record<string, unknown>,
  ): Promise<Record<string, unknown>>;
  overview?(
    key: string,
    query: ProviderActivityQuery,
  ): Promise<ProviderOverview>;
}
