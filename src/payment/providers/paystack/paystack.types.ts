// ============================================================================
// Paystack Provider Types
// ============================================================================

export const PAYSTACK_ENDPOINTS = {
  BASE: 'https://api.paystack.co',
  CUSTOMER: {
    CREATE: '/customer',
    GET: (code: string) => `/customer/${code}`,
    LIST: '/customer',
  },
  TRANSACTION: {
    INITIALIZE: '/transaction/initialize',
    VERIFY: (reference: string) => `/transaction/verify/${reference}`,
  },
  TRANSFER: {
    CREATE: '/transfer',
    BULK: '/transfer/bulk',
    VERIFY: (reference: string) => `/transfer/verify/${reference}`,
    RECIPIENT: '/transferrecipient',
  },
  SUBACCOUNT: {
    CREATE: '/subaccount',
    FETCH: (id: string) => `/subaccount/${id}`,
  },
  BALANCE: '/balance',
} as const;

// Paystack Create Customer Request
export interface PaystackCreateCustomerRequest {
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  metadata?: Record<string, unknown>;
}

// Paystack Create Customer Response
export interface PaystackCreateCustomerResponse {
  status: boolean;
  message: string;
  data: {
    email: string;
    integration: number;
    domain: string;
    customer_code: string;
    id: number;
    createdAt: string;
    updatedAt: string;
  };
}

// Paystack Fetch Customer Response
export interface PaystackFetchCustomerResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    email: string;
    customer_code: string;
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
  };
}

// Paystack Initialize Transaction Request
export interface PaystackInitializeRequest {
  email: string;
  amount: string; // In kobo
  currency?: string;
  reference?: string;
  callback_url?: string;
  metadata?: Record<string, unknown>;
  channels?: string[];
}

// Paystack Initialize Transaction Response
export interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

// Paystack Verify Transaction Response
export interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    domain: string;
    status: 'success' | 'pending' | 'failed' | 'abandoned';
    reference: string;
    amount: number; // In kobo
    currency: string;
    transaction_date: string;
    metadata: Record<string, unknown> | null;
    customer: {
      id: number;
      email: string;
      customer_code: string;
    };
  };
}

// Paystack Transfer Recipient Request
export interface PaystackTransferRecipientRequest {
  type: 'nuban' | 'mobile_money' | 'basa';
  name: string;
  account_number: string;
  bank_code: string;
  currency?: string;
}

// Paystack Transfer Recipient Response
export interface PaystackTransferRecipientResponse {
  status: boolean;
  message: string;
  data: {
    active: boolean;
    createdAt: string;
    currency: string;
    domain: string;
    id: number;
    integration: number;
    name: string;
    recipient_code: string;
    type: string;
    updatedAt: string;
    is_deleted: boolean;
    details: {
      authorization_code: string | null;
      account_number: string;
      account_name: string | null;
      bank_code: string;
      bank_name: string;
    };
  };
}

// Paystack Transfer Request
export interface PaystackTransferRequest {
  source: 'balance';
  amount: string; // In kobo
  reference: string;
  recipient: string; // Recipient code
  reason?: string;
}

// Paystack Transfer Response
export interface PaystackTransferResponse {
  status: boolean;
  message: string;
  data: {
    reference: string;
    integration: number;
    domain: string;
    amount: number;
    currency: string;
    source: string;
    reason: string;
    status: 'success' | 'pending' | 'failed' | 'otp';
    recipient: number;
    id: number;
    createdAt: string;
    updatedAt: string;
  };
}

// Paystack Balance Response
export interface PaystackBalanceResponse {
  status: boolean;
  message: string;
  data: Array<{
    currency: string;
    balance: number; // In kobo
  }>;
}

// Paystack Webhook Payload
export interface PaystackWebhookPayload {
  event: string;
  data: {
    id: number;
    domain: string;
    status: string;
    reference: string;
    amount: number;
    currency: string;
    transaction_date: string;
    customer: {
      id: number;
      email: string;
      customer_code: string;
    };
  };
}
