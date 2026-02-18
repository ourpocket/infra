import { FlutterwaveService } from '../../../src/services/web2/flutterwave.service';
import { WEB2_ENDPOINT_URL } from '../../../src/constant';
import createAxiosInstance from '../../../src/configs/axios.config';

jest.mock('../../../src/configs/axios.config');

describe('FlutterwaveService', () => {
  let service: FlutterwaveService;
  let mockAxios: any;

  beforeEach(() => {
    mockAxios = {
      get: jest.fn(),
      post: jest.fn(),
    };
    (createAxiosInstance as jest.Mock).mockReturnValue(mockAxios);
    service = new FlutterwaveService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createWallet', () => {
    it('should create wallet', async () => {
      const payload: any = { email: 'test@test.com' };
      mockAxios.post.mockResolvedValue({ data: { status: 'success' } });

      const result = await service.createWallet('key', payload);
      expect(mockAxios.post).toHaveBeenCalledWith(
        WEB2_ENDPOINT_URL.FLUTTERWAVE.VIRTUAL_ACCOUNTS.CREATE,
        payload,
      );
      expect(result).toEqual({ status: 'success' });
    });
  });

  describe('fetchWallet', () => {
    it('should fetch wallet', async () => {
      const payload: any = { accountReference: 'ref_123' };
      mockAxios.get.mockResolvedValue({ data: { status: 'success' } });

      const result = await service.fetchWallet('key', payload);
      expect(mockAxios.get).toHaveBeenCalledWith(
        WEB2_ENDPOINT_URL.FLUTTERWAVE.VIRTUAL_ACCOUNTS.GET('ref_123'),
      );
      expect(result).toEqual({ status: 'success' });
    });

    it('should throw error if accountReference missing', async () => {
      await expect(service.fetchWallet('key', {})).rejects.toThrow(
        'accountReference is required',
      );
    });
  });

  describe('listWallets', () => {
    it('should list wallets', async () => {
      const payload: any = { page: 1 };
      mockAxios.get.mockResolvedValue({ data: { status: 'success' } });

      const result = await service.listWallets('key', payload);
      expect(mockAxios.get).toHaveBeenCalledWith(
        WEB2_ENDPOINT_URL.FLUTTERWAVE.VIRTUAL_ACCOUNTS.LIST,
        { params: payload },
      );
      expect(result).toEqual({ status: 'success' });
    });
  });

  describe('deposit', () => {
    it('should charge card', async () => {
      const payload: any = { amount: 100 };
      mockAxios.post.mockResolvedValue({ data: { status: 'success' } });

      const result = await service.deposit('key', payload);
      expect(mockAxios.post).toHaveBeenCalledWith(
        WEB2_ENDPOINT_URL.FLUTTERWAVE.CHARGES.BASE,
        payload,
        { params: { type: 'card' } },
      );
      expect(result).toEqual({ status: 'success' });
    });
  });

  describe('withdraw', () => {
    it('should initiate transfer', async () => {
      const payload: any = { amount: 100 };
      mockAxios.post.mockResolvedValue({ data: { status: 'success' } });

      const result = await service.withdraw('key', payload);
      expect(mockAxios.post).toHaveBeenCalledWith(
        WEB2_ENDPOINT_URL.FLUTTERWAVE.TRANSFERS.CREATE,
        payload,
      );
      expect(result).toEqual({ status: 'success' });
    });
  });
});
