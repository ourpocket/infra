import { Test, TestingModule } from '@nestjs/testing';
import { WalletsController } from '../../src/wallets/wallets.controller';
import { WalletsService } from '../../src/wallets/wallets.service';
import { UnauthorizedException } from '@nestjs/common';

describe('WalletsController', () => {
  let controller: WalletsController;
  let service: any;

  beforeEach(async () => {
    service = {
      createWallet: jest.fn(),
      getWallet: jest.fn(),
      transfer: jest.fn(),
      credit: jest.fn(),
      debit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WalletsController],
      providers: [
        {
          provide: WalletsService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<WalletsController>(WalletsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  const mockRequest = (headers: any) => ({ headers });

  describe('resolveApiKey', () => {
    // Helper to test the private method via a public one, e.g. createWallet
    it('should extract key from x-api-key header', async () => {
      const req = mockRequest({ 'x-api-key': 'key-1' });
      await controller.createWallet(req as any, {} as any);
      expect(service.createWallet).toHaveBeenCalledWith(
        'key-1',
        expect.anything(),
      );
    });

    it('should extract key from Authorization Bearer header', async () => {
      const req = mockRequest({ authorization: 'Bearer key-2' });
      await controller.createWallet(req as any, {} as any);
      expect(service.createWallet).toHaveBeenCalledWith(
        'key-2',
        expect.anything(),
      );
    });

    it('should throw UnauthorizedException if no key provided', () => {
      const req = mockRequest({});
      expect(() => controller.createWallet(req as any, {} as any)).toThrow(
        UnauthorizedException,
      );
    });

    it('should handle array x-api-key header', async () => {
      const req = mockRequest({ 'x-api-key': ['key-3'] });
      await controller.createWallet(req as any, {} as any);
      expect(service.createWallet).toHaveBeenCalledWith(
        'key-3',
        expect.anything(),
      );
    });
  });

  describe('createWallet', () => {
    it('should call service.createWallet', async () => {
      const req = mockRequest({ 'x-api-key': 'key' });
      const dto: any = { currency: 'USD' };
      const result = { id: 'w1' };
      service.createWallet.mockResolvedValue(result);

      expect(await controller.createWallet(req as any, dto)).toBe(result);
      expect(service.createWallet).toHaveBeenCalledWith('key', dto);
    });
  });

  describe('getWallet', () => {
    it('should call service.getWallet', async () => {
      const req = mockRequest({ 'x-api-key': 'key' });
      const id = 'w1';
      const result = { id: 'w1' };
      service.getWallet.mockResolvedValue(result);

      expect(await controller.getWallet(req as any, id)).toBe(result);
      expect(service.getWallet).toHaveBeenCalledWith('key', id);
    });
  });

  describe('transfer', () => {
    it('should call service.transfer', async () => {
      const req = mockRequest({ 'x-api-key': 'key' });
      const dto: any = { amount: 100 };
      const result = { id: 'tx1' };
      service.transfer.mockResolvedValue(result);

      expect(await controller.transfer(req as any, dto)).toBe(result);
      expect(service.transfer).toHaveBeenCalledWith('key', dto);
    });
  });

  describe('credit', () => {
    it('should call service.credit', async () => {
      const req = mockRequest({ 'x-api-key': 'key' });
      const dto: any = { amount: 100 };
      const result = { id: 'tx1' };
      service.credit.mockResolvedValue(result);

      expect(await controller.credit(req as any, dto)).toBe(result);
      expect(service.credit).toHaveBeenCalledWith('key', dto);
    });
  });

  describe('debit', () => {
    it('should call service.debit', async () => {
      const req = mockRequest({ 'x-api-key': 'key' });
      const dto: any = { amount: 100 };
      const result = { id: 'tx1' };
      service.debit.mockResolvedValue(result);

      expect(await controller.debit(req as any, dto)).toBe(result);
      expect(service.debit).toHaveBeenCalledWith('key', dto);
    });
  });
});
