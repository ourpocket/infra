import { createHmac } from 'node:crypto';
import * as nock from 'nock';
import { ProviderRegistry } from '../../src/providers/provider-registry';

describe('ProviderRegistry', () => {
  const registry = new ProviderRegistry();
  const raw = Buffer.from('{"event":"charge.completed"}');

  afterEach(() => nock.cleanAll());

  it('verifies each provider webhook without retaining its payload', () => {
    expect(
      registry.adapter('paystack').verifyWebhook(
        raw,
        {
          'x-paystack-signature': createHmac('sha512', 'sk_live_fixture')
            .update(raw)
            .digest('hex'),
        },
        { apiKey: 'sk_live_fixture' },
      ),
    ).toBe(true);
    expect(
      registry.adapter('flutterwave').verifyWebhook(
        raw,
        { 'verif-hash': 'flutterwave-secret' },
        {
          apiKey: 'FLWSECK-LIVE-fixture',
          webhookSecret: 'flutterwave-secret',
        },
      ),
    ).toBe(true);
    expect(
      registry
        .adapter('mono')
        .verifyWebhook(
          raw,
          { 'mono-webhook-secret': 'mono-secret' },
          { secretKey: 'live_sk_fixture', webhookSecret: 'mono-secret' },
        ),
    ).toBe(true);
  });

  it('forwards a Mono checkout contact only to Mono', async () => {
    const reference = 'mono-ref-0001';
    nock('https://api.withmono.com')
      .post('/v2/payments/initiate', {
        amount: 20000,
        type: 'onetime-debit',
        method: 'account',
        description: 'Payment',
        reference,
        redirect_url: 'https://merchant.example.test/return',
        customer: { email: 'buyer@example.test', name: 'Customer' },
      })
      .matchHeader('mono-sec-key', 'mono-secret')
      .reply(200, {
        status: 'successful',
        data: {
          reference,
          mono_url: 'https://checkout.mono.co/fixture',
        },
      });

    await expect(
      registry.adapter('mono').create('mono-secret', {
        reference,
        amount: '20000',
        currency: 'NGN',
        callbackUrl: 'https://merchant.example.test/return',
        contact: { email: 'buyer@example.test' },
      }),
    ).resolves.toEqual({
      reference,
      checkoutUrl: 'https://checkout.mono.co/fixture',
    });
    expect(nock.isDone()).toBe(true);
  });
});
