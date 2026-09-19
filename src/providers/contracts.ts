import { z } from 'zod';
import { PROVIDER_TYPE_ENUM } from '../enums';
import { OperationStatus } from '../financial/financial.entity';

export const PAYMENT_PROVIDER_IDS = [
  PROVIDER_TYPE_ENUM.PAYSTACK,
  PROVIDER_TYPE_ENUM.FLUTTERWAVE,
  PROVIDER_TYPE_ENUM.MONO,
] as const;

export type PaymentProviderId = 'paystack' | 'flutterwave' | 'mono';

export enum ProviderCapability {
  HostedCheckout = 'hosted_checkout',
  PaymentVerification = 'payment_verification',
  Refunds = 'refunds',
  Payouts = 'payouts',
  VirtualAccounts = 'virtual_accounts',
  RecurringPayments = 'recurring_payments',
  AccountLinking = 'account_linking',
  FinancialData = 'financial_data',
  IdentityVerification = 'identity_verification',
  AccountResolution = 'account_resolution',
  PayoutRecipients = 'payout_recipients',
  ProviderActivity = 'provider_activity',
}

export const checkoutContactSchema = z.object({
  email: z.string().email(),
  name: z.string().trim().min(1).max(120).optional(),
});

export type CheckoutContact = z.infer<typeof checkoutContactSchema>;

export interface CheckoutInput {
  reference: string;
  amount: string;
  currency: string;
  contact: CheckoutContact;
  callbackUrl?: string;
  description?: string;
}

export interface CheckoutResult {
  reference: string;
  checkoutUrl: string;
}

export interface PaymentVerification {
  reference: string;
  providerReference: string;
  amount: string;
  currency: string;
  status: OperationStatus;
}

export interface RefundResult {
  reference: string;
  status: OperationStatus;
}

export interface RefundVerification extends RefundResult {
  amount: string;
  currency: string;
  paymentReference: string;
}

export interface ProviderConnectionValidation {
  capabilities: readonly ProviderCapability[];
}

export interface PaymentProviderAdapter {
  readonly id: PaymentProviderId;
  readonly capabilities: ReadonlySet<ProviderCapability>;
  create(key: string, input: CheckoutInput): Promise<CheckoutResult>;
  verify(key: string, reference: string): Promise<PaymentVerification>;
  refund?(
    key: string,
    paymentReference: string,
    amount: string,
    currency: string,
  ): Promise<RefundResult>;
  verifyRefund?(
    key: string,
    reference: string,
    currency: string,
  ): Promise<RefundVerification>;
  validateConnection(key: string): Promise<ProviderConnectionValidation>;
  verifyWebhook(
    raw: Buffer,
    headers: Record<string, string | undefined>,
    config: Record<string, unknown>,
  ): boolean;
}

export function isPaymentProviderId(value: string): value is PaymentProviderId {
  return (PAYMENT_PROVIDER_IDS as readonly string[]).includes(value);
}
