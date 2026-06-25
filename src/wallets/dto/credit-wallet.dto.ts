import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsArray,
  IsNumberString,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PROVIDER_TYPE_ENUM, ROUTING_STRATEGY_ENUM } from '../../enums';
import { ProviderCredentialDto } from '../../routing/dto/provider-credential.dto';

export class CreditWalletRequestDto {
  @ApiProperty({
    description: 'Wallet id to credit',
    example: '4d845d2f-8314-45a1-b061-3ee56dbb29ec',
  })
  @IsUUID()
  walletId!: string;

  @ApiProperty({
    description: 'Amount to credit as a decimal string',
    example: '5000',
  })
  @IsNumberString()
  amount!: string;

  @ApiProperty({
    description: 'Currency for the credit operation',
    example: 'NGN',
  })
  @IsString()
  @Length(3, 10)
  currency!: string;

  @ApiProperty({
    description: 'Unique transaction reference for idempotency',
    example: 'ref_credit_10001',
  })
  @IsString()
  @Length(5, 120)
  reference!: string;

  @ApiPropertyOptional({
    description: 'Provider rail to use for funding',
    enum: PROVIDER_TYPE_ENUM,
    example: PROVIDER_TYPE_ENUM.PAYSTACK,
  })
  @IsOptional()
  @IsEnum(PROVIDER_TYPE_ENUM)
  provider?: PROVIDER_TYPE_ENUM;

  @ApiPropertyOptional({
    description: 'Provider secret key for the selected provider',
    example: 'sk_test_paystack_xxxxx',
  })
  @IsOptional()
  @IsString()
  apiKey?: string;

  @ApiPropertyOptional({
    description: 'Alias for apiKey when callers prefer explicit naming',
    example: 'sk_test_paystack_xxxxx',
  })
  @IsOptional()
  @IsString()
  providerApiKey?: string;

  @ApiPropertyOptional({
    description: 'Routing strategy used when providerCredentials is supplied',
    enum: ROUTING_STRATEGY_ENUM,
    example: ROUTING_STRATEGY_ENUM.LOWEST_FEES,
  })
  @IsOptional()
  @IsEnum(ROUTING_STRATEGY_ENUM)
  routingStrategy?: ROUTING_STRATEGY_ENUM;

  @ApiPropertyOptional({
    description: 'Provider preference order for custom-priority routing',
    enum: PROVIDER_TYPE_ENUM,
    isArray: true,
    example: [PROVIDER_TYPE_ENUM.PAYSTACK, PROVIDER_TYPE_ENUM.FLUTTERWAVE],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(PROVIDER_TYPE_ENUM, { each: true })
  providerPriority?: PROVIDER_TYPE_ENUM[];

  @ApiPropertyOptional({
    description: 'Provider credentials to evaluate for smart routing',
    type: [ProviderCredentialDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProviderCredentialDto)
  providerCredentials?: ProviderCredentialDto[];

  @ApiPropertyOptional({
    description: 'Provider-specific payload for the funding provider',
    example: {
      email: 'sudo.whoami@example.com',
      callback_url: 'https://example.com/payments/callback',
    },
  })
  @IsOptional()
  @IsObject()
  providerPayload?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Application metadata stored with the ledger entry',
    example: { orderId: 'order_10001' },
  })
  @IsOptional()
  metadata?: Record<string, unknown>;
}
