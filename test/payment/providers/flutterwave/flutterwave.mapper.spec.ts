import { Errors } from '../../../../src/payment/core/errors/payment.error';
import {
  mapCreateWallet,
  mapFundWallet,
  mapWithdraw,
  mapWallet,
  mapPayment,
  mapBalance,
  parseWebhook,
} from '../../../../src/payment/providers/flutterwave/flutterwave.mapper';
import { buildAmount } from '../../../../src/payment/infrastructure/mapper/request-mapper';
import {
  FLWCreateAccountResponse,
  FLWChargeResponse,
  FLWTransferResponse,
  FLWBalanceResponse,
  FLWVerifyResponse,
} from '../../../../src/payment/providers/flutterwave/flutterwave.types';

describe('Flutterwave Mapper', () => {
  describe('Request Mapping', () => {
    it('should map create wallet request', () => {
      const req = {
        userId: 'user_123',
        currency: 'NGN' as const,
        email: 'test@example.com',
        phone: '+2348012345678',
        metadata: { firstName: 'John', lastName: 'Doe' },
      };

      const flwReq = mapCreateWallet(req);

      expect(flwReq.email).toBe('test@example.com');
      expect(flwReq.is_permanent).toBe(true);
      expect(flwReq.phonenumber).toBe('+2348012345678');
      expect(flwReq.firstname).toBe('John');
      expect(flwReq.lastname).toBe('Doe');
      expect(flwReq.tx_ref).toMatch(/^flw_wallet_/);
      expect(flwReq.narration).toContain('user_123');
    });

    it('should map fund wallet request', () => {
      const req = {
        walletId: 'wallet_123',
        amount: buildAmount(5000, 'NGN'),
        source: 'card' as const,
        sourceDetails: {
          email: 'test@example.com',
          cardNumber: '4111111111111111',
          cvv: '123',
          expiryMonth: '12',
          expiryYear: '2025',
        },
      };

      const flwReq = mapFundWallet(req);

      expect(flwReq.currency).toBe('NGN');
      expect(flwReq.amount).toBe('500000'); // Converted to kobo
      expect(flwReq.email).toBe('test@example.com');
      expect(flwReq.card_number).toBe('4111111111111111');
      expect(flwReq.cvv).toBe('123');
      expect(flwReq.tx_ref).toMatch(/^flw_fund_/);
    });

    it('should map withdraw request', () => {
      const req = {
        walletId: 'wallet_123',
        amount: buildAmount(10000, 'NGN'),
        destination: 'bank' as const,
        destinationDetails: {
          bankCode: '044',
          accountNumber: '0001234567',
        },
      };

      const flwReq = mapWithdraw(req);

      expect(flwReq.account_bank).toBe('044');
      expect(flwReq.account_number).toBe('0001234567');
      expect(flwReq.amount).toBe(10000);
      expect(flwReq.currency).toBe('NGN');
      expect(flwReq.reference).toMatch(/^flw_withdraw_/);
      expect(flwReq.narration).toContain('wallet_123');
    });
  });

  describe('Response Mapping', () => {
    it('should map create wallet response', () => {
      const flwRes: FLWCreateAccountResponse = {
        status: 'success',
        message: 'Virtual account created',
        data: {
          account_number: '0001234567',
          bank_code: '044',
          bank_name: 'Access Bank',
          order_ref: 'VA_12345',
          account_status: 'active',
          currency: 'NGN',
          amount: '0',
          created_at: '2026-04-22T10:00:00Z',
          expiry_date: '2027-04-22T10:00:00Z',
        },
      };

      const wallet = mapWallet(flwRes);

      expect(wallet.id).toBe('VA_12345');
      expect(wallet.currency).toBe('NGN');
      expect(wallet.provider).toBe('flutterwave');
      expect(wallet.providerRef).toBe('VA_12345');
      expect(wallet.metadata?.accountNumber).toBe('0001234567');
      expect(wallet.metadata?.bankName).toBe('Access Bank');
    });

    it('should map charge response to payment', () => {
      const flwRes: FLWChargeResponse = {
        status: 'success',
        message: 'Charge successful',
        data: {
          id: 12345,
          tx_ref: 'flw_fund_abc',
          flw_ref: 'FLW_ABC123',
          amount: 5000,
          currency: 'NGN',
          charged_amount: 5075,
          status: 'successful',
          payment_type: 'card',
          created_at: '2026-04-22T10:00:00Z',
          customer: {
            id: 1,
            name: 'John Doe',
            email: 'test@example.com',
            phone_number: null,
          },
        },
      };

      const payment = mapPayment(flwRes, 'fund');

      expect(payment.amount.value).toBe(5000);
      expect(payment.amount.currency).toBe('NGN');
      expect(payment.status).toBe('success');
      expect(payment.providerRef).toBe('FLW_ABC123');
      expect(payment.action).toBe('fund');
      expect(payment.provider).toBe('flutterwave');
    });

    it('should map transfer response to payment', () => {
      const flwRes: FLWTransferResponse = {
        status: 'success',
        message: 'Transfer successful',
        data: {
          id: 12345,
          account_number: '0001234567',
          bank_code: '044',
          amount: 10000,
          currency: 'NGN',
          reference: 'FLW_WITHDRAW_123',
          status: 'SUCCESSFUL',
          narration: 'Withdrawal from wallet wallet_123',
          created_at: '2026-04-22T10:00:00Z',
        },
      };

      const payment = mapPayment(flwRes, 'withdraw');

      expect(payment.status).toBe('success');
      expect(payment.providerRef).toBe('FLW_WITHDRAW_123');
      expect(payment.action).toBe('withdraw');
    });

    it('should map verify response to payment', () => {
      const flwRes: FLWVerifyResponse = {
        status: 'success',
        message: 'Transaction found',
        data: {
          id: 12345,
          tx_ref: 'flw_fund_abc',
          flw_ref: 'FLW_ABC123',
          amount: 5000,
          currency: 'NGN',
          charged_amount: 5075,
          status: 'successful',
          payment_type: 'card',
          created_at: '2026-04-22T10:00:00Z',
          customer: {
            name: 'John Doe',
            email: 'test@example.com',
          },
        },
      };

      const payment = mapPayment(flwRes, 'fund');

      expect(payment.status).toBe('success');
      expect(payment.providerRef).toBe('FLW_ABC123');
    });

    it('should map balance response', () => {
      const flwRes: FLWBalanceResponse = {
        status: 'success',
        message: 'Balances retrieved',
        data: [
          {
            currency: 'NGN',
            available_balance: 100000,
            ledger_balance: 105000,
          },
          { currency: 'USD', available_balance: 500, ledger_balance: 500 },
        ],
      };

      const balance = mapBalance(flwRes, 'NGN');

      expect(balance.available.value).toBe(100000);
      expect(balance.pending?.value).toBe(105000);
      expect(balance.currency).toBe('NGN');
    });
  });

  describe('Status Mapping', () => {
    it.each([
      ['successful', 'success'],
      ['pending', 'pending'],
      ['failed', 'failed'],
      ['cancelled', 'cancelled'],
      ['refunded', 'refunded'],
      ['unknown', 'pending'],
    ])('should map FLW status "%s" to "%s"', (flwStatus, expected) => {
      const flwRes: FLWVerifyResponse = {
        status: 'success',
        message: 'OK',
        data: {
          id: 1,
          tx_ref: 'tx',
          flw_ref: 'flw',
          amount: 100,
          currency: 'NGN',
          charged_amount: 100,
          status: flwStatus as 'successful',
          payment_type: 'card',
          created_at: '2026-04-22T10:00:00Z',
          customer: { name: 'Test', email: 'test@test.com' },
        },
      };

      const payment = mapPayment(flwRes, 'fund');
      expect(payment.status).toBe(expected);
    });
  });

  describe('Webhook Parsing', () => {
    it('should parse valid webhook payload', () => {
      const payload = {
        event: 'charge.completed',
        data: {
          id: 12345,
          status: 'successful',
          amount: 5000,
        },
      };

      const data = parseWebhook(payload);

      expect(data).toEqual({
        id: 12345,
        status: 'successful',
        amount: 5000,
      });
    });

    it('should return null for invalid payload', () => {
      expect(parseWebhook(null)).toBeNull();
      expect(parseWebhook(undefined)).toBeNull();
      expect(parseWebhook('string')).toBeNull();
      expect(parseWebhook(123)).toBeNull();
      expect(parseWebhook({})).toBeUndefined(); // No data property
    });
  });
});
