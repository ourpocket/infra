import axios from 'axios';
import { IWalletProvider } from '../../interface/wallet-provider-base.interface';

export class FlutterwaveProvider implements IWalletProvider {
  async createWallet(apiKey: string, payload: any) {
    return axios
      .post('https://api.flutterwave.com/v3/virtual-account-numbers', payload, {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      .then((r) => r.data);
  }
}
