import { Test, TestingModule } from '@nestjs/testing';
import { LedgerService } from '../../src/ledger/ledger.service';
import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException } from '@nestjs/common';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;
let postMock: jest.Mock;
let getMock: jest.Mock;

describe('LedgerService', () => {
  let service: LedgerService;
  let configService: any;

  beforeEach(async () => {
    configService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LedgerService,
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    service = module.get<LedgerService>(LedgerService);
    postMock = jest.fn();
    getMock = jest.fn();
    (mockedAxios as any).post = postMock;
    (mockedAxios as any).get = getMock;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('executeTransaction', () => {
    const payload: any = { projectId: 'p1', entries: [] };

    it('should throw InternalServerErrorException if URL not configured', async () => {
      configService.get.mockReturnValue(null);
      await expect(service.executeTransaction(payload)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should execute transaction successfully', async () => {
      configService.get.mockReturnValue('http://ledger');
      const response = { data: { id: 'tx1' } };
      postMock.mockResolvedValue(response);

      const result = await service.executeTransaction(payload);
      expect(postMock).toHaveBeenCalledWith(
        'http://ledger/transactions',
        payload,
      );
      expect(result).toBe(response.data);
    });

    it('should throw InternalServerErrorException if axios fails', async () => {
      configService.get.mockReturnValue('http://ledger');
      postMock.mockRejectedValue(new Error('Network Error'));

      await expect(service.executeTransaction(payload)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('getWalletBalance', () => {
    const projectId = 'p1';
    const walletId = 'w1';

    it('should throw InternalServerErrorException if URL not configured', async () => {
      configService.get.mockReturnValue(null);
      await expect(
        service.getWalletBalance(projectId, walletId),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should get balance successfully', async () => {
      configService.get.mockReturnValue('http://ledger');
      const response = { data: { balance: 100 } };
      getMock.mockResolvedValue(response);

      const result = await service.getWalletBalance(projectId, walletId);
      expect(getMock).toHaveBeenCalledWith(
        `http://ledger/wallets/${walletId}/balance`,
        { params: { projectId } },
      );
      expect(result).toBe(response.data);
    });

    it('should throw InternalServerErrorException if axios fails', async () => {
      configService.get.mockReturnValue('http://ledger');
      getMock.mockRejectedValue(new Error('Network Error'));

      await expect(
        service.getWalletBalance(projectId, walletId),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });
});
