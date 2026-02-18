import { FingraService } from '../../../src/services/web2/fingra.service';
import { WEB2_ENDPOINT_URL } from '../../../src/constant';
import createAxiosInstance from '../../../src/configs/axios.config';

jest.mock('../../../src/configs/axios.config');

describe('FingraService', () => {
  let service: FingraService;
  let mockAxios: any;

  beforeEach(() => {
    mockAxios = {
      get: jest.fn(),
      post: jest.fn(),
    };
    (createAxiosInstance as jest.Mock).mockReturnValue(mockAxios);
    service = new FingraService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createWallet', () => {
    it('should create wallet', async () => {
      const payload: any = { name: 'Test Wallet' };
      mockAxios.post.mockResolvedValue({ data: { id: 'w1' } });

      const result = await service.createWallet('key', payload);
      expect(mockAxios.post).toHaveBeenCalledWith(
        WEB2_ENDPOINT_URL.FINGRA.WALLETS.CREATE,
        payload,
      );
      expect(result).toEqual({ id: 'w1' });
    });
  });

  describe('fetchWallet', () => {
    it('should fetch wallet', async () => {
      const payload: any = { walletId: 'w1' };
      mockAxios.get.mockResolvedValue({ data: { id: 'w1' } });

      const result = await service.fetchWallet('key', payload);
      expect(mockAxios.get).toHaveBeenCalledWith(
        WEB2_ENDPOINT_URL.FINGRA.WALLETS.GET('w1'),
      );
      expect(result).toEqual({ id: 'w1' });
    });

    it('should throw error if walletId missing', async () => {
      await expect(service.fetchWallet('key', {})).rejects.toThrow(
        'walletId is required',
      );
    });
  });

  describe('listWallets', () => {
    it('should list wallets', async () => {
      const payload: any = {};
      mockAxios.get.mockResolvedValue({ data: [] });

      const result = await service.listWallets('key', payload);
      expect(mockAxios.get).toHaveBeenCalledWith(
        WEB2_ENDPOINT_URL.FINGRA.WALLETS.LIST,
        { params: payload },
      );
      expect(result).toEqual([]);
    });
  });

  describe('deposit', () => {
    it('should deposit', async () => {
      const payload: any = { amount: 100 };
      mockAxios.post.mockResolvedValue({ data: { status: 'ok' } });

      const result = await service.deposit('key', payload);
      expect(mockAxios.post).toHaveBeenCalledWith(
        WEB2_ENDPOINT_URL.FINGRA.WALLETS.DEPOSIT,
        payload,
      );
      expect(result).toEqual({ status: 'ok' });
    });
  });

  describe('withdraw', () => {
    it('should withdraw', async () => {
      const payload: any = { amount: 100 };
      mockAxios.post.mockResolvedValue({ data: { status: 'ok' } });

      const result = await service.withdraw('key', payload);
      expect(mockAxios.post).toHaveBeenCalledWith(
        WEB2_ENDPOINT_URL.FINGRA.WALLETS.WITHDRAW,
        payload,
      );
      expect(result).toEqual({ status: 'ok' });
    });
  });
});
