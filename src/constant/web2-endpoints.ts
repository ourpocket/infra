export const WEB2_ENDPOINT_URL = {
  PAYSTACK: {
    CUSTOMER: {
      CREATE: 'https://api.paystack.co/customer',
      GET: (customerCode: string) =>
        `https://api.paystack.co/customer/${customerCode}`,
      LIST: 'https://api.paystack.co/customer',
    },
    TRANSACTION: {
      INITIALIZE: 'https://api.paystack.co/transaction/initialize',
    },
    TRANSFER: {
      CREATE: 'https://api.paystack.co/transfer',
    },
  },
  FLUTTERWAVE: {
    VIRTUAL_ACCOUNTS: {
      CREATE: 'https://api.flutterwave.com/v3/virtual-account-numbers',
      GET: (accountReference: string) =>
        `https://api.flutterwave.com/v3/virtual-account-numbers/${accountReference}`,
      LIST: 'https://api.flutterwave.com/v3/virtual-account-numbers',
    },
    CHARGES: {
      BASE: 'https://api.flutterwave.com/v3/charges',
    },
    TRANSFERS: {
      CREATE: 'https://api.flutterwave.com/v3/transfers',
    },
  },
  PAGA: {
    WALLET: {
      CREATE:
        'https://api.mypaga.com/paga-webservices/business-rest/secured/v1/wallet/create',
      GET: 'https://api.mypaga.com/paga-webservices/business-rest/secured/v1/wallet/get',
      LIST: 'https://api.mypaga.com/paga-webservices/business-rest/secured/v1/wallet/list',
      FUND: 'https://api.mypaga.com/paga-webservices/business-rest/secured/v1/wallet/fund',
      WITHDRAW:
        'https://api.mypaga.com/paga-webservices/business-rest/secured/v1/wallet/withdraw',
    },
  },
  FINGRA: {
    WALLETS: {
      CREATE: 'https://api.fingra.com/wallets',
      GET: (walletId: string) => `https://api.fingra.com/wallets/${walletId}`,
      LIST: 'https://api.fingra.com/wallets',
      DEPOSIT: 'https://api.fingra.com/wallets/deposit',
      WITHDRAW: 'https://api.fingra.com/wallets/withdraw',
    },
  },
} as const;

export type Web2EndpointConfig = typeof WEB2_ENDPOINT_URL;
