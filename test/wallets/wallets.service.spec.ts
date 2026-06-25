import { Test, TestingModule } from '@nestjs/testing';
import { WalletsService } from '../../src/wallets/wallets.service';
import { WalletRepository } from '../../src/wallets/wallet.repository';
import { ProjectApiKeyService } from '../../src/project/project-api-key.service';
import { LedgerService } from '../../src/ledger/ledger.service';
import { CreateWalletRequestDto } from '../../src/wallets/dto/create-wallet.dto';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { TransferRequestDto } from '../../src/wallets/dto/transfer.dto';
import { CreditWalletRequestDto } from '../../src/wallets/dto/credit-wallet.dto';
import { DebitWalletRequestDto } from '../../src/wallets/dto/debit-wallet.dto';
import { PROVIDER_TYPE_ENUM } from '../../src/enums';
import { RoutingEngineService } from '../../src/routing/routing-engine.service';

describe('WalletsService', () => {
  let service: WalletsService;
  let walletRepository: any;
  let projectApiKeyService: any;
  let ledgerService: any;
  let routingEngineService: any;

  const mockProject = { id: 'project-id' };
  const mockApiKey = 'api-key';
  const mockProjectApiKey = { project: mockProject };

  beforeEach(async () => {
    walletRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findByIdAndProjectId: jest.fn(),
      findByIdAndProjectIdWithoutRelations: jest.fn(),
    };
    projectApiKeyService = {
      verifyProjectApiKey: jest.fn(),
    };
    ledgerService = {
      getWalletBalance: jest.fn(),
      executeTransaction: jest.fn(),
    };
    routingEngineService = {
      resolveProviderRoute: jest.fn().mockReturnValue(null),
      executeProviderAction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletsService,
        {
          provide: WalletRepository,
          useValue: walletRepository,
        },
        {
          provide: ProjectApiKeyService,
          useValue: projectApiKeyService,
        },
        {
          provide: LedgerService,
          useValue: ledgerService,
        },
        {
          provide: RoutingEngineService,
          useValue: routingEngineService,
        },
      ],
    }).compile();

    service = module.get<WalletsService>(WalletsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createWallet', () => {
    const dto: CreateWalletRequestDto = {
      currency: 'usd',
    };

    it('should create wallet without account', async () => {
      projectApiKeyService.verifyProjectApiKey.mockResolvedValue(
        mockProjectApiKey,
      );
      const newWallet = { id: 'wallet-id', ...dto };
      walletRepository.create.mockReturnValue(newWallet);
      walletRepository.save.mockResolvedValue(newWallet);

      const result = await service.createWallet(mockApiKey, dto);

      expect(projectApiKeyService.verifyProjectApiKey).toHaveBeenCalledWith(
        mockApiKey,
      );
      expect(walletRepository.create).toHaveBeenCalledWith({
        project: mockProject,
        account: null,
        currency: 'USD',
      });
      expect(result).toEqual(newWallet);
    });

    it('should route provider wallet creation when credentials are supplied', async () => {
      const dtoWithProvider: CreateWalletRequestDto = {
        ...dto,
        userId: 'user_12345',
        provider: PROVIDER_TYPE_ENUM.FLUTTERWAVE,
        providerCredentials: [
          {
            provider: PROVIDER_TYPE_ENUM.FLUTTERWAVE,
            apiKey: 'provider-key',
          },
        ],
        providerPayload: {
          email: 'sudo.whoami@example.com',
        },
      };
      const newWallet = { id: 'wallet-id', currency: 'USD' };
      const providerResponse = { status: 'success' };

      projectApiKeyService.verifyProjectApiKey.mockResolvedValue(
        mockProjectApiKey,
      );
      walletRepository.create.mockReturnValue(newWallet);
      walletRepository.save.mockResolvedValue(newWallet);
      routingEngineService.resolveProviderRoute.mockReturnValue({
        provider: PROVIDER_TYPE_ENUM.FLUTTERWAVE,
        apiKey: 'provider-key',
      });
      routingEngineService.executeProviderAction.mockResolvedValue(
        providerResponse,
      );

      const result = await service.createWallet(mockApiKey, dtoWithProvider);

      expect(routingEngineService.resolveProviderRoute).toHaveBeenCalledWith(
        dtoWithProvider,
      );
      expect(routingEngineService.executeProviderAction).toHaveBeenCalledWith(
        {
          provider: PROVIDER_TYPE_ENUM.FLUTTERWAVE,
          apiKey: 'provider-key',
        },
        'create_wallet',
        {
          email: 'sudo.whoami@example.com',
          userId: 'user_12345',
          walletId: 'wallet-id',
          currency: 'USD',
        },
      );
      expect(result).toEqual({
        wallet: newWallet,
        selectedProvider: PROVIDER_TYPE_ENUM.FLUTTERWAVE,
        provider: providerResponse,
      });
    });
  });

  describe('getWallet', () => {
    const walletId = 'wallet-id';

    it('should throw NotFoundException if wallet not found', async () => {
      projectApiKeyService.verifyProjectApiKey.mockResolvedValue(
        mockProjectApiKey,
      );
      walletRepository.findByIdAndProjectId.mockResolvedValue(null);

      await expect(service.getWallet(mockApiKey, walletId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return wallet and balance', async () => {
      projectApiKeyService.verifyProjectApiKey.mockResolvedValue(
        mockProjectApiKey,
      );
      const wallet = { id: walletId };
      walletRepository.findByIdAndProjectId.mockResolvedValue(wallet);
      const balance = 100;
      ledgerService.getWalletBalance.mockResolvedValue(balance);

      const result = await service.getWallet(mockApiKey, walletId);

      expect(ledgerService.getWalletBalance).toHaveBeenCalledWith(
        mockProject.id,
        walletId,
      );
      expect(result).toEqual({ wallet, balance });
    });
  });

  describe('transfer', () => {
    const dto: TransferRequestDto = {
      fromWalletId: 'w1',
      toWalletId: 'w2',
      amount: '100',
      currency: 'USD',
      reference: 'ref',
    };

    it('should throw NotFoundException if fromWallet not found', async () => {
      projectApiKeyService.verifyProjectApiKey.mockResolvedValue(
        mockProjectApiKey,
      );
      walletRepository.findByIdAndProjectIdWithoutRelations
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'w2' });

      await expect(service.transfer(mockApiKey, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if toWallet not found', async () => {
      projectApiKeyService.verifyProjectApiKey.mockResolvedValue(
        mockProjectApiKey,
      );
      walletRepository.findByIdAndProjectIdWithoutRelations
        .mockResolvedValueOnce({ id: 'w1' })
        .mockResolvedValueOnce(null);

      await expect(service.transfer(mockApiKey, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw UnauthorizedException if currency mismatch', async () => {
      projectApiKeyService.verifyProjectApiKey.mockResolvedValue(
        mockProjectApiKey,
      );
      walletRepository.findByIdAndProjectIdWithoutRelations
        .mockResolvedValueOnce({ id: 'w1', currency: 'EUR' })
        .mockResolvedValueOnce({ id: 'w2', currency: 'USD' });

      await expect(service.transfer(mockApiKey, dto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should execute transfer', async () => {
      projectApiKeyService.verifyProjectApiKey.mockResolvedValue(
        mockProjectApiKey,
      );
      walletRepository.findByIdAndProjectIdWithoutRelations
        .mockResolvedValueOnce({ id: 'w1', currency: 'USD' })
        .mockResolvedValueOnce({ id: 'w2', currency: 'USD' });
      const transaction = { id: 'tx-1' };
      ledgerService.executeTransaction.mockResolvedValue(transaction);

      const result = await service.transfer(mockApiKey, dto);

      expect(ledgerService.executeTransaction).toHaveBeenCalledWith({
        projectId: mockProject.id,
        reference: dto.reference,
        type: 'transfer',
        metadata: dto.metadata,
        entries: [
          {
            walletId: dto.fromWalletId,
            amount: dto.amount,
            entryType: 'debit',
          },
          { walletId: dto.toWalletId, amount: dto.amount, entryType: 'credit' },
        ],
      });
      expect(result).toBe(transaction);
    });
  });

  describe('credit', () => {
    const dto: CreditWalletRequestDto = {
      walletId: 'w1',
      amount: '100',
      currency: 'USD',
      reference: 'ref',
    };

    it('should throw NotFoundException if wallet not found', async () => {
      projectApiKeyService.verifyProjectApiKey.mockResolvedValue(
        mockProjectApiKey,
      );
      walletRepository.findByIdAndProjectIdWithoutRelations.mockResolvedValue(
        null,
      );

      await expect(service.credit(mockApiKey, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw UnauthorizedException if currency mismatch', async () => {
      projectApiKeyService.verifyProjectApiKey.mockResolvedValue(
        mockProjectApiKey,
      );
      walletRepository.findByIdAndProjectIdWithoutRelations.mockResolvedValue({
        id: 'w1',
        currency: 'EUR',
      });

      await expect(service.credit(mockApiKey, dto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should execute credit without provider', async () => {
      projectApiKeyService.verifyProjectApiKey.mockResolvedValue(
        mockProjectApiKey,
      );
      walletRepository.findByIdAndProjectIdWithoutRelations.mockResolvedValue({
        id: 'w1',
        currency: 'USD',
      });
      const transaction = { id: 'tx-1' };
      ledgerService.executeTransaction.mockResolvedValue(transaction);

      const result = await service.credit(mockApiKey, dto);

      expect(ledgerService.executeTransaction).toHaveBeenCalledWith({
        projectId: mockProject.id,
        reference: dto.reference,
        type: 'credit',
        metadata: dto.metadata,
        entries: [
          { walletId: dto.walletId, amount: dto.amount, entryType: 'credit' },
        ],
      });
      expect(result).toBe(transaction);
    });

    it('should execute credit with provider', async () => {
      const dtoWithProvider: CreditWalletRequestDto = {
        ...dto,
        provider: PROVIDER_TYPE_ENUM.PAYSTACK,
        apiKey: 'provider-key',
      };
      projectApiKeyService.verifyProjectApiKey.mockResolvedValue(
        mockProjectApiKey,
      );
      walletRepository.findByIdAndProjectIdWithoutRelations.mockResolvedValue({
        id: 'w1',
        currency: 'USD',
      });
      routingEngineService.resolveProviderRoute.mockReturnValue({
        provider: PROVIDER_TYPE_ENUM.PAYSTACK,
        apiKey: 'provider-key',
      });
      const transaction = { id: 'tx-1' };
      routingEngineService.executeProviderAction.mockResolvedValue(transaction);

      const result = await service.credit(mockApiKey, dtoWithProvider);

      expect(routingEngineService.resolveProviderRoute).toHaveBeenCalledWith(
        dtoWithProvider,
      );
      expect(routingEngineService.executeProviderAction).toHaveBeenCalledWith(
        {
          provider: PROVIDER_TYPE_ENUM.PAYSTACK,
          apiKey: 'provider-key',
        },
        'deposit',
        expect.objectContaining({
          ledger: expect.objectContaining({
            projectId: mockProject.id,
            type: 'credit',
          }),
        }),
      );
      expect(result).toEqual({
        selectedProvider: PROVIDER_TYPE_ENUM.PAYSTACK,
        result: transaction,
      });
    });
  });

  describe('debit', () => {
    const dto: DebitWalletRequestDto = {
      walletId: 'w1',
      amount: '100',
      currency: 'USD',
      reference: 'ref',
    };

    it('should throw NotFoundException if wallet not found', async () => {
      projectApiKeyService.verifyProjectApiKey.mockResolvedValue(
        mockProjectApiKey,
      );
      walletRepository.findByIdAndProjectIdWithoutRelations.mockResolvedValue(
        null,
      );

      await expect(service.debit(mockApiKey, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw UnauthorizedException if currency mismatch', async () => {
      projectApiKeyService.verifyProjectApiKey.mockResolvedValue(
        mockProjectApiKey,
      );
      walletRepository.findByIdAndProjectIdWithoutRelations.mockResolvedValue({
        id: 'w1',
        currency: 'EUR',
      });

      await expect(service.debit(mockApiKey, dto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should execute debit without provider', async () => {
      projectApiKeyService.verifyProjectApiKey.mockResolvedValue(
        mockProjectApiKey,
      );
      walletRepository.findByIdAndProjectIdWithoutRelations.mockResolvedValue({
        id: 'w1',
        currency: 'USD',
      });
      const transaction = { id: 'tx-1' };
      ledgerService.executeTransaction.mockResolvedValue(transaction);

      const result = await service.debit(mockApiKey, dto);

      expect(ledgerService.executeTransaction).toHaveBeenCalledWith({
        projectId: mockProject.id,
        reference: dto.reference,
        type: 'debit',
        metadata: dto.metadata,
        entries: [
          { walletId: dto.walletId, amount: dto.amount, entryType: 'debit' },
        ],
      });
      expect(result).toBe(transaction);
    });

    it('should execute debit with provider', async () => {
      const dtoWithProvider: DebitWalletRequestDto = {
        ...dto,
        provider: PROVIDER_TYPE_ENUM.PAYSTACK,
        apiKey: 'provider-key',
      };
      projectApiKeyService.verifyProjectApiKey.mockResolvedValue(
        mockProjectApiKey,
      );
      walletRepository.findByIdAndProjectIdWithoutRelations.mockResolvedValue({
        id: 'w1',
        currency: 'USD',
      });
      routingEngineService.resolveProviderRoute.mockReturnValue({
        provider: PROVIDER_TYPE_ENUM.PAYSTACK,
        apiKey: 'provider-key',
      });
      const transaction = { id: 'tx-1' };
      routingEngineService.executeProviderAction.mockResolvedValue(transaction);

      const result = await service.debit(mockApiKey, dtoWithProvider);

      expect(routingEngineService.executeProviderAction).toHaveBeenCalledWith(
        {
          provider: PROVIDER_TYPE_ENUM.PAYSTACK,
          apiKey: 'provider-key',
        },
        'withdraw',
        expect.objectContaining({
          ledger: expect.objectContaining({
            projectId: mockProject.id,
            type: 'debit',
          }),
        }),
      );
      expect(routingEngineService.resolveProviderRoute).toHaveBeenCalledWith(
        dtoWithProvider,
      );
      expect(result).toEqual({
        selectedProvider: PROVIDER_TYPE_ENUM.PAYSTACK,
        result: transaction,
      });
    });
  });
});
