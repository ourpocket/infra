import {
  IWeb3Provider,
  Web3OperationPayload,
} from '../../interface/web3-provider-base.interface';

export abstract class BaseWeb3Service implements IWeb3Provider {
  abstract createWallet(payload: Web3OperationPayload): Promise<unknown>;

  abstract fetchWallet(payload: Web3OperationPayload): Promise<unknown>;

  abstract listWallets(payload: Web3OperationPayload): Promise<unknown>;

  abstract deposit(payload: Web3OperationPayload): Promise<unknown>;

  abstract withdraw(payload: Web3OperationPayload): Promise<unknown>;
}
