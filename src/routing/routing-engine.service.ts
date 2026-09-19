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
    return Promise.reject(
      new BadRequestException(
        'Legacy provider wallet actions are unavailable; use normalized /v1/payments or /v1/sandbox/wallets',
      ),
    );
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

  private value(value?: number): number {
    const numericValue = Number(value ?? 0);
    return Number.isFinite(numericValue) ? numericValue : 0;
  }
}

export type { ProviderRoute, ResolveProviderRouteInput };
