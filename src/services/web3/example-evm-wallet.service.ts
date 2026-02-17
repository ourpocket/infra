import { BaseWeb3Service } from './base-web3.service';
import { Web3OperationPayload } from '../../interface/web3-provider-base.interface';

export class ExampleEvmWalletService extends BaseWeb3Service {
  async createWallet(payload: Web3OperationPayload): Promise<never> {
    return Promise.reject(
      new Error('Example EVM create wallet is not implemented'),
    );
  }

  async fetchWallet(payload: Web3OperationPayload): Promise<never> {
    return Promise.reject(
      new Error('Example EVM fetch wallet is not implemented'),
    );
  }

  async listWallets(payload: Web3OperationPayload): Promise<never> {
    return Promise.reject(
      new Error('Example EVM list wallets is not implemented'),
    );
  }

  async deposit(payload: Web3OperationPayload): Promise<never> {
    return Promise.reject(new Error('Example EVM deposit is not implemented'));
  }

  async withdraw(payload: Web3OperationPayload): Promise<never> {
    return Promise.reject(new Error('Example EVM withdraw is not implemented'));
  }
}
