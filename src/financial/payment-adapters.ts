import { Injectable } from '@nestjs/common';
import {
  CheckoutInput,
  CheckoutResult,
  PaymentProviderId,
  PaymentVerification,
  RefundResult,
  RefundVerification,
} from '../providers/contracts';
import { ProviderRegistry } from '../providers/provider-registry';

export type {
  CheckoutInput,
  CheckoutResult,
  PaymentVerification,
  RefundResult,
} from '../providers/contracts';

@Injectable()
export class PaymentAdapters {
  constructor(
    private readonly providers: ProviderRegistry = new ProviderRegistry(),
  ) {}

  create(
    provider: PaymentProviderId,
    key: string,
    input: CheckoutInput,
  ): Promise<CheckoutResult> {
    return this.providers.adapter(provider).create(key, input);
  }

  verify(
    provider: PaymentProviderId,
    key: string,
    reference: string,
  ): Promise<PaymentVerification> {
    return this.providers.adapter(provider).verify(key, reference);
  }

  async refund(
    provider: PaymentProviderId,
    key: string,
    paymentReference: string,
    amount: string,
    currency: string,
  ): Promise<RefundResult> {
    const adapter = this.providers.adapter(provider);
    if (!adapter.refund)
      throw new Error(`${provider} refunds are not available`);
    return adapter.refund(key, paymentReference, amount, currency);
  }

  async verifyRefund(
    provider: PaymentProviderId,
    key: string,
    reference: string,
    currency: string,
  ): Promise<RefundVerification> {
    const adapter = this.providers.adapter(provider);
    if (!adapter.verifyRefund)
      throw new Error(`${provider} refund verification is not available`);
    return adapter.verifyRefund(key, reference, currency);
  }
}
