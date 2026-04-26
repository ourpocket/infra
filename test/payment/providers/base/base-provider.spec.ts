import {
  BaseProvider,
  BaseProviderConfig,
} from '../../../../src/payment/providers/base/base-provider';
import {
  CreateWalletRequest,
  FundWalletRequest,
  WithdrawRequest,
  Wallet,
  Payment,
  BalanceResponse,
  ProviderCredentials,
  Result,
  PaymentError,
  ProviderId,
} from '../../../../src/payment/core/types/payment.types';

// Test implementation
class TestProvider extends BaseProvider {
  readonly name = 'Test Provider';
  readonly supportedCurrencies = ['NGN', 'USD'] as const;

  // Expose protected methods for testing
  exposeCircuitBreaker() {
    return this.circuitBreaker;
  }

  exposeSupportsCurrency(currency: string) {
    return this.supportsCurrency(currency);
  }

  // Mock methods for testing
  mockCreateWallet = jest.fn();
  mockFetchWallet = jest.fn();
  mockFundWallet = jest.fn();
  mockWithdraw = jest.fn();
  mockGetBalance = jest.fn();
  mockVerifyTransaction = jest.fn();

  constructor(config: BaseProviderConfig) {
    super('flutterwave' as ProviderId, config); // Use valid ProviderId
  }

  protected doCreateWallet(
    req: CreateWalletRequest,
    creds: ProviderCredentials,
  ): Promise<Result<Wallet, PaymentError>> {
    return this.mockCreateWallet(req, creds);
  }

  protected doFetchWallet(
    walletId: string,
    creds: ProviderCredentials,
  ): Promise<Result<Wallet, PaymentError>> {
    return this.mockFetchWallet(walletId, creds);
  }

  protected doFundWallet(
    req: FundWalletRequest,
    creds: ProviderCredentials,
  ): Promise<Result<Payment, PaymentError>> {
    return this.mockFundWallet(req, creds);
  }

  protected doWithdraw(
    req: WithdrawRequest,
    creds: ProviderCredentials,
  ): Promise<Result<Payment, PaymentError>> {
    return this.mockWithdraw(req, creds);
  }

  protected doGetBalance(
    walletId: string,
    creds: ProviderCredentials,
  ): Promise<Result<BalanceResponse, PaymentError>> {
    return this.mockGetBalance(walletId, creds);
  }

  protected doVerifyTransaction(
    providerRef: string,
    creds: ProviderCredentials,
  ): Promise<Result<Payment, PaymentError>> {
    return this.mockVerifyTransaction(providerRef, creds);
  }
}

describe('BaseProvider', () => {
  let provider: TestProvider;
  const config: BaseProviderConfig = {
    timeoutMs: 5000,
    maxRetries: 3,
    circuitBreakerThreshold: 5,
    circuitBreakerResetMs: 30000,
    baseUrl: 'https://test.example.com',
  };

  const validCreds: ProviderCredentials = {
    apiKey: 'test-api-key',
    secretKey: 'test-secret',
  };

  beforeEach(() => {
    provider = new TestProvider(config);
    jest.clearAllMocks();
  });

  describe('Credential Validation', () => {
    it('should reject calls with missing API key', async () => {
      const invalidCreds: ProviderCredentials = { apiKey: '' };

      const result = await provider.createWallet(
        {} as CreateWalletRequest,
        invalidCreds,
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('CONFIGURATION_ERROR');
      }
    });

    it('should accept valid credentials', async () => {
      const mockWallet: Wallet = {
        id: 'wallet_123',
        userId: 'user_123',
        currency: 'NGN',
        provider: 'flutterwave',
        providerRef: 'prov_ref_123',
        createdAt: new Date(),
      };

      provider.mockCreateWallet.mockResolvedValue({
        ok: true,
        value: mockWallet,
      });

      const result = await provider.createWallet(
        {} as CreateWalletRequest,
        validCreds,
      );

      expect(result.ok).toBe(true);
      expect(provider.mockCreateWallet).toHaveBeenCalled();
    });
  });

  describe('Currency Validation', () => {
    it('should reject unsupported currencies for fund', async () => {
      const req: FundWalletRequest = {
        walletId: 'wallet_123',
        amount: { value: 1000, currency: 'EUR' },
        source: 'card',
        sourceDetails: {},
      };

      const result = await provider.fundWallet(req, validCreds);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('VALIDATION_ERROR');
        expect(result.error.message).toContain('EUR');
      }
    });

    it('should reject unsupported currencies for withdraw', async () => {
      const req: WithdrawRequest = {
        walletId: 'wallet_123',
        amount: { value: 1000, currency: 'GBP' },
        destination: 'bank',
        destinationDetails: {},
      };

      const result = await provider.withdraw(req, validCreds);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('VALIDATION_ERROR');
      }
    });

    it('should accept supported currencies', async () => {
      provider.mockFundWallet.mockResolvedValue({
        ok: true,
        value: { id: 'pay_123' } as Payment,
      });

      const req: FundWalletRequest = {
        walletId: 'wallet_123',
        amount: { value: 5000, currency: 'NGN' },
        source: 'card',
        sourceDetails: {},
      };

      const result = await provider.fundWallet(req, validCreds);

      expect(result.ok).toBe(true);
    });
  });

  describe('Webhook Parsing', () => {
    it('should return error by default', () => {
      const result = provider.parseWebhook({}, 'signature', validCreds);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('PROVIDER_ERROR');
      }
    });
  });

  describe('Circuit Breaker Integration', () => {
    it('should have circuit breaker instance', () => {
      expect(provider.exposeCircuitBreaker()).toBeDefined();
    });

    it('should start with closed circuit', () => {
      expect(provider.exposeCircuitBreaker().getState()).toBe('CLOSED');
    });
  });

  describe('Configuration', () => {
    it('should expose provider metadata', () => {
      expect(provider.name).toBe('Test Provider');
      expect(provider.supportedCurrencies).toContain('NGN');
      expect(provider.supportedCurrencies).toContain('USD');
    });

    it('should check currency support', () => {
      expect(provider.exposeSupportsCurrency('NGN')).toBe(true);
      expect(provider.exposeSupportsCurrency('EUR')).toBe(false);
    });
  });
});
