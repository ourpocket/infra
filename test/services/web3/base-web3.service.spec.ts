import { BaseWeb3Service } from '../../../src/services/web3/base-web3.service';
import { Web3OperationPayload } from '../../../src/interface/web3-provider-base.interface';

class MockWeb3Service extends BaseWeb3Service {
  async createWallet(payload: Web3OperationPayload): Promise<unknown> {
    return Promise.resolve();
  }
  async fetchWallet(payload: Web3OperationPayload): Promise<unknown> {
    return Promise.resolve();
  }
  async listWallets(payload: Web3OperationPayload): Promise<unknown> {
    return Promise.resolve();
  }
  async deposit(payload: Web3OperationPayload): Promise<unknown> {
    return Promise.resolve();
  }
  async withdraw(payload: Web3OperationPayload): Promise<unknown> {
    return Promise.resolve();
  }
}

describe('BaseWeb3Service', () => {
  let service: BaseWeb3Service;

  beforeEach(() => {
    service = new MockWeb3Service();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
