import {
  IWalletProvider,
  WalletOperationPayload,
} from '../../interface/wallet-provider-base.interface';
import { WEB2_ENDPOINT_URL } from '../../constant';
import createAxiosInstance from '../../configs/axios.config';

export class FlutterwaveService implements IWalletProvider {
  async createWallet(apiKey: string, payload: WalletOperationPayload) {
    const client = createAxiosInstance(undefined, apiKey);

    return client
      .post(WEB2_ENDPOINT_URL.FLUTTERWAVE.VIRTUAL_ACCOUNTS.CREATE, payload)
      .then((response) => response.data);
  }

  async fetchWallet(apiKey: string, payload: WalletOperationPayload) {
    const accountReference = payload.accountReference as string | undefined;
    if (!accountReference) {
      throw new Error('accountReference is required');
    }

    const client = createAxiosInstance(undefined, apiKey);

    return client
      .get(WEB2_ENDPOINT_URL.FLUTTERWAVE.VIRTUAL_ACCOUNTS.GET(accountReference))
      .then((response) => response.data);
  }

  async listWallets(apiKey: string, payload: WalletOperationPayload) {
    const client = createAxiosInstance(undefined, apiKey);

    return client
      .get(WEB2_ENDPOINT_URL.FLUTTERWAVE.VIRTUAL_ACCOUNTS.LIST, {
        params: payload,
      })
      .then((response) => response.data);
  }

  async deposit(apiKey: string, payload: WalletOperationPayload) {
    const client = createAxiosInstance(undefined, apiKey);

    return client
      .post(WEB2_ENDPOINT_URL.FLUTTERWAVE.CHARGES.BASE, payload, {
        params: {
          type: 'card',
        },
      })
      .then((response) => response.data);
  }

  async withdraw(apiKey: string, payload: WalletOperationPayload) {
    const client = createAxiosInstance(undefined, apiKey);

    return client
      .post(WEB2_ENDPOINT_URL.FLUTTERWAVE.TRANSFERS.CREATE, payload)
      .then((response) => response.data);
  }
}
