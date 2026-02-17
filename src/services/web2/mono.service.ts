import {
  IWalletProvider,
  WalletOperationPayload,
} from '../../interface/wallet-provider-base.interface';

export class MonoService implements IWalletProvider {
  async createWallet(
    apiKey: string,
    payload: WalletOperationPayload,
  ): Promise<never> {
    return Promise.reject(new Error('Mono create wallet is not implemented'));
  }

  async fetchWallet(
    apiKey: string,
    payload: WalletOperationPayload,
  ): Promise<never> {
    return Promise.reject(new Error('Mono fetch wallet is not implemented'));
  }

  async listWallets(
    apiKey: string,
    payload: WalletOperationPayload,
  ): Promise<never> {
    return Promise.reject(new Error('Mono list wallets is not implemented'));
  }

  async deposit(
    apiKey: string,
    payload: WalletOperationPayload,
  ): Promise<never> {
    return Promise.reject(new Error('Mono deposit is not implemented'));
  }

  async withdraw(
    apiKey: string,
    payload: WalletOperationPayload,
  ): Promise<never> {
    return Promise.reject(new Error('Mono withdraw is not implemented'));
  }
}
