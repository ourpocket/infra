import {
  IWalletProvider,
  WalletOperationPayload,
} from '../../interface/wallet-provider-base.interface';
import { WEB2_ENDPOINT_URL } from '../../constant';
import createAxiosInstance from '../../configs/axios.config';

export class PaystackService implements IWalletProvider {
  async createWallet(apiKey: string, payload: WalletOperationPayload) {
    const client = createAxiosInstance(undefined, apiKey);

    return client
      .post(WEB2_ENDPOINT_URL.PAYSTACK.CUSTOMER.CREATE, payload)
      .then((response) => response.data);
  }

  async fetchWallet(apiKey: string, payload: WalletOperationPayload) {
    const customerCode = payload.customerCode as string | undefined;
    if (!customerCode) {
      throw new Error('customerCode is required');
    }

    const client = createAxiosInstance(undefined, apiKey);

    return client
      .get(WEB2_ENDPOINT_URL.PAYSTACK.CUSTOMER.GET(customerCode))
      .then((response) => response.data);
  }

  async listWallets(apiKey: string, payload: WalletOperationPayload) {
    const client = createAxiosInstance(undefined, apiKey);

    return client
      .get(WEB2_ENDPOINT_URL.PAYSTACK.CUSTOMER.LIST, {
        params: payload,
      })
      .then((response) => response.data);
  }

  async deposit(apiKey: string, payload: WalletOperationPayload) {
    const client = createAxiosInstance(undefined, apiKey);

    return client
      .post(WEB2_ENDPOINT_URL.PAYSTACK.TRANSACTION.INITIALIZE, payload)
      .then((response) => response.data);
  }

  async withdraw(apiKey: string, payload: WalletOperationPayload) {
    const client = createAxiosInstance(undefined, apiKey);

    return client
      .post(WEB2_ENDPOINT_URL.PAYSTACK.TRANSFER.CREATE, payload)
      .then((response) => response.data);
  }
}
