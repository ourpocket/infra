import axios from 'axios';
import { IWalletProvider } from '../../interface/wallet-provider-base.interface';

export class FingraProvider implements IWalletProvider {
  async createWallet(apiKey: string, payload: any) {
    return axios
      .post('https://api.fingra.com/wallets', payload, {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      .then((r) => r.data);
  }
}
