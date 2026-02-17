import {
  IWalletProvider,
  WalletOperationPayload,
} from '../../interface/wallet-provider-base.interface';
import { WEB2_ENDPOINT_URL } from '../../constant';
import createAxiosInstance from '../../configs/axios.config';

export class PagaService implements IWalletProvider {
  async createWallet(apiKey: string, payload: WalletOperationPayload) {
    const client = createAxiosInstance(undefined, apiKey);

    return client
      .post(WEB2_ENDPOINT_URL.PAGA.WALLET.CREATE, payload)
      .then((response) => response.data);
  }

  async fetchWallet(apiKey: string, payload: WalletOperationPayload) {
    const client = createAxiosInstance(undefined, apiKey);

    return client
      .post(WEB2_ENDPOINT_URL.PAGA.WALLET.GET, payload)
      .then((response) => response.data);
  }

  async listWallets(apiKey: string, payload: WalletOperationPayload) {
    const client = createAxiosInstance(undefined, apiKey);

    return client
      .post(WEB2_ENDPOINT_URL.PAGA.WALLET.LIST, payload)
      .then((response) => response.data);
  }

  async deposit(apiKey: string, payload: WalletOperationPayload) {
    const client = createAxiosInstance(undefined, apiKey);

    return client
      .post(WEB2_ENDPOINT_URL.PAGA.WALLET.FUND, payload)
      .then((response) => response.data);
  }

  async withdraw(apiKey: string, payload: WalletOperationPayload) {
    const client = createAxiosInstance(undefined, apiKey);

    return client
      .post(WEB2_ENDPOINT_URL.PAGA.WALLET.WITHDRAW, payload)
      .then((response) => response.data);
  }
}
