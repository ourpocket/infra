import {
  FRONTEND_URL,
  MESSAGES,
  API_KEY_PREFIX,
  WEB2_ENDPOINT_URL,
} from '../../src/constant';

describe('Constant values', () => {
  it('should expose basic configuration constants', () => {
    expect(FRONTEND_URL).toBe('http://localhost:3000');
    expect(API_KEY_PREFIX).toBe('op_');
  });

  it('should build error messages correctly', () => {
    const message = MESSAGES.ERROR.WRONG_PROVIDER('Google');
    expect(message).toBe('Please login with your Google account');
  });

  it('should provide Paystack customer GET endpoint', () => {
    const customerCode = 'CUST_123';
    const url = WEB2_ENDPOINT_URL.PAYSTACK.CUSTOMER.GET(customerCode);
    expect(url).toBe(`https://api.paystack.co/customer/${customerCode}`);
  });

  it('should provide Flutterwave virtual account GET endpoint', () => {
    const reference = 'REF_123';
    const url = WEB2_ENDPOINT_URL.FLUTTERWAVE.VIRTUAL_ACCOUNTS.GET(reference);
    expect(url).toBe(
      `https://api.flutterwave.com/v3/virtual-account-numbers/${reference}`,
    );
  });

  it('should provide Fingra wallet GET endpoint', () => {
    const walletId = 'wallet-id';
    const url = WEB2_ENDPOINT_URL.FINGRA.WALLETS.GET(walletId);
    expect(url).toBe(`https://api.fingra.com/wallets/${walletId}`);
  });
});
