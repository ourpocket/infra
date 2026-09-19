// nock publishes with `export =`; this form preserves its callable CommonJS API in Jest.
// eslint-disable-next-line @typescript-eslint/no-require-imports
import nock = require('nock');
import { BadRequestException } from '@nestjs/common';
import { ProviderOperationsService } from '../../src/financial/provider-operations.service';
import { PaystackAdapter } from '../../src/providers/paystack/paystack.adapter';
import { ProviderRegistry } from '../../src/providers/provider-registry';

const context = {
  projectId: '00000000-0000-4000-8000-000000000001',
  environment: 'production' as const,
  requestId: '00000000-0000-4000-8000-000000000002',
};

describe('stateless provider operations', () => {
  afterEach(() => {
    expect(nock.isDone()).toBe(true);
    nock.cleanAll();
  });

  it('normalizes a Paystack account lookup without persisting provider data', async () => {
    const adapter = new PaystackAdapter();
    nock('https://api.paystack.co', {
      reqheaders: { authorization: 'Bearer fixture' },
    })
      .get('/bank/resolve')
      .query({ account_number: '0123456789', bank_code: '058' })
      .reply(200, {
        status: true,
        data: {
          account_name: 'Example account holder',
          account_number: '0123456789',
          bank_id: 58,
        },
      });

    await expect(
      adapter.resolveAccount('fixture', {
        accountNumber: '0123456789',
        bankCode: '058',
      }),
    ).resolves.toEqual({
      accountName: 'Example account holder',
      accountNumber: '0123456789',
      bankCode: '058',
    });
  });

  it('masks account numbers in a live Paystack overview and discards all response data after return', async () => {
    const adapter = new PaystackAdapter();
    const scope = nock('https://api.paystack.co');
    scope.get('/balance').reply(200, {
      status: true,
      data: [{ currency: 'NGN', balance: 20000 }],
    });
    scope
      .get('/transaction/totals')
      .query(true)
      .reply(200, {
        status: true,
        data: { total_transactions: 1, total_volume_by_currency: [] },
      });
    scope
      .get('/transaction')
      .query(true)
      .reply(200, {
        status: true,
        data: [
          {
            id: 1,
            reference: 'payment_1',
            status: 'success',
            amount: 20000,
            currency: 'NGN',
          },
        ],
      });
    scope.get('/transfer').query(true).reply(200, { status: true, data: [] });
    scope
      .get('/dedicated_account')
      .query(true)
      .reply(200, {
        status: true,
        data: [
          {
            id: 3,
            account_number: '0123456789',
            bank: { name: 'Provider Bank' },
            active: true,
          },
        ],
      });

    const overview = await adapter.overview('fixture', { page: 1, limit: 10 });
    expect(overview.virtualAccounts.data?.[0]).toMatchObject({
      accountNumber: null,
      maskedAccountNumber: '******6789',
      bankName: 'Provider Bank',
    });
    expect(JSON.stringify(overview)).not.toContain('0123456789');
  });

  it('checks an active production connection before a provider operation and never opens a write transaction', async () => {
    const db = {
      manager: { findOne: jest.fn().mockResolvedValue({ id: 'connection' }) },
      transaction: jest.fn(),
    };
    const connections = {
      getProviderConfigForProject: jest
        .fn()
        .mockResolvedValue({ apiKey: 'fixture' }),
    };
    const registry = new ProviderRegistry();
    const service = new ProviderOperationsService(
      db as never,
      connections as never,
      registry,
    );
    nock('https://api.paystack.co')
      .get('/bank/resolve')
      .query({ account_number: '0123456789', bank_code: '058' })
      .reply(200, {
        status: true,
        data: { account_name: 'Holder', account_number: '0123456789' },
      });

    await service.resolveAccount(context, 'paystack', {
      accountNumber: '0123456789',
      bankCode: '058',
    });
    expect(db.transaction).not.toHaveBeenCalled();
    expect(db.manager.findOne).toHaveBeenCalledTimes(1);
  });

  it('rejects Sandbox before making an external provider request', async () => {
    const service = new ProviderOperationsService(
      { manager: { findOne: jest.fn() } } as never,
      {} as never,
      new ProviderRegistry(),
    );
    await expect(
      service.resolveAccount(
        { ...context, environment: 'sandbox' },
        'paystack',
        {
          accountNumber: '0123456789',
          bankCode: '058',
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
