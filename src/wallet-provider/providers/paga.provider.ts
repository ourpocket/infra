import axios from 'axios';
import { IWalletProvider } from '../../interface/wallet-provider-base.interface';

export class PagaProvider implements IWalletProvider {
  async createWallet(apiKey: string, payload: any) {
    return axios
      .post(
        'https://api.mypaga.com/paga-webservices/business-rest/secured/v1/wallet/create',
        payload,
        {
          headers: { Authorization: `Bearer ${apiKey}` },
        },
      )
      .then((r) => r.data);
  }
}
