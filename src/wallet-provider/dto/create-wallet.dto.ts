import { IsEnum, IsNotEmpty, IsObject } from 'class-validator';
import { PROVIDER_TYPE_ENUM } from '../../enums';
import { ProviderType } from '../../interface/wallet-provider.interface';

export class CreateWalletDto {
  @IsEnum(PROVIDER_TYPE_ENUM)
  provider!: ProviderType;

  @IsObject()
  @IsNotEmpty()
  payload!: Record<string, any>;
}
