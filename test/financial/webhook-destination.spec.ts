import {
  webhookDestination,
  publicAddress,
} from '../../src/financial/webhook-destination';
import { retryDelays } from '../../src/financial/financial-webhooks.service';
describe('Webhook destination validation', () => {
  afterEach(() => jest.restoreAllMocks());
  it.each([
    '127.0.0.1',
    '10.0.0.1',
    '172.16.0.1',
    '192.168.1.1',
    '169.254.169.254',
    '100.64.0.1',
    '0.0.0.0',
    '198.18.0.1',
    '::1',
    'fc00::1',
    'fe80::1',
    '::ffff:127.0.0.1',
    '2001:db8::1',
    '2002:7f00:1::',
  ])('blocks reserved or internal address %s', (address) =>
    expect(publicAddress(address)).toBe(false),
  );
  it.each(['8.8.8.8', '93.184.216.34', '2606:4700:4700::1111'])(
    'accepts public address %s',
    (address) => expect(publicAddress(address)).toBe(true),
  );
  it('rejects mixed DNS answers and disallows HTTP, credentials and arbitrary ports', async () => {
    const resolve = () =>
      Promise.resolve([
        { address: '93.184.216.34', family: 4 },
        { address: '10.1.1.1', family: 4 },
      ]);
    await expect(
      webhookDestination('https://merchant.example.test/hook', resolve),
    ).rejects.toThrow('public addresses');
    for (const url of [
      'http://merchant.example.test',
      'https://user:secret@merchant.example.test',
      'https://merchant.example.test:8443',
    ])
      await expect(webhookDestination(url)).rejects.toThrow('HTTPS');
  });
  it('pins a validated public IP and specifies all retry intervals', async () => {
    const resolve = () =>
      Promise.resolve([{ address: '93.184.216.34', family: 4 }]);
    expect(
      (await webhookDestination('https://merchant.example.test/hook', resolve))
        .address.address,
    ).toBe('93.184.216.34');
    expect(retryDelays).toEqual([60000, 300000, 1800000, 7200000, 43200000]);
  });
});
