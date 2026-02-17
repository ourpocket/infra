export interface Web3OperationPayload {
  [key: string]: unknown;
}

export interface IWeb3Provider {
  createWallet(payload: Web3OperationPayload): Promise<unknown>;
  fetchWallet(payload: Web3OperationPayload): Promise<unknown>;
  listWallets(payload: Web3OperationPayload): Promise<unknown>;
  deposit(payload: Web3OperationPayload): Promise<unknown>;
  withdraw(payload: Web3OperationPayload): Promise<unknown>;
}
