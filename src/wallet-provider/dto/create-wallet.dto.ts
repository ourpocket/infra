import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsObject } from 'class-validator';
import { PROVIDER_TYPE_ENUM } from '../../enums';
import { ProviderType } from '../../interface/wallet-provider.interface';

export class CreateWalletDto {
  @ApiProperty({
    description: 'Provider rail that should create the wallet',
    enum: PROVIDER_TYPE_ENUM,
    example: PROVIDER_TYPE_ENUM.FLUTTERWAVE,
  })
  @IsEnum(PROVIDER_TYPE_ENUM)
  provider!: ProviderType;

  @ApiProperty({
    description: 'Provider-specific wallet creation payload',
    example: {
      email: 'sudo.whoami@example.com',
      tx_ref: 'wallet_user_12345',
      narration: 'OurPocket wallet',
    },
  })
  @IsObject()
  @IsNotEmpty()
  payload!: Record<string, any>;
}
