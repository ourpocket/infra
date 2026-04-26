// ============================================================================
// Flutterwave Provider Types
// ============================================================================
// Provider-specific request/response types. Keep these isolated.

// FLW API Endpoints
export const FLW_ENDPOINTS = {
  BASE: 'https://api.flutterwave.com/v3',
  VIRTUAL_ACCOUNTS: {
    CREATE: '/virtual-account-numbers',
    FETCH: (orderRef: string) => `/virtual-account-numbers/${orderRef}`,
  },
  TRANSACTIONS: {
    VERIFY: (id: string) => `/transactions/${id}/verify`,
    INITIATE: '/charges?type=card',
  },
  TRANSFERS: {
    CREATE: '/transfers',
    BALANCE: '/balances',
  },
  SUBACCOUNTS: {
    CREATE: '/subaccounts',
    FETCH: (id: string) => `/subaccounts/${id}`,
  },
} as const;

// FLW Create Virtual Account Request
export interface FLWCreateAccountRequest {
  email: string;
  is_permanent: boolean;
  bvn?: string;
  tx_ref: string;
  phonenumber?: string;
  firstname?: string;
  lastname?: string;
  narration?: string;
}

// FLW Create Virtual Account Response
export interface FLWCreateAccountResponse {
  status: string;
  message: string;
  data: {
    account_number: string;
    bank_code: string;
    bank_name: string;
    order_ref: string;
    account_status: string;
    currency: string;
    amount: string;
    created_at: string;
    expiry_date: string;
  };
}

// FLW Fetch Account Response
export interface FLWFetchAccountResponse {
  status: string;
  message: string;
  data: {
    account_number: string;
    bank_name: string;
    order_ref: string;
    currency: string;
    amount: string;
    created_at: string;
  };
}

// FLW Charge/Deposit Request
export interface FLWChargeRequest {
  card_number?: string;
  cvv?: string;
  expiry_month?: string;
  expiry_year?: string;
  currency: string;
  amount: string;
  email: string;
  tx_ref: string;
  redirect_url?: string;
}

// FLW Charge Response
export interface FLWChargeResponse {
  status: string;
  message: string;
  meta?: {
    authorization?: {
      mode: string;
      endpoint?: string;
      instructions?: string;
    };
  };
  data: {
    id: number;
    tx_ref: string;
    flw_ref: string;
    amount: number;
    currency: string;
    charged_amount: number;
    status: string;
    payment_type: string;
    created_at: string;
    customer: {
      id: number;
      name: string;
      email: string;
      phone_number: string | null;
    };
  };
}

// FLW Transfer Request
export interface FLWTransferRequest {
  account_bank: string;
  account_number: string;
  amount: number;
  narration: string;
  currency: string;
  reference: string;
  callback_url?: string;
  debit_currency?: string;
}

// FLW Transfer Response
export interface FLWTransferResponse {
  status: string;
  message: string;
  data: {
    id: number;
    account_number: string;
    bank_code: string;
    amount: number;
    currency: string;
    reference: string;
    status: string;
    narration: string;
    created_at: string;
  };
}

// FLW Verify Transaction Response
export interface FLWVerifyResponse {
  status: string;
  message: string;
  data: {
    id: number;
    tx_ref: string;
    flw_ref: string;
    amount: number;
    currency: string;
    charged_amount: number;
    status: 'successful' | 'pending' | 'failed' | 'cancelled';
    payment_type: string;
    created_at: string;
    customer: {
      name: string;
      email: string;
    };
  };
}

// FLW Balance Response
export interface FLWBalanceResponse {
  status: string;
  message: string;
  data: Array<{
    currency: string;
    available_balance: number;
    ledger_balance: number;
  }>;
}

// FLW Webhook Payload
export interface FLWWebhookPayload {
  event: string;
  data: {
    id: number;
    tx_ref: string;
    flw_ref: string;
    amount: number;
    currency: string;
    charged_amount: number;
    status: string;
    payment_type: string;
    created_at: string;
    customer: {
      id: number;
      name: string;
      email: string;
      phone_number: string;
    };
  };
}
