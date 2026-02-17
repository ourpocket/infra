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
  PAGA = 'paga',
  FINGRA = 'fingra',
}

enum WALLET_ACTION_ENUM {
  CREATE_WALLET = 'create_wallet',
  FETCH_WALLET = 'fetch_wallet',
  LIST_WALLETS = 'list_wallets',
  DEPOSIT = 'deposit',
  WITHDRAW = 'withdraw',
}

export {
  AUTH_TYPE_ENUM,
  API_ENVIROMENT,
  USERS_STATUS_ENUM,
  PROVIDER_TYPE_ENUM,
  WALLET_ACTION_ENUM,
};
