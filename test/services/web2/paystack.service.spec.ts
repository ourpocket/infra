import { PaystackService } from '../../../src/services/web2/paystack.service';
import { WEB2_ENDPOINT_URL } from '../../../src/constant';
import createAxiosInstance from '../../../src/configs/axios.config';

jest.mock('../../../src/configs/axios.config');

describe('PaystackService', () => {
  let service: PaystackService;
  let mockAxios: any;

  beforeEach(() => {
    mockAxios = {
      get: jest.fn(),
      post: jest.fn(),
    };
    (createAxiosInstance as jest.Mock).mockReturnValue(mockAxios);
    service = new PaystackService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createWallet', () => {
    it('should create wallet', async () => {
      const payload: any = { email: 'test@test.com' };
      mockAxios.post.mockResolvedValue({ data: { status: true } });

      const result = await service.createWallet('key', payload);
      expect(mockAxios.post).toHaveBeenCalledWith(
        WEB2_ENDPOINT_URL.PAYSTACK.CUSTOMER.CREATE,
        payload,
      );
      expect(result).toEqual({ status: true });
    });
  });

  describe('fetchWallet', () => {
    it('should fetch wallet', async () => {
      const payload: any = { customerCode: 'CUS_123' };
      mockAxios.get.mockResolvedValue({ data: { status: true } });

      const result = await service.fetchWallet('key', payload);
      expect(mockAxios.get).toHaveBeenCalledWith(
        WEB2_ENDPOINT_URL.PAYSTACK.CUSTOMER.GET('CUS_123'),
      );
      expect(result).toEqual({ status: true });
    });

    it('should throw error if customerCode missing', async () => {
      await expect(service.fetchWallet('key', {})).rejects.toThrow(
        'customerCode is required',
      );
    });
  });

  describe('listWallets', () => {
    it('should list wallets', async () => {
      const payload: any = { perPage: 10 };
      mockAxios.get.mockResolvedValue({ data: { status: true } });

      const result = await service.listWallets('key', payload);
      expect(mockAxios.get).toHaveBeenCalledWith(
        WEB2_ENDPOINT_URL.PAYSTACK.CUSTOMER.LIST,
        { params: payload },
      );
      expect(result).toEqual({ status: true });
    });
  });

  describe('deposit', () => {
    it('should initialize deposit', async () => {
      const payload: any = { amount: 100 };
      mockAxios.post.mockResolvedValue({ data: { status: true } });

      const result = await service.deposit('key', payload);
      expect(mockAxios.post).toHaveBeenCalledWith(
        WEB2_ENDPOINT_URL.PAYSTACK.TRANSACTION.INITIALIZE,
        payload,
      );
      expect(result).toEqual({ status: true });
    });
  });

  describe('withdraw', () => {
    it('should initiate transfer', async () => {
      const payload: any = { amount: 100 };
      mockAxios.post.mockResolvedValue({ data: { status: true } });

      const result = await service.withdraw('key', payload);
      expect(mockAxios.post).toHaveBeenCalledWith(
        WEB2_ENDPOINT_URL.PAYSTACK.TRANSFER.CREATE,
        payload,
      );
      expect(result).toEqual({ status: true });
    });
  });
});
