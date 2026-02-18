import { Test, TestingModule } from '@nestjs/testing';
import { WalletsService } from '../../src/wallets/wallets.service';
import { WalletRepository } from '../../src/wallets/wallet.repository';
import { ProjectAccountRepository } from '../../src/wallets/project-account.repository';
import { ProjectApiKeyService } from '../../src/project/project-api-key.service';
import { ProjectProviderService } from '../../src/project/project-provider.service';
import { WalletProviderService } from '../../src/wallet-provider/wallet-provider.service';
import { LedgerService } from '../../src/ledger/ledger.service';
import { CreateWalletRequestDto } from '../../src/wallets/dto/create-wallet.dto';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { TransferRequestDto } from '../../src/wallets/dto/transfer.dto';
import { CreditWalletRequestDto } from '../../src/wallets/dto/credit-wallet.dto';
import { DebitWalletRequestDto } from '../../src/wallets/dto/debit-wallet.dto';
import { PROVIDER_TYPE_ENUM } from '../../src/enums';

describe('WalletsService', () => {
  let service: WalletsService;
  let walletRepository: any;
  let projectAccountRepository: any;
  let projectApiKeyService: any;
  let projectProviderService: any;
  let walletProviderService: any;
  let ledgerService: any;

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
    projectAccountRepository = {
      findByIdAndProjectId: jest.fn(),
    };
    projectApiKeyService = {
      verifyProjectApiKey: jest.fn(),
    };
    projectProviderService = {
      getProviderApiKeyForProject: jest.fn(),
    };
    walletProviderService = {
      deposit: jest.fn(),
      withdraw: jest.fn(),
    };
    ledgerService = {
      getWalletBalance: jest.fn(),
      executeTransaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletsService,
        {
          provide: WalletRepository,
          useValue: walletRepository,
        },
        {
          provide: ProjectAccountRepository,
          useValue: projectAccountRepository,
        },
        {
          provide: ProjectApiKeyService,
          useValue: projectApiKeyService,
        },
        {
          provide: ProjectProviderService,
          useValue: projectProviderService,
        },
        {
          provide: WalletProviderService,
          useValue: walletProviderService,
        },
        {
          provide: LedgerService,
          useValue: ledgerService,
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

    it('should throw NotFoundException if account not found', async () => {
      projectApiKeyService.verifyProjectApiKey.mockResolvedValue(
        mockProjectApiKey,
      );
      projectAccountRepository.findByIdAndProjectId.mockResolvedValue(null);
      const dtoWithAccount = { ...dto, accountId: 'acc-id' };

      await expect(
        service.createWallet(mockApiKey, dtoWithAccount),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create wallet with account', async () => {
      projectApiKeyService.verifyProjectApiKey.mockResolvedValue(
        mockProjectApiKey,
      );
      const account = { id: 'acc-id' };
      projectAccountRepository.findByIdAndProjectId.mockResolvedValue(account);
      const dtoWithAccount = { ...dto, accountId: 'acc-id' };
      const newWallet = { id: 'wallet-id', ...dtoWithAccount };

      walletRepository.create.mockReturnValue(newWallet);
      walletRepository.save.mockResolvedValue(newWallet);

      const result = await service.createWallet(mockApiKey, dtoWithAccount);
      expect(walletRepository.create).toHaveBeenCalledWith({
        project: mockProject,
        account,
        currency: 'USD',
      });
      expect(result).toEqual(newWallet);
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
      };
      projectApiKeyService.verifyProjectApiKey.mockResolvedValue(
        mockProjectApiKey,
      );
      walletRepository.findByIdAndProjectIdWithoutRelations.mockResolvedValue({
        id: 'w1',
        currency: 'USD',
      });
      projectProviderService.getProviderApiKeyForProject.mockResolvedValue(
        'provider-key',
      );
      const transaction = { id: 'tx-1' };
      walletProviderService.deposit.mockResolvedValue(transaction);

      const result = await service.credit(mockApiKey, dtoWithProvider);

      expect(
        projectProviderService.getProviderApiKeyForProject,
      ).toHaveBeenCalledWith(mockProject.id, PROVIDER_TYPE_ENUM.PAYSTACK);
      expect(walletProviderService.deposit).toHaveBeenCalledWith(
        PROVIDER_TYPE_ENUM.PAYSTACK,
        'provider-key',
        expect.objectContaining({
          ledger: expect.objectContaining({
            projectId: mockProject.id,
            type: 'credit',
          }),
        }),
      );
      expect(result).toBe(transaction);
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
      };
      projectApiKeyService.verifyProjectApiKey.mockResolvedValue(
        mockProjectApiKey,
      );
      walletRepository.findByIdAndProjectIdWithoutRelations.mockResolvedValue({
        id: 'w1',
        currency: 'USD',
      });
      projectProviderService.getProviderApiKeyForProject.mockResolvedValue(
        'provider-key',
      );
      const transaction = { id: 'tx-1' };
      walletProviderService.withdraw.mockResolvedValue(transaction);

      const result = await service.debit(mockApiKey, dtoWithProvider);

      expect(walletProviderService.withdraw).toHaveBeenCalledWith(
        PROVIDER_TYPE_ENUM.PAYSTACK,
        'provider-key',
        expect.objectContaining({
          ledger: expect.objectContaining({
            projectId: mockProject.id,
            type: 'debit',
          }),
        }),
      );
      expect(result).toBe(transaction);
    });
  });
});
