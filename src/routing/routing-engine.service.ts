import {
  BadRequestException,
  Injectable,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import {
  PROVIDER_TYPE_ENUM,
  ROUTING_STRATEGY_ENUM,
  WALLET_ACTION_ENUM,
} from '../enums';
import { ProviderCredentialDto } from './dto/provider-credential.dto';
import {
  IWalletProvider,
  WalletOperationPayload,
} from '../interface/wallet-provider-base.interface';
import { FlutterwaveService, PaystackService } from '../services/web2';
import { LedgerService } from '../ledger/ledger.service';
import { RetryEngineService } from '../retry/retry-engine.service';

interface ResolveProviderRouteInput {
  provider?: PROVIDER_TYPE_ENUM;
  apiKey?: string;
  providerApiKey?: string;
  providerCredentials?: ProviderCredentialDto[];
  routingStrategy?: ROUTING_STRATEGY_ENUM;
  providerPriority?: PROVIDER_TYPE_ENUM[];
}

interface ProviderRoute {
  provider: PROVIDER_TYPE_ENUM;
  apiKey: string;
}

const SUPPORTED_PROVIDERS: PROVIDER_TYPE_ENUM[] = [
  PROVIDER_TYPE_ENUM.PAYSTACK,
  PROVIDER_TYPE_ENUM.FLUTTERWAVE,
];

@Injectable()
export class RoutingEngineService {
  constructor(
    private readonly paystackService: PaystackService,
    private readonly flutterwaveService: FlutterwaveService,
    private readonly ledgerService: LedgerService,
    @Optional()
    private readonly retryEngineService?: RetryEngineService,
  ) {}

  resolveProviderRoute(input: ResolveProviderRouteInput): ProviderRoute | null {
    if (input.provider) {
      this.assertSupportedProvider(input.provider);
      return {
        provider: input.provider,
        apiKey: this.resolveApiKeyForProvider(input.provider, input),
      };
    }

    const candidates = this.getSupportedCredentials(input.providerCredentials);
    if (candidates.length === 0) {
      if (input.routingStrategy || input.providerPriority?.length) {
        throw new UnauthorizedException(
          'Provider credentials are required for routing',
        );
      }

      return null;
    }

    const selectedCredential = this.selectCredential(
      candidates,
      input.routingStrategy ?? ROUTING_STRATEGY_ENUM.BEST_SUCCESS_RATE,
      input.providerPriority ?? [],
    );

    return {
      provider: selectedCredential.provider,
      apiKey: selectedCredential.apiKey,
    };
  }

  listSupportedProviders(): PROVIDER_TYPE_ENUM[] {
    return [...SUPPORTED_PROVIDERS];
  }

  async executeProviderAction(
    route: ProviderRoute,
    action: WALLET_ACTION_ENUM,
    payload: WalletOperationPayload,
  ): Promise<unknown> {
    const provider = this.resolveProvider(route.provider);

    if (action === WALLET_ACTION_ENUM.CREATE_WALLET) {
      return this.executeProviderCall(() =>
        provider.createWallet(route.apiKey, payload),
      );
    }

    if (action === WALLET_ACTION_ENUM.FETCH_WALLET) {
      return this.executeProviderCall(() =>
        provider.fetchWallet(route.apiKey, payload),
      );
    }

    if (action === WALLET_ACTION_ENUM.LIST_WALLETS) {
      return this.executeProviderCall(() =>
        provider.listWallets(route.apiKey, payload),
      );
    }

    if (action === WALLET_ACTION_ENUM.DEPOSIT) {
      return this.executeLedgerProviderAction(
        route,
        payload,
        (providerPayload) => provider.deposit(route.apiKey, providerPayload),
      );
    }

    if (action === WALLET_ACTION_ENUM.WITHDRAW) {
      return this.executeLedgerProviderAction(
        route,
        payload,
        (providerPayload) => provider.withdraw(route.apiKey, providerPayload),
      );
    }

    throw new BadRequestException('Unsupported wallet action');
  }

  private resolveApiKeyForProvider(
    provider: PROVIDER_TYPE_ENUM,
    input: ResolveProviderRouteInput,
  ): string {
    const directApiKey = input.providerApiKey ?? input.apiKey;
    if (directApiKey) {
      return directApiKey;
    }

    const credential = input.providerCredentials?.find(
      (item) => item.provider === provider,
    );

    if (credential?.apiKey) {
      return credential.apiKey;
    }

    throw new UnauthorizedException('Provider API key is required');
  }

  private getSupportedCredentials(
    credentials: ProviderCredentialDto[] = [],
  ): ProviderCredentialDto[] {
    return credentials.filter((credential) => {
      this.assertSupportedProvider(credential.provider);
      return Boolean(credential.apiKey);
    });
  }

  private selectCredential(
    credentials: ProviderCredentialDto[],
    strategy: ROUTING_STRATEGY_ENUM,
    priority: PROVIDER_TYPE_ENUM[],
  ): ProviderCredentialDto {
    if (strategy === ROUTING_STRATEGY_ENUM.CUSTOM_PRIORITY) {
      const prioritizedCredential = priority
        .map((provider) =>
          credentials.find((credential) => credential.provider === provider),
        )
        .find((credential): credential is ProviderCredentialDto =>
          Boolean(credential),
        );

      if (prioritizedCredential) {
        return prioritizedCredential;
      }
    }

    const [selectedCredential] = [...credentials].sort((left, right) => {
      if (strategy === ROUTING_STRATEGY_ENUM.LOWEST_FEES) {
        return this.value(left.feePercentage) - this.value(right.feePercentage);
      }

      if (strategy === ROUTING_STRATEGY_ENUM.FASTEST_SETTLEMENT) {
        return (
          this.value(left.settlementMinutes) -
          this.value(right.settlementMinutes)
        );
      }

      if (strategy === ROUTING_STRATEGY_ENUM.CUSTOM_PRIORITY) {
        return this.value(left.priority) - this.value(right.priority);
      }

      return this.value(right.successRate) - this.value(left.successRate);
    });

    if (!selectedCredential) {
      throw new UnauthorizedException('Provider credentials are required');
    }

    return selectedCredential;
  }

  private assertSupportedProvider(provider: PROVIDER_TYPE_ENUM): void {
    if (!SUPPORTED_PROVIDERS.includes(provider)) {
      throw new BadRequestException(`${provider} is not supported yet`);
    }
  }

  private resolveProvider(provider: PROVIDER_TYPE_ENUM): IWalletProvider {
    switch (provider) {
      case PROVIDER_TYPE_ENUM.PAYSTACK:
        return this.paystackService;
      case PROVIDER_TYPE_ENUM.FLUTTERWAVE:
        return this.flutterwaveService;
      default:
        throw new BadRequestException(`${provider} is not supported yet`);
    }
  }

  private async executeLedgerProviderAction(
    route: ProviderRoute,
    payload: WalletOperationPayload,
    operation: (payload: WalletOperationPayload) => Promise<unknown>,
  ): Promise<unknown> {
    const { ledger, ...providerPayload } = payload;
    const providerResponse = await this.executeProviderCall(() =>
      operation(providerPayload),
    );

    if (!ledger) {
      return providerResponse;
    }

    const ledgerResponse = await this.ledgerService.executeTransaction(ledger);

    return {
      provider: providerResponse,
      ledger: ledgerResponse,
      selectedProvider: route.provider,
    };
  }

  private executeProviderCall<T>(operation: () => Promise<T>): Promise<T> {
    if (this.retryEngineService) {
      return this.retryEngineService.execute(operation);
    }

    return operation();
  }

  private value(value?: number): number {
    const numericValue = Number(value ?? 0);
    return Number.isFinite(numericValue) ? numericValue : 0;
  }
}

export type { ProviderRoute, ResolveProviderRouteInput };
