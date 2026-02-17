export type ProviderType = 'paystack' | 'flutterwave' | 'paga' | 'fingra';

export interface ProviderConfig {
  apiKey: string;
  [key: string]: any;
}

export interface WalletProvider {
  type: ProviderType;
  name: string;
  isActive: boolean;
  config: ProviderConfig;
}
