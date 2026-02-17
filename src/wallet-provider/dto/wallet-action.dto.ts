import { IsEnum, IsNotEmpty, IsObject } from 'class-validator';
import { PROVIDER_TYPE_ENUM, WALLET_ACTION_ENUM } from '../../enums';
import { ProviderType } from '../../interface/wallet-provider.interface';
import { WalletOperationPayload } from '../../interface/wallet-provider-base.interface';

export class WalletActionDto {
  @IsEnum(PROVIDER_TYPE_ENUM)
  provider!: ProviderType;

  @IsEnum(WALLET_ACTION_ENUM)
  action!: WALLET_ACTION_ENUM;

  @IsObject()
  @IsNotEmpty()
  payload!: WalletOperationPayload;
}
