export interface WalletOperationPayload {
  [key: string]: unknown;
}

export interface IWalletProvider {
  createWallet(
    apiKey: string,
    payload: WalletOperationPayload,
  ): Promise<unknown>;
  fetchWallet(
    apiKey: string,
    payload: WalletOperationPayload,
  ): Promise<unknown>;
  listWallets(
    apiKey: string,
    payload: WalletOperationPayload,
  ): Promise<unknown>;
  deposit(apiKey: string, payload: WalletOperationPayload): Promise<unknown>;
  withdraw(apiKey: string, payload: WalletOperationPayload): Promise<unknown>;
}
