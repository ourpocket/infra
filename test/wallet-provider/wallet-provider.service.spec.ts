import { Test, TestingModule } from '@nestjs/testing';
import { WalletProviderService } from '../../src/wallet-provider/wallet-provider.service';
import { LedgerService } from '../../src/ledger/ledger.service';
import { ProviderType } from '../../src/interface/wallet-provider.interface';

describe('WalletProviderService', () => {
  let service: WalletProviderService;
  let ledgerService: any;
  let mockProvider: any;

  beforeEach(async () => {
    ledgerService = {
      executeTransaction: jest.fn(),
    };

    mockProvider = {
      createWallet: jest.fn(),
      fetchWallet: jest.fn(),
      listWallets: jest.fn(),
      deposit: jest.fn(),
      withdraw: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletProviderService,
        {
          provide: LedgerService,
          useValue: ledgerService,
        },
      ],
    }).compile();

    service = module.get<WalletProviderService>(WalletProviderService);

    // Inject mock provider
    (service as any).providerRegistry = {
      paystack: mockProvider,
      flutterwave: mockProvider,
      paga: mockProvider,
      fingra: mockProvider,
    };
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Provider Management', () => {
    it('should get available providers', () => {
      const providers = service.getAvailableProviders();
      expect(providers.length).toBeGreaterThan(0);
      expect(providers[0].isActive).toBe(true);
    });

    it('should get specific provider', () => {
      const provider = service.getProvider('paystack' as ProviderType);
      expect(provider).toBeDefined();
      expect(provider?.type).toBe('paystack');
    });

    it('should add provider', () => {
      const config = { apiKey: 'new-key' };
      const provider = service.addProvider('paystack', config);
      expect(provider.config).toEqual(config);
      expect(service.getProvider('paystack')?.config).toEqual(config);
    });

    it('should add new provider when not existing', () => {
      const config = { apiKey: 'another-key' };
      const provider = service.addProvider('custom' as ProviderType, config);
      expect(provider.type).toBe('custom');
      expect(provider.config).toEqual(config);
      expect(service.getProvider('custom' as ProviderType)).toEqual(provider);
    });

    it('should remove provider', () => {
      service.removeProvider('paystack');
      const provider = service.getProvider('paystack');
      expect(provider).toBeUndefined(); // getProvider filters by isActive
    });
  });

  describe('createWallet', () => {
    it('should call provider.createWallet', async () => {
      const apiKey = 'key';
      const payload: any = { data: 'test' };
      mockProvider.createWallet.mockResolvedValue({ id: 'w1' });

      const result = await service.createWallet('paystack', apiKey, payload);
      expect(mockProvider.createWallet).toHaveBeenCalledWith(apiKey, payload);
      expect(result).toEqual({ id: 'w1' });
    });

    it('should throw error for unsupported provider', async () => {
      await expect(
        service.createWallet('invalid' as ProviderType, 'key', {}),
      ).rejects.toThrow('Unsupported provider');
    });
  });

  describe('fetchWallet', () => {
    it('should call provider.fetchWallet', async () => {
      const apiKey = 'key';
      const payload: any = { id: 'w1' };
      mockProvider.fetchWallet.mockResolvedValue({ id: 'w1' });

      const result = await service.fetchWallet('paystack', apiKey, payload);
      expect(mockProvider.fetchWallet).toHaveBeenCalledWith(apiKey, payload);
      expect(result).toEqual({ id: 'w1' });
    });

    it('should throw error for unsupported provider', async () => {
      await expect(
        service.fetchWallet('invalid' as ProviderType, 'key', {}),
      ).rejects.toThrow('Unsupported provider');
    });
  });

  describe('listWallets', () => {
    it('should call provider.listWallets', async () => {
      const apiKey = 'key';
      const payload: any = {};
      mockProvider.listWallets.mockResolvedValue([{ id: 'w1' }]);

      const result = await service.listWallets('paystack', apiKey, payload);
      expect(mockProvider.listWallets).toHaveBeenCalledWith(apiKey, payload);
      expect(result).toEqual([{ id: 'w1' }]);
    });

    it('should throw error for unsupported provider', async () => {
      await expect(
        service.listWallets('invalid' as ProviderType, 'key', {}),
      ).rejects.toThrow('Unsupported provider');
    });
  });

  describe('deposit', () => {
    const apiKey = 'key';
    const payload: any = { amount: 100 };

    it('should call provider.deposit without ledger', async () => {
      mockProvider.deposit.mockResolvedValue({ status: 'success' });

      const result = await service.deposit('paystack', apiKey, payload);
      expect(mockProvider.deposit).toHaveBeenCalledWith(apiKey, payload);
      expect(result).toEqual({ status: 'success' });
      expect(ledgerService.executeTransaction).not.toHaveBeenCalled();
    });

    it('should call provider.deposit and ledger', async () => {
      const payloadWithLedger = { ...payload, ledger: { id: 'tx1' } };
      mockProvider.deposit.mockResolvedValue({ status: 'success' });
      ledgerService.executeTransaction.mockResolvedValue({ id: 'ledger-tx' });

      const result = await service.deposit(
        'paystack',
        apiKey,
        payloadWithLedger,
      );

      expect(mockProvider.deposit).toHaveBeenCalledWith(apiKey, payload);
      expect(ledgerService.executeTransaction).toHaveBeenCalledWith(
        payloadWithLedger.ledger,
      );
      expect(result).toEqual({
        provider: { status: 'success' },
        ledger: { id: 'ledger-tx' },
      });
    });

    it('should throw error for unsupported provider', async () => {
      await expect(
        service.deposit('invalid' as ProviderType, apiKey, payload),
      ).rejects.toThrow('Unsupported provider');
    });
  });

  describe('withdraw', () => {
    const apiKey = 'key';
    const payload: any = { amount: 100 };

    it('should call provider.withdraw without ledger', async () => {
      mockProvider.withdraw.mockResolvedValue({ status: 'success' });

      const result = await service.withdraw('paystack', apiKey, payload);
      expect(mockProvider.withdraw).toHaveBeenCalledWith(apiKey, payload);
      expect(result).toEqual({ status: 'success' });
      expect(ledgerService.executeTransaction).not.toHaveBeenCalled();
    });

    it('should call provider.withdraw and ledger', async () => {
      const payloadWithLedger = { ...payload, ledger: { id: 'tx1' } };
      mockProvider.withdraw.mockResolvedValue({ status: 'success' });
      ledgerService.executeTransaction.mockResolvedValue({ id: 'ledger-tx' });

      const result = await service.withdraw(
        'paystack',
        apiKey,
        payloadWithLedger,
      );

      expect(mockProvider.withdraw).toHaveBeenCalledWith(apiKey, payload);
      expect(ledgerService.executeTransaction).toHaveBeenCalledWith(
        payloadWithLedger.ledger,
      );
      expect(result).toEqual({
        provider: { status: 'success' },
        ledger: { id: 'ledger-tx' },
      });
    });

    it('should throw error for unsupported provider', async () => {
      await expect(
        service.withdraw('invalid' as ProviderType, apiKey, payload),
      ).rejects.toThrow('Unsupported provider');
    });
  });
});
