export interface IWalletProvider {
  createWallet(apiKey: string, payload: any): Promise<any>;
}
