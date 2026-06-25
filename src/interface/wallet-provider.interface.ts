import { PROVIDER_TYPE_ENUM } from '../enums';

export type ProviderType = PROVIDER_TYPE_ENUM;

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
