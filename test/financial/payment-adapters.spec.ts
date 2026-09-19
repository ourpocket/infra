// nock publishes with `export =`; this form preserves its callable CommonJS API in Jest.
// eslint-disable-next-line @typescript-eslint/no-require-imports
import nock = require('nock');
import { PaymentAdapters } from '../../src/financial/payment-adapters';
import {
  majorToMinor,
  minorToMajor,
  fingerprint,
} from '../../src/financial/financial-utils';
import { randomUUID } from 'node:crypto';
// Sanitized examples recorded from the providers' published API documentation; HTTP is intercepted.
describe('Hosted payment adapters', () => {
  const adapters = new PaymentAdapters();
  const reference = randomUUID();
  afterEach(() => {
    expect(nock.isDone()).toBe(true);
    nock.cleanAll();
  });
  it('sends decimal-string minor units to Paystack and preserves references', async () => {
    nock('https://api.paystack.co', {
      reqheaders: { authorization: 'Bearer fixture' },
    })
      .post('/transaction/initialize', {
        reference,
        amount: '50001',
        currency: 'NGN',
        email: 'customer@example.test',
      })
      .reply(200, {
        status: true,
        data: {
          reference,
          authorization_url: 'https://checkout.paystack.com/fixture',
        },
      });
    expect(
      await adapters.create('paystack', 'fixture', {
        reference,
        amount: '50001',
        currency: 'NGN',
        email: 'customer@example.test',
      }),
    ).toEqual({
      reference,
      checkoutUrl: 'https://checkout.paystack.com/fixture',
    });
    nock('https://api.paystack.co')
      .get(`/transaction/verify/${reference}`)
      .reply(200, {
        status: true,
        data: {
          id: 1641,
          reference,
          amount: 50001,
          currency: 'NGN',
          status: 'success',
        },
      });
    expect(await adapters.verify('paystack', 'fixture', reference)).toEqual({
      reference,
      providerReference: '1641',
      amount: '50001',
      currency: 'NGN',
      status: 'completed',
    });
  });
  it('uses exact decimal conversion for Flutterwave hosted checkout and verification', async () => {
    nock('https://api.flutterwave.com')
      .post('/v3/payments', {
        tx_ref: reference,
        amount: '500.01',
        currency: 'NGN',
        redirect_url: 'https://merchant.example.test/return',
        customer: { email: 'customer@example.test' },
      })
      .reply(200, {
        status: 'success',
        data: { link: 'https://checkout.flutterwave.com/fixture' },
      });
    await adapters.create('flutterwave', 'fixture', {
      reference,
      amount: '50001',
      currency: 'NGN',
      email: 'customer@example.test',
      callbackUrl: 'https://merchant.example.test/return',
    });
    nock('https://api.flutterwave.com')
      .get('/v3/transactions/verify_by_reference')
      .query({ tx_ref: reference })
      .reply(200, {
        status: 'success',
        data: {
          id: 908790,
          tx_ref: reference,
          amount: '500.01',
          currency: 'NGN',
          status: 'successful',
        },
      });
    expect(
      (await adapters.verify('flutterwave', 'fixture', reference)).amount,
    ).toBe('50001');
  });
  it('supports partial refunds and distinguishes initiation from completed disbursement', async () => {
    nock('https://api.paystack.co')
      .post('/refund', {
        transaction: '1641',
        amount: '10000',
        currency: 'NGN',
      })
      .reply(200, { status: true, data: { id: 1, status: 'pending' } });
    expect(
      await adapters.refund('paystack', 'fixture', '1641', '10000', 'NGN'),
    ).toEqual({ reference: '1', status: 'pending' });
    nock('https://api.paystack.co')
      .get('/refund/1')
      .reply(200, {
        status: true,
        data: {
          id: 1,
          status: 'processed',
          amount: 10000,
          currency: 'NGN',
          transaction: 1641,
        },
      });
    expect(
      (await adapters.verifyRefund('paystack', 'fixture', '1', 'NGN')).status,
    ).toBe('completed');
    nock('https://api.flutterwave.com')
      .post('/v3/transactions/908790/refund', { amount: '100.00' })
      .reply(200, {
        status: 'success',
        data: { id: 75923, status: 'completed' },
      });
    expect(
      (
        await adapters.refund(
          'flutterwave',
          'fixture',
          '908790',
          '10000',
          'NGN',
        )
      ).status,
    ).toBe('pending');
    nock('https://api.flutterwave.com')
      .get('/v3/refunds/75923')
      .reply(200, {
        status: 'success',
        data: {
          id: 75923,
          status: 'completed-bank-transfer',
          amount_refunded: '100.00',
          tx_id: 908790,
        },
      });
    expect(
      (await adapters.verifyRefund('flutterwave', 'fixture', '75923', 'NGN'))
        .status,
    ).toBe('completed');
  });
  it('rejects unparseable provider responses and unsafe numeric amounts', async () => {
    nock('https://api.paystack.co')
      .get(`/transaction/verify/${reference}`)
      .reply(200, {
        status: true,
        data: {
          id: 1,
          reference,
          amount: Number.MAX_SAFE_INTEGER + 2,
          currency: 'NGN',
          status: 'success',
        },
      });
    await expect(
      adapters.verify('paystack', 'fixture', reference),
    ).rejects.toThrow('Unsafe provider amount');
    nock('https://api.flutterwave.com')
      .post('/v3/payments')
      .reply(200, { status: 'success', data: { link: 12 } });
    await expect(
      adapters.create('flutterwave', 'fixture', {
        reference,
        amount: '1',
        currency: 'NGN',
        email: 'customer@example.test',
      }),
    ).rejects.toThrow();
  });
  it('converts large values without floating point arithmetic and fingerprints canonical payloads', () => {
    expect(minorToMajor('999999999999999999999999999999', 'NGN')).toBe(
      '9999999999999999999999999999.99',
    );
    expect(majorToMinor('12.001', 'KWD')).toBe('12001');
    expect(majorToMinor('12', 'JPY')).toBe('12');
    expect(() => majorToMinor('1.001', 'NGN')).toThrow();
    expect(fingerprint('pay', { b: '2', a: '1' })).toBe(
      fingerprint('pay', { a: '1', b: '2' }),
    );
    expect(fingerprint('refund', { a: '1', b: '2' })).not.toBe(
      fingerprint('pay', { a: '1', b: '2' }),
    );
  });
});
