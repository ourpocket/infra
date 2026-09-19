enum AUTH_TYPE_ENUM {
  LOCAL = 'local',
  GOOGLE = 'google',
}

enum API_ENVIROMENT {
  PRODUCTION = 'production',
  DEVELOPMENT = 'development',
}

enum USERS_STATUS_ENUM {
  ACTIVE = 'active',
  BANNED = 'banned',
}

enum PROVIDER_TYPE_ENUM {
  PAYSTACK = 'paystack',
  FLUTTERWAVE = 'flutterwave',
  MONO = 'mono',
  TURNKEY = 'turnkey',
  PRIVY = 'privy',
  PAGA = 'paga',
  FINGRA = 'fingra',
}

enum PROVIDER_CATALOG_STATUS_ENUM {
  DRAFT = 'draft',
  COMING_SOON = 'coming_soon',
  ACTIVE = 'active',
  MAINTENANCE = 'maintenance',
  RETIRED = 'retired',
}

enum PROVIDER_CATEGORY_ENUM {
  AFRICA = 'africa',
  GLOBAL = 'global',
  WALLET_INFRASTRUCTURE = 'wallet_infrastructure',
  DATA_VERIFICATION = 'data_verification',
}

enum PROVIDER_CAPABILITY_ENUM {
  PAYMENTS = 'payments',
  REFUNDS = 'refunds',
  WALLET_OPERATIONS = 'wallet_operations',
  PAYMENT_COLLECTION = 'payment_collection',
  BANK_DATA = 'bank_data',
  IDENTITY_VERIFICATION = 'identity_verification',
  TRANSFERS = 'transfers',
  SIGNING = 'signing',
  HOSTED_CHECKOUT = 'hosted_checkout',
  PAYMENT_VERIFICATION = 'payment_verification',
  PAYOUTS = 'payouts',
  VIRTUAL_ACCOUNTS = 'virtual_accounts',
  RECURRING_PAYMENTS = 'recurring_payments',
  ACCOUNT_LINKING = 'account_linking',
  POLICIES = 'policies',
}

enum PROJECT_API_KEY_SCOPE_ENUM {
  TEST = 'test',
  LIVE = 'live',
}

enum ROUTING_STRATEGY_ENUM {
  BEST_SUCCESS_RATE = 'best_success_rate',
  LOWEST_FEES = 'lowest_fees',
  FASTEST_SETTLEMENT = 'fastest_settlement',
  CUSTOM_PRIORITY = 'custom_priority',
}

enum WALLET_ACTION_ENUM {
  CREATE_WALLET = 'create_wallet',
  FETCH_WALLET = 'fetch_wallet',
  LIST_WALLETS = 'list_wallets',
  DEPOSIT = 'deposit',
  WITHDRAW = 'withdraw',
}

const BASE_STATUS = {
  PENDING: 'pending' as const,
  SUCCESS: 'success' as const,
  FAILED: 'failed' as const,
};

enum PAYMENT_STATUS_ENUM {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
}

enum TRANSFER_STATUS_ENUM {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
}

enum TRANSACTION_TYPE_ENUM {
  CREDIT = 'credit',
  DEBIT = 'debit',
  TRANSFER = 'transfer',
}

enum TRANSACTION_STATUS_ENUM {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
}

enum WEBHOOK_EVENT_ENUM {
  TRANSACTION_SUCCESS = 'transaction.success',
  TRANSACTION_FAILED = 'transaction.failed',
  WALLET_CREATED = 'wallet.created',
  WALLET_CREDITED = 'wallet.credited',
  WALLET_DEBITED = 'wallet.debited',
  TRANSFER_SUCCESS = 'transfer.success',
  TRANSFER_FAILED = 'transfer.failed',
}

export {
  AUTH_TYPE_ENUM,
  API_ENVIROMENT,
  USERS_STATUS_ENUM,
  PROVIDER_TYPE_ENUM,
  PROVIDER_CATALOG_STATUS_ENUM,
  PROVIDER_CATEGORY_ENUM,
  PROVIDER_CAPABILITY_ENUM,
  PROJECT_API_KEY_SCOPE_ENUM,
  ROUTING_STRATEGY_ENUM,
  WALLET_ACTION_ENUM,
  PAYMENT_STATUS_ENUM,
  TRANSFER_STATUS_ENUM,
  TRANSACTION_TYPE_ENUM,
  TRANSACTION_STATUS_ENUM,
  WEBHOOK_EVENT_ENUM,
  BASE_STATUS,
};
