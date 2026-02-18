import { MonoService } from '../../../src/services/web2/mono.service';

describe('MonoService', () => {
  let service: MonoService;

  beforeEach(() => {
    service = new MonoService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw not implemented error for createWallet', async () => {
    await expect(service.createWallet('key', {})).rejects.toThrow(
      'Mono create wallet is not implemented',
    );
  });

  it('should throw not implemented error for fetchWallet', async () => {
    await expect(service.fetchWallet('key', {})).rejects.toThrow(
      'Mono fetch wallet is not implemented',
    );
  });

  it('should throw not implemented error for listWallets', async () => {
    await expect(service.listWallets('key', {})).rejects.toThrow(
      'Mono list wallets is not implemented',
    );
  });

  it('should throw not implemented error for deposit', async () => {
    await expect(service.deposit('key', {})).rejects.toThrow(
      'Mono deposit is not implemented',
    );
  });

  it('should throw not implemented error for withdraw', async () => {
    await expect(service.withdraw('key', {})).rejects.toThrow(
      'Mono withdraw is not implemented',
    );
  });
});
