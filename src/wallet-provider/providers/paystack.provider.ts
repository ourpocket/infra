import axios from 'axios';
import { IWalletProvider } from '../../interface/wallet-provider-base.interface';

export class PaystackProvider implements IWalletProvider {
  async createWallet(apiKey: string, payload: any) {
    return axios
      .post('https://api.paystack.co/customer', payload, {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      .then((r) => r.data);
  }
}
