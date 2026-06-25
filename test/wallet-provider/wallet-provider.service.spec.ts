import { Test, TestingModule } from '@nestjs/testing';
import { PROVIDER_TYPE_ENUM, WALLET_ACTION_ENUM } from '../../src/enums';
import { RoutingEngineService } from '../../src/routing/routing-engine.service';
import { ProviderType } from '../../src/interface/wallet-provider.interface';
import { WalletProviderService } from '../../src/wallet-provider/wallet-provider.service';

describe('WalletProviderService', () => {
  let service: WalletProviderService;
  let routingEngineService: any;

  beforeEach(async () => {
    routingEngineService = {
      executeProviderAction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletProviderService,
        {
          provide: RoutingEngineService,
          useValue: routingEngineService,
        },
      ],
    }).compile();

    service = module.get<WalletProviderService>(WalletProviderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Provider Management', () => {
    it('should get available providers', () => {
      const providers = service.getAvailableProviders();
      expect(providers.map((provider) => provider.type)).toEqual([
        PROVIDER_TYPE_ENUM.PAYSTACK,
        PROVIDER_TYPE_ENUM.FLUTTERWAVE,
      ]);
    });

    it('should get a supported provider', () => {
      const provider = service.getProvider(PROVIDER_TYPE_ENUM.PAYSTACK);
      expect(provider?.type).toBe(PROVIDER_TYPE_ENUM.PAYSTACK);
    });

    it('should add a supported provider', () => {
      const config = { apiKey: 'new-key' };
      const provider = service.addProvider(PROVIDER_TYPE_ENUM.PAYSTACK, config);

      expect(provider.config).toEqual(config);
      expect(service.getProvider(PROVIDER_TYPE_ENUM.PAYSTACK)?.config).toEqual(
        config,
      );
    });

    it('should reject unsupported providers', () => {
      expect(() =>
        service.addProvider('custom' as ProviderType, { apiKey: 'key' }),
      ).toThrow('custom is not supported yet');
    });

    it('should remove a provider', () => {
      service.removeProvider(PROVIDER_TYPE_ENUM.PAYSTACK);
      expect(service.getProvider(PROVIDER_TYPE_ENUM.PAYSTACK)).toBeUndefined();
    });
  });

  describe('Provider Actions', () => {
    it('should delegate create wallet to the routing engine', async () => {
      const payload = { email: 'sudo.whoami@example.com' };
      routingEngineService.executeProviderAction.mockResolvedValue({
        id: 'w1',
      });

      await expect(
        service.createWallet(
          PROVIDER_TYPE_ENUM.PAYSTACK,
          'provider-key',
          payload,
        ),
      ).resolves.toEqual({ id: 'w1' });

      expect(routingEngineService.executeProviderAction).toHaveBeenCalledWith(
        {
          provider: PROVIDER_TYPE_ENUM.PAYSTACK,
          apiKey: 'provider-key',
        },
        WALLET_ACTION_ENUM.CREATE_WALLET,
        payload,
      );
    });

    it('should delegate deposit to the routing engine', async () => {
      const payload = { amount: '5000' };
      routingEngineService.executeProviderAction.mockResolvedValue({
        status: true,
      });

      await expect(
        service.deposit(PROVIDER_TYPE_ENUM.PAYSTACK, 'provider-key', payload),
      ).resolves.toEqual({ status: true });

      expect(routingEngineService.executeProviderAction).toHaveBeenCalledWith(
        {
          provider: PROVIDER_TYPE_ENUM.PAYSTACK,
          apiKey: 'provider-key',
        },
        WALLET_ACTION_ENUM.DEPOSIT,
        payload,
      );
    });
  });
});
