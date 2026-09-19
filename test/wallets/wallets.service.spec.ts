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

  it('rejects legacy creation without creating misleading wallets', async () => {
    projectApiKeyService.verifyProjectApiKey.mockResolvedValue(
      mockProjectApiKey,
    );
    await expect(
      service.createWallet(mockApiKey, { currency: 'NGN' }),
    ).rejects.toThrow('production wallet creation is unavailable');
    expect(walletRepository.save).not.toHaveBeenCalled();
    expect(routingEngineService.executeProviderAction).not.toHaveBeenCalled();
  });
  it('keeps legacy records readable without claiming a new environment balance', async () => {
    projectApiKeyService.verifyProjectApiKey.mockResolvedValue(
      mockProjectApiKey,
    );
    const wallet = { id: 'legacy-wallet', currency: 'NGN' };
    walletRepository.findByIdAndProjectId.mockResolvedValue(wallet);
    expect(await service.getWallet(mockApiKey, wallet.id)).toEqual({
      wallet,
      balance: null,
      environment: 'legacy',
    });
    expect(walletRepository.findByIdAndProjectId).toHaveBeenCalledWith(
      wallet.id,
      mockProject.id,
    );
    expect(ledgerService.getWalletBalance).not.toHaveBeenCalled();
  });
  it('does not expose another project’s legacy wallet', async () => {
    projectApiKeyService.verifyProjectApiKey.mockResolvedValue(
      mockProjectApiKey,
    );
    await expect(service.getWallet(mockApiKey, 'other-wallet')).rejects.toThrow(
      NotFoundException,
    );
  });
  it('rejects all legacy financial writes without invoking providers or the external ledger', async () => {
    await expect(
      service.transfer(mockApiKey, {
        fromWalletId: 'a',
        toWalletId: 'b',
        amount: '100',
        currency: 'NGN',
        reference: 'legacy-transfer',
      }),
    ).rejects.toThrow('Legacy wallet writes are unavailable');
    await expect(
      service.credit(mockApiKey, {
        walletId: 'a',
        amount: '100',
        currency: 'NGN',
        reference: 'legacy-write',
      }),
    ).rejects.toThrow('Legacy wallet writes are unavailable');
    await expect(
      service.debit(mockApiKey, {
        walletId: 'a',
        amount: '100',
        currency: 'NGN',
        reference: 'legacy-write',
      }),
    ).rejects.toThrow('Legacy wallet writes are unavailable');
    expect(walletRepository.save).not.toHaveBeenCalled();
    expect(ledgerService.executeTransaction).not.toHaveBeenCalled();
    expect(routingEngineService.executeProviderAction).not.toHaveBeenCalled();
  });
});
