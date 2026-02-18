import { Test, TestingModule } from '@nestjs/testing';
import { WalletProviderController } from '../../src/wallet-provider/wallet-provider.controller';
import { WalletProviderService } from '../../src/wallet-provider/wallet-provider.service';
import { ProjectApiKeyService } from '../../src/project/project-api-key.service';
import { ProjectProviderService } from '../../src/project/project-provider.service';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { WALLET_ACTION_ENUM } from '../../src/enums';

describe('WalletProviderController', () => {
  let controller: WalletProviderController;
  let service: any;
  let projectApiKeyService: any;
  let projectProviderService: any;

  beforeEach(async () => {
    service = {
      getAvailableProviders: jest.fn(),
      addProvider: jest.fn(),
      removeProvider: jest.fn(),
      createWallet: jest.fn(),
      fetchWallet: jest.fn(),
      listWallets: jest.fn(),
      deposit: jest.fn(),
      withdraw: jest.fn(),
    };

    projectApiKeyService = {
      verifyProjectApiKey: jest.fn(),
    };

    projectProviderService = {
      getProviderApiKeyForProject: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WalletProviderController],
      providers: [
        {
          provide: WalletProviderService,
          useValue: service,
        },
        {
          provide: ProjectApiKeyService,
          useValue: projectApiKeyService,
        },
        {
          provide: ProjectProviderService,
          useValue: projectProviderService,
        },
      ],
    }).compile();

    controller = module.get<WalletProviderController>(WalletProviderController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  const mockRequest = (headers: any) => ({ headers });

  describe('getProviders', () => {
    it('should return available providers', () => {
      const providers = [{ type: 'paystack' }];
      service.getAvailableProviders.mockReturnValue(providers);
      expect(controller.getProviders()).toBe(providers);
    });
  });

  describe('addProvider', () => {
    it('should add provider', () => {
      const dto: any = { type: 'paystack', config: {} };
      const provider = { type: 'paystack' };
      service.addProvider.mockReturnValue(provider);
      expect(controller.addProvider(dto)).toBe(provider);
      expect(service.addProvider).toHaveBeenCalledWith(dto.type, dto.config);
    });
  });

  describe('removeProvider', () => {
    it('should remove provider', () => {
      const type: any = 'paystack';
      expect(controller.removeProvider(type)).toEqual({ success: true });
      expect(service.removeProvider).toHaveBeenCalledWith(type);
    });
  });

  describe('createWallet', () => {
    it('should resolve key and create wallet', async () => {
      const req = mockRequest({ 'x-api-key': 'key' });
      const dto: any = { provider: 'paystack', payload: {} };
      const projectApiKey = { project: { id: 'p1' } };
      const providerKey = 'pk_test';
      const result = { id: 'w1' };

      projectApiKeyService.verifyProjectApiKey.mockResolvedValue(projectApiKey);
      projectProviderService.getProviderApiKeyForProject.mockResolvedValue(
        providerKey,
      );
      service.createWallet.mockResolvedValue(result);

      expect(await controller.createWallet(req as any, dto)).toBe(result);
      expect(projectApiKeyService.verifyProjectApiKey).toHaveBeenCalledWith(
        'key',
      );
      expect(
        projectProviderService.getProviderApiKeyForProject,
      ).toHaveBeenCalledWith('p1', 'paystack');
      expect(service.createWallet).toHaveBeenCalledWith(
        'paystack',
        providerKey,
        dto.payload,
      );
    });

    it('should throw UnauthorizedException if no key', async () => {
      const req = mockRequest({});
      const dto: any = { provider: 'paystack' };
      await expect(controller.createWallet(req as any, dto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should resolve key from Authorization header', async () => {
      const req = mockRequest({ authorization: 'Bearer auth-key' });
      const dto: any = { provider: 'paystack', payload: {} };
      const projectApiKey = { project: { id: 'p1' } };
      const providerKey = 'pk_auth';

      projectApiKeyService.verifyProjectApiKey.mockResolvedValue(projectApiKey);
      projectProviderService.getProviderApiKeyForProject.mockResolvedValue(
        providerKey,
      );
      service.createWallet.mockResolvedValue('ok');

      const result = await controller.createWallet(req as any, dto);
      expect(result).toBe('ok');
      expect(projectApiKeyService.verifyProjectApiKey).toHaveBeenCalledWith(
        'auth-key',
      );
    });

    it('should resolve key from array x-api-key header', async () => {
      const req = mockRequest({ 'x-api-key': ['key-1', 'key-2'] });
      const dto: any = { provider: 'paystack', payload: {} };
      const projectApiKey = { project: { id: 'p1' } };
      const providerKey = 'pk_array';

      projectApiKeyService.verifyProjectApiKey.mockResolvedValue(projectApiKey);
      projectProviderService.getProviderApiKeyForProject.mockResolvedValue(
        providerKey,
      );
      service.createWallet.mockResolvedValue('ok');

      const result = await controller.createWallet(req as any, dto);
      expect(result).toBe('ok');
      expect(projectApiKeyService.verifyProjectApiKey).toHaveBeenCalledWith(
        'key-1',
      );
    });
  });

  describe('handleAction', () => {
    it('should handle create wallet action', async () => {
      const req = mockRequest({ 'x-api-key': 'key' });
      const dto: any = {
        provider: 'paystack',
        action: WALLET_ACTION_ENUM.CREATE_WALLET,
        payload: {},
      };
      projectApiKeyService.verifyProjectApiKey.mockResolvedValue({
        project: { id: 'p1' },
      });
      projectProviderService.getProviderApiKeyForProject.mockResolvedValue(
        'pk_test',
      );
      service.createWallet.mockResolvedValue('ok');

      expect(await controller.handleAction(req as any, dto)).toBe('ok');
      expect(service.createWallet).toHaveBeenCalled();
    });

    it('should handle fetch wallet action', async () => {
      const req = mockRequest({ 'x-api-key': 'key' });
      const dto: any = {
        provider: 'paystack',
        action: WALLET_ACTION_ENUM.FETCH_WALLET,
        payload: {},
      };
      projectApiKeyService.verifyProjectApiKey.mockResolvedValue({
        project: { id: 'p1' },
      });
      projectProviderService.getProviderApiKeyForProject.mockResolvedValue(
        'pk_test',
      );
      service.fetchWallet.mockResolvedValue('ok');

      expect(await controller.handleAction(req as any, dto)).toBe('ok');
      expect(service.fetchWallet).toHaveBeenCalled();
    });

    it('should handle list wallets action', async () => {
      const req = mockRequest({ 'x-api-key': 'key' });
      const dto: any = {
        provider: 'paystack',
        action: WALLET_ACTION_ENUM.LIST_WALLETS,
        payload: {},
      };
      projectApiKeyService.verifyProjectApiKey.mockResolvedValue({
        project: { id: 'p1' },
      });
      projectProviderService.getProviderApiKeyForProject.mockResolvedValue(
        'pk_test',
      );
      service.listWallets.mockResolvedValue('ok');

      expect(await controller.handleAction(req as any, dto)).toBe('ok');
      expect(service.listWallets).toHaveBeenCalled();
    });

    it('should handle deposit action', async () => {
      const req = mockRequest({ 'x-api-key': 'key' });
      const dto: any = {
        provider: 'paystack',
        action: WALLET_ACTION_ENUM.DEPOSIT,
        payload: {},
      };
      projectApiKeyService.verifyProjectApiKey.mockResolvedValue({
        project: { id: 'p1' },
      });
      projectProviderService.getProviderApiKeyForProject.mockResolvedValue(
        'pk_test',
      );
      service.deposit.mockResolvedValue('ok');

      expect(await controller.handleAction(req as any, dto)).toBe('ok');
      expect(service.deposit).toHaveBeenCalled();
    });

    it('should handle withdraw action', async () => {
      const req = mockRequest({ 'x-api-key': 'key' });
      const dto: any = {
        provider: 'paystack',
        action: WALLET_ACTION_ENUM.WITHDRAW,
        payload: {},
      };
      projectApiKeyService.verifyProjectApiKey.mockResolvedValue({
        project: { id: 'p1' },
      });
      projectProviderService.getProviderApiKeyForProject.mockResolvedValue(
        'pk_test',
      );
      service.withdraw.mockResolvedValue('ok');

      expect(await controller.handleAction(req as any, dto)).toBe('ok');
      expect(service.withdraw).toHaveBeenCalled();
    });

    it('should throw BadRequestException for unsupported action', async () => {
      const req = mockRequest({ 'x-api-key': 'key' });
      const dto: any = {
        provider: 'paystack',
        action: 'UNKNOWN',
        payload: {},
      };
      projectApiKeyService.verifyProjectApiKey.mockResolvedValue({
        project: { id: 'p1' },
      });
      projectProviderService.getProviderApiKeyForProject.mockResolvedValue(
        'pk_test',
      );

      await expect(controller.handleAction(req as any, dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
