import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsObject } from 'class-validator';
import { PROVIDER_TYPE_ENUM } from '../../enums';

export class AddWalletProviderDto {
  @ApiProperty({
    description: 'Provider rail to add to the supported provider catalog',
    enum: PROVIDER_TYPE_ENUM,
    example: PROVIDER_TYPE_ENUM.PAYSTACK,
  })
  @IsEnum(PROVIDER_TYPE_ENUM)
  type!: PROVIDER_TYPE_ENUM;

  @ApiProperty({
    description: 'Provider catalog configuration',
    example: {
      apiKey: 'sk_test_paystack_xxxxx',
      successRate: 99,
      feePercentage: 1.5,
      settlementMinutes: 60,
    },
  })
  @IsObject()
  config!: { apiKey: string; [key: string]: any };
}
