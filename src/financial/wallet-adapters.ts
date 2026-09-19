import {
  BadGatewayException,
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import type { WalletProvider } from './financial.entity';

interface WalletResult {
  reference: string;
  address: string;
  chain: 'ethereum' | 'solana';
}

@Injectable()
export class WalletAdapters {
  async create(
    provider: WalletProvider,
    config: Record<string, unknown>,
    input: {
      reference: string;
      chain: 'ethereum' | 'solana';
    },
  ): Promise<WalletResult> {
    try {
      return provider === 'turnkey'
        ? await this.createTurnkey(config, input)
        : await this.createPrivy(config, input);
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadGatewayException('Wallet provider request failed');
    }
  }

  private required(config: Record<string, unknown>, key: string): string {
    const value = config[key];
    if (typeof value !== 'string' || !value.trim())
      throw new BadRequestException(`${key} is required`);
    return value;
  }

  private async createTurnkey(
    config: Record<string, unknown>,
    input: { reference: string; chain: 'ethereum' | 'solana' },
  ): Promise<WalletResult> {
    const {
      Turnkey,
      defaultEthereumAccountAtIndex,
      defaultSolanaAccountAtIndex,
    } = await import('@turnkey/sdk-server');
    const client = new Turnkey({
      apiBaseUrl:
        typeof config.apiBaseUrl === 'string'
          ? config.apiBaseUrl
          : 'https://api.turnkey.com',
      apiPrivateKey: this.required(config, 'apiPrivateKey'),
      apiPublicKey: this.required(config, 'apiPublicKey'),
      defaultOrganizationId: this.required(config, 'organizationId'),
    });
    const account =
      input.chain === 'ethereum'
        ? defaultEthereumAccountAtIndex(0)
        : defaultSolanaAccountAtIndex(0);
    const result = await client.apiClient().createWallet({
      walletName: `ourpocket-${input.reference}`,
      accounts: [account],
    });
    const address = result.addresses[0];
    if (!address)
      throw new BadGatewayException('Wallet provider returned no address');
    return { reference: result.walletId, address, chain: input.chain };
  }

  private async createPrivy(
    config: Record<string, unknown>,
    input: { reference: string; chain: 'ethereum' | 'solana' },
  ): Promise<WalletResult> {
    const { PrivyClient } = await import('@privy-io/node');
    const client = new PrivyClient({
      appId: this.required(config, 'appId'),
      appSecret: this.required(config, 'appSecret'),
    });
    const wallet = await client.wallets().create({
      chain_type: input.chain,
      display_name: `OurPocket ${input.reference}`,
      external_id: input.reference,
    });
    return {
      reference: wallet.id,
      address: wallet.address,
      chain: input.chain,
    };
  }
}
