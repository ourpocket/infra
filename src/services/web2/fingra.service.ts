import {
  IWalletProvider,
  WalletOperationPayload,
} from '../../interface/wallet-provider-base.interface';
import { WEB2_ENDPOINT_URL } from '../../constant';
import createAxiosInstance from '../../configs/axios.config';

export class FingraService implements IWalletProvider {
  async createWallet(apiKey: string, payload: WalletOperationPayload) {
    const client = createAxiosInstance(undefined, apiKey);

    return client
      .post(WEB2_ENDPOINT_URL.FINGRA.WALLETS.CREATE, payload)
      .then((response) => response.data);
  }

  async fetchWallet(apiKey: string, payload: WalletOperationPayload) {
    const walletId = payload.walletId as string | undefined;
    if (!walletId) {
      throw new Error('walletId is required');
    }

    const client = createAxiosInstance(undefined, apiKey);

    return client
      .get(WEB2_ENDPOINT_URL.FINGRA.WALLETS.GET(walletId))
      .then((response) => response.data);
  }

  async listWallets(apiKey: string, payload: WalletOperationPayload) {
    const client = createAxiosInstance(undefined, apiKey);

    return client
      .get(WEB2_ENDPOINT_URL.FINGRA.WALLETS.LIST, {
        params: payload,
      })
      .then((response) => response.data);
  }

  async deposit(apiKey: string, payload: WalletOperationPayload) {
    const client = createAxiosInstance(undefined, apiKey);

    return client
      .post(WEB2_ENDPOINT_URL.FINGRA.WALLETS.DEPOSIT, payload)
      .then((response) => response.data);
  }

  async withdraw(apiKey: string, payload: WalletOperationPayload) {
    const client = createAxiosInstance(undefined, apiKey);

    return client
      .post(WEB2_ENDPOINT_URL.FINGRA.WALLETS.WITHDRAW, payload)
      .then((response) => response.data);
  }
}
