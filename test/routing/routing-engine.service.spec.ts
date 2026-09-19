import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import {
  PROVIDER_TYPE_ENUM,
  ROUTING_STRATEGY_ENUM,
  WALLET_ACTION_ENUM,
} from '../../src/enums';
import { RoutingEngineService } from '../../src/routing/routing-engine.service';

describe('RoutingEngineService', () => {
  let service: RoutingEngineService;
  let paystackService: any;
  let flutterwaveService: any;
  let ledgerService: any;
  let retryEngineService: any;

  beforeEach(() => {
    paystackService = {
      createWallet: jest.fn(),
      fetchWallet: jest.fn(),
      listWallets: jest.fn(),
      deposit: jest.fn(),
      withdraw: jest.fn(),
    };
    flutterwaveService = {
      createWallet: jest.fn(),
      fetchWallet: jest.fn(),
      listWallets: jest.fn(),
      deposit: jest.fn(),
      withdraw: jest.fn(),
    };
    ledgerService = {
      executeTransaction: jest.fn(),
    };
    retryEngineService = {
      execute: jest.fn((operation) => operation()),
    };
    service = new RoutingEngineService(
      paystackService,
      flutterwaveService,
      ledgerService,
      retryEngineService,
    );
  });

  it('returns null when no provider route is requested', () => {
    expect(service.resolveProviderRoute({})).toBeNull();
  });

  it('resolves a direct provider with request api key', () => {
    expect(
      service.resolveProviderRoute({
        provider: PROVIDER_TYPE_ENUM.FLUTTERWAVE,
        apiKey: 'flw-key',
      }),
    ).toEqual({
      provider: PROVIDER_TYPE_ENUM.FLUTTERWAVE,
      apiKey: 'flw-key',
    });
  });

  it('rejects direct providers without provider credentials', () => {
    expect(() =>
      service.resolveProviderRoute({
        provider: PROVIDER_TYPE_ENUM.PAYSTACK,
      }),
    ).toThrow(UnauthorizedException);
  });

  it('selects the highest success rate by default', () => {
    expect(
      service.resolveProviderRoute({
        providerCredentials: [
          {
            provider: PROVIDER_TYPE_ENUM.PAYSTACK,
            apiKey: 'paystack-key',
            successRate: 97,
          },
          {
            provider: PROVIDER_TYPE_ENUM.FLUTTERWAVE,
            apiKey: 'flw-key',
            successRate: 99,
          },
        ],
      }),
    ).toEqual({
      provider: PROVIDER_TYPE_ENUM.FLUTTERWAVE,
      apiKey: 'flw-key',
    });
  });

  it('selects the lowest fee route', () => {
    expect(
      service.resolveProviderRoute({
        routingStrategy: ROUTING_STRATEGY_ENUM.LOWEST_FEES,
        providerCredentials: [
          {
            provider: PROVIDER_TYPE_ENUM.PAYSTACK,
            apiKey: 'paystack-key',
            feePercentage: 1.5,
          },
          {
            provider: PROVIDER_TYPE_ENUM.FLUTTERWAVE,
            apiKey: 'flw-key',
            feePercentage: 1,
          },
        ],
      }),
    ).toEqual({
      provider: PROVIDER_TYPE_ENUM.FLUTTERWAVE,
      apiKey: 'flw-key',
    });
  });

  it('selects a custom priority route', () => {
    expect(
      service.resolveProviderRoute({
        routingStrategy: ROUTING_STRATEGY_ENUM.CUSTOM_PRIORITY,
        providerPriority: [
          PROVIDER_TYPE_ENUM.FLUTTERWAVE,
          PROVIDER_TYPE_ENUM.PAYSTACK,
        ],
        providerCredentials: [
          {
            provider: PROVIDER_TYPE_ENUM.PAYSTACK,
            apiKey: 'paystack-key',
            priority: 1,
          },
          {
            provider: PROVIDER_TYPE_ENUM.FLUTTERWAVE,
            apiKey: 'flw-key',
            priority: 2,
          },
        ],
      }),
    ).toEqual({
      provider: PROVIDER_TYPE_ENUM.FLUTTERWAVE,
      apiKey: 'flw-key',
    });
  });

  it('rejects unsupported providers', () => {
    expect(() =>
      service.resolveProviderRoute({
        provider: PROVIDER_TYPE_ENUM.PAGA,
        apiKey: 'paga-key',
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects legacy wallet writes without contacting providers or the external ledger', async () => {
    for (const action of [
      WALLET_ACTION_ENUM.CREATE_WALLET,
      WALLET_ACTION_ENUM.DEPOSIT,
    ]) {
      await expect(
        service.executeProviderAction(
          { provider: PROVIDER_TYPE_ENUM.PAYSTACK, apiKey: 'fixture' },
          action,
          { amount: '5000' },
        ),
      ).rejects.toThrow(BadRequestException);
    }
    expect(paystackService.deposit).not.toHaveBeenCalled();
    expect(flutterwaveService.createWallet).not.toHaveBeenCalled();
    expect(ledgerService.executeTransaction).not.toHaveBeenCalled();
  });
});
