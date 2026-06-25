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

  it('dispatches wallet creation to the selected provider', async () => {
    flutterwaveService.createWallet.mockResolvedValue({ status: 'success' });

    await expect(
      service.executeProviderAction(
        {
          provider: PROVIDER_TYPE_ENUM.FLUTTERWAVE,
          apiKey: 'flw-key',
        },
        WALLET_ACTION_ENUM.CREATE_WALLET,
        {
          tx_ref: 'wallet_user_12345',
        },
      ),
    ).resolves.toEqual({ status: 'success' });

    expect(flutterwaveService.createWallet).toHaveBeenCalledWith('flw-key', {
      tx_ref: 'wallet_user_12345',
    });
  });

  it('executes provider deposit before ledger credit', async () => {
    paystackService.deposit.mockResolvedValue({ status: true });
    ledgerService.executeTransaction.mockResolvedValue({ id: 'ledger-tx' });

    await expect(
      service.executeProviderAction(
        {
          provider: PROVIDER_TYPE_ENUM.PAYSTACK,
          apiKey: 'paystack-key',
        },
        WALLET_ACTION_ENUM.DEPOSIT,
        {
          amount: '5000',
          ledger: {
            projectId: 'project-id',
            reference: 'ref_credit_10001',
            type: 'credit',
            entries: [
              {
                walletId: 'wallet-id',
                amount: '5000',
                entryType: 'credit',
              },
            ],
          },
        },
      ),
    ).resolves.toEqual({
      provider: { status: true },
      ledger: { id: 'ledger-tx' },
      selectedProvider: PROVIDER_TYPE_ENUM.PAYSTACK,
    });

    expect(paystackService.deposit).toHaveBeenCalledWith('paystack-key', {
      amount: '5000',
    });
    expect(ledgerService.executeTransaction).toHaveBeenCalledWith({
      projectId: 'project-id',
      reference: 'ref_credit_10001',
      type: 'credit',
      entries: [
        {
          walletId: 'wallet-id',
          amount: '5000',
          entryType: 'credit',
        },
      ],
    });
  });
});
