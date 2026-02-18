import { PagaService } from '../../../src/services/web2/paga.service';
import { WEB2_ENDPOINT_URL } from '../../../src/constant';
import createAxiosInstance from '../../../src/configs/axios.config';

jest.mock('../../../src/configs/axios.config');

describe('PagaService', () => {
  let service: PagaService;
  let mockAxios: any;

  beforeEach(() => {
    mockAxios = {
      post: jest.fn(),
    };
    (createAxiosInstance as jest.Mock).mockReturnValue(mockAxios);
    service = new PagaService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createWallet', () => {
    it('should create wallet', async () => {
      const payload: any = { account: '123' };
      mockAxios.post.mockResolvedValue({ data: { status: 'ok' } });

      const result = await service.createWallet('key', payload);
      expect(mockAxios.post).toHaveBeenCalledWith(
        WEB2_ENDPOINT_URL.PAGA.WALLET.CREATE,
        payload,
      );
      expect(result).toEqual({ status: 'ok' });
    });
  });

  describe('fetchWallet', () => {
    it('should fetch wallet', async () => {
      const payload: any = { id: 'w1' };
      mockAxios.post.mockResolvedValue({ data: { status: 'ok' } });

      const result = await service.fetchWallet('key', payload);
      expect(mockAxios.post).toHaveBeenCalledWith(
        WEB2_ENDPOINT_URL.PAGA.WALLET.GET,
        payload,
      );
      expect(result).toEqual({ status: 'ok' });
    });
  });

  describe('listWallets', () => {
    it('should list wallets', async () => {
      const payload: any = {};
      mockAxios.post.mockResolvedValue({ data: { status: 'ok' } });

      const result = await service.listWallets('key', payload);
      expect(mockAxios.post).toHaveBeenCalledWith(
        WEB2_ENDPOINT_URL.PAGA.WALLET.LIST,
        payload,
      );
      expect(result).toEqual({ status: 'ok' });
    });
  });

  describe('deposit', () => {
    it('should deposit', async () => {
      const payload: any = { amount: 100 };
      mockAxios.post.mockResolvedValue({ data: { status: 'ok' } });

      const result = await service.deposit('key', payload);
      expect(mockAxios.post).toHaveBeenCalledWith(
        WEB2_ENDPOINT_URL.PAGA.WALLET.FUND,
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
        WEB2_ENDPOINT_URL.PAGA.WALLET.WITHDRAW,
        payload,
      );
      expect(result).toEqual({ status: 'ok' });
    });
  });
});
