import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsObject } from 'class-validator';
import { PROVIDER_TYPE_ENUM, WALLET_ACTION_ENUM } from '../../enums';
import { ProviderType } from '../../interface/wallet-provider.interface';
import { WalletOperationPayload } from '../../interface/wallet-provider-base.interface';

export class WalletActionDto {
  @ApiProperty({
    description: 'Provider rail that should execute the action',
    enum: PROVIDER_TYPE_ENUM,
    example: PROVIDER_TYPE_ENUM.PAYSTACK,
  })
  @IsEnum(PROVIDER_TYPE_ENUM)
  provider!: ProviderType;

  @ApiProperty({
    description: 'Provider wallet action to execute',
    enum: WALLET_ACTION_ENUM,
    example: WALLET_ACTION_ENUM.CREATE_WALLET,
  })
  @IsEnum(WALLET_ACTION_ENUM)
  action!: WALLET_ACTION_ENUM;

  @ApiProperty({
    description: 'Provider-specific action payload',
    example: {
      email: 'sudo.whoami@example.com',
      first_name: 'sudo',
      last_name: 'whoami',
    },
  })
  @IsObject()
  @IsNotEmpty()
  payload!: WalletOperationPayload;
}
