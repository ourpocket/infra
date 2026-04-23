//Provider Configuration Constants
export const ProviderUrls = {
  FLUTTERWAVE: {
    SANDBOX: 'https://api.flutterwave.com/v3',
    PRODUCTION: 'https://api.flutterwave.com/v3',
  },
  PAYSTACK: {
    SANDBOX: 'https://api.paystack.co',
    PRODUCTION: 'https://api.paystack.co',
  },
  MTN_MOMO: {
    SANDBOX: 'https://sandbox.momodeveloper.mtn.com',
    PRODUCTION: 'https://momodeveloper.mtn.com',
  },
  AIRTEL_MONEY: {
    SANDBOX: 'https://openapiuat.airtel.africa',
    PRODUCTION: 'https://openapi.airtel.africa',
  },
  ORANGE_MONEY: {
    SANDBOX: 'https://api.orange.com/orange-money',
    PRODUCTION: 'https://api.orange.com/orange-money',
  },
} as const;

// Default provider settings
export const DefaultProviderConfig = {
  timeoutMs: 30000,
  maxRetries: 3,
  circuitBreakerThreshold: 5,
  circuitBreakerResetMs: 30000,
} as const;

// Currency support per provider
export const ProviderCurrencies = {
  FLUTTERWAVE: ['NGN', 'GHS', 'KES', 'USD', 'EUR', 'GBP'] as const,
  PAYSTACK: ['NGN', 'GHS', 'ZAR', 'USD'] as const,
  MTN_MOMO: ['EUR', 'GHS', 'XAF', 'XOF', 'UGX', 'RWF', 'ZMW'] as const,
  AIRTEL_MONEY: [
    'NGN',
    'GHS',
    'KES',
    'UGX',
    'TZS',
    'ZMW',
    'MWK',
    'RWF',
  ] as const,
  ORANGE_MONEY: ['XOF', 'XAF', 'CDF'] as const,
} as const;

// Environment helpers
export const getFlutterwaveUrl = (): string =>
  process.env.NODE_ENV === 'production'
    ? ProviderUrls.FLUTTERWAVE.PRODUCTION
    : ProviderUrls.FLUTTERWAVE.SANDBOX;

export const getPaystackUrl = (): string =>
  process.env.NODE_ENV === 'production'
    ? ProviderUrls.PAYSTACK.PRODUCTION
    : ProviderUrls.PAYSTACK.SANDBOX;

export const getMtnMomoUrl = (): string =>
  process.env.NODE_ENV === 'production'
    ? ProviderUrls.MTN_MOMO.PRODUCTION
    : ProviderUrls.MTN_MOMO.SANDBOX;

export const getAirtelMoneyUrl = (): string =>
  process.env.NODE_ENV === 'production'
    ? ProviderUrls.AIRTEL_MONEY.PRODUCTION
    : ProviderUrls.AIRTEL_MONEY.SANDBOX;

export const getOrangeMoneyUrl = (): string =>
  process.env.NODE_ENV === 'production'
    ? ProviderUrls.ORANGE_MONEY.PRODUCTION
    : ProviderUrls.ORANGE_MONEY.SANDBOX;
