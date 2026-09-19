import { GoneException } from '@nestjs/common';
import { FinancialService } from '../../src/financial/financial.service';
import { ProviderRegistry } from '../../src/providers/provider-registry';

describe('stateless production provider flow', () => {
  const context = {
    projectId: '00000000-0000-4000-8000-000000000001',
    environment: 'production' as const,
    requestId: '00000000-0000-4000-8000-000000000002',
  };

  function service() {
    const db = {
      manager: {
        find: jest
          .fn()
          .mockResolvedValue([
            { type: 'paystack', isActive: true, isVerified: true },
          ]),
      },
      transaction: jest.fn(),
    };
    const connections = {
      getProviderConfigForProject: jest
        .fn()
        .mockResolvedValue({ apiKey: 'sk_test_fixture' }),
    };
    const adapters = {
      create: jest.fn().mockResolvedValue({
        reference: 'checkout-0001',
        checkoutUrl: 'https://checkout.provider.example/session',
      }),
    };
    return {
      db,
      adapters,
      financial: new FinancialService(
        db as never,
        connections as never,
        adapters as never,
        {} as never,
        new ProviderRegistry(),
      ),
    };
  }

  it('forwards checkout contact transiently and does not write a production resource', async () => {
    const { financial, db, adapters } = service();
    await expect(
      financial.payment(context, {
        provider: 'paystack',
        reference: 'checkout-0001',
        amount: '50000',
        currency: 'NGN',
        contact: { email: 'buyer@example.test', name: 'Buyer' },
        callbackUrl: 'https://merchant.example.test/return',
      }),
    ).resolves.toEqual({
      provider: 'paystack',
      reference: 'checkout-0001',
      checkoutUrl: 'https://checkout.provider.example/session',
    });
    expect(adapters.create).toHaveBeenCalledWith(
      'paystack',
      'sk_test_fixture',
      expect.objectContaining({
        contact: { email: 'buyer@example.test', name: 'Buyer' },
      }),
    );
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it('rejects customer record creation', async () => {
    const { financial } = service();
    await expect(
      financial.customer(context, { email: 'buyer@example.test' }),
    ).rejects.toBeInstanceOf(GoneException);
  });
});
