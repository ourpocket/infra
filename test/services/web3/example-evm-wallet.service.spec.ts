import { ExampleEvmWalletService } from '../../../src/services/web3/example-evm-wallet.service';

describe('ExampleEvmWalletService', () => {
  let service: ExampleEvmWalletService;

  beforeEach(() => {
    service = new ExampleEvmWalletService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw not implemented error for createWallet', async () => {
    await expect(service.createWallet({})).rejects.toThrow(
      'Example EVM create wallet is not implemented',
    );
  });

  it('should throw not implemented error for fetchWallet', async () => {
    await expect(service.fetchWallet({})).rejects.toThrow(
      'Example EVM fetch wallet is not implemented',
    );
  });

  it('should throw not implemented error for listWallets', async () => {
    await expect(service.listWallets({})).rejects.toThrow(
      'Example EVM list wallets is not implemented',
    );
  });

  it('should throw not implemented error for deposit', async () => {
    await expect(service.deposit({})).rejects.toThrow(
      'Example EVM deposit is not implemented',
    );
  });

  it('should throw not implemented error for withdraw', async () => {
    await expect(service.withdraw({})).rejects.toThrow(
      'Example EVM withdraw is not implemented',
    );
  });
});
