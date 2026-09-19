import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ProjectApiKeyService } from '../project/project-api-key.service';
import { LedgerService } from '../ledger/ledger.service';
import { TransferRequestDto } from './dto/transfer.dto';
import { CreditWalletRequestDto } from './dto/credit-wallet.dto';
import { DebitWalletRequestDto } from './dto/debit-wallet.dto';
import { CreateWalletRequestDto } from './dto/create-wallet.dto';
import { WalletRepository } from './wallet.repository';
import { RoutingEngineService } from '../routing/routing-engine.service';
import { WALLET_ACTION_ENUM } from '../enums';

@Injectable()
export class WalletsService {
  constructor(
    private readonly walletRepository: WalletRepository,
    private readonly projectApiKeyService: ProjectApiKeyService,
    private readonly ledgerService: LedgerService,
    private readonly routingEngineService: RoutingEngineService,
  ) {}

  async createWallet(
    incomingApiKey: string,
    dto: CreateWalletRequestDto,
  ): Promise<unknown> {
    const projectApiKey =
      await this.projectApiKeyService.verifyProjectApiKey(incomingApiKey);

    throw new BadRequestException(
      'Use /v1/sandbox/wallets for test wallets; production wallet creation is unavailable',
    );
  }

  async getWallet(incomingApiKey: string, walletId: string): Promise<unknown> {
    const projectApiKey =
      await this.projectApiKeyService.verifyProjectApiKey(incomingApiKey);
    const wallet = await this.walletRepository.findByIdAndProjectId(
      walletId,
      projectApiKey.project.id,
    );

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return { wallet, balance: null, environment: 'legacy' };
  }

  async transfer(
    incomingApiKey: string,
    dto: TransferRequestDto,
  ): Promise<unknown> {
    return Promise.reject(
      new BadRequestException(
        'Legacy wallet writes are unavailable; use environment-scoped sandbox financial APIs',
      ),
    );
  }

  async credit(
    incomingApiKey: string,
    dto: CreditWalletRequestDto,
  ): Promise<unknown> {
    return Promise.reject(
      new BadRequestException(
        'Legacy wallet writes are unavailable; use environment-scoped sandbox financial APIs',
      ),
    );
  }

  async debit(
    incomingApiKey: string,
    dto: DebitWalletRequestDto,
  ): Promise<unknown> {
    return Promise.reject(
      new BadRequestException(
        'Legacy wallet writes are unavailable; use environment-scoped sandbox financial APIs',
      ),
    );
  }
}
