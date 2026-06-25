import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNumberString,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  PROVIDER_TYPE_ENUM,
  ROUTING_STRATEGY_ENUM,
  TRANSACTION_TYPE_ENUM,
} from '../../enums';
import { ProviderCredentialDto } from '../../routing/dto/provider-credential.dto';

export class CreateTransactionDto {
  @ApiProperty({
    description: 'Transaction type to execute',
    enum: TRANSACTION_TYPE_ENUM,
    example: TRANSACTION_TYPE_ENUM.CREDIT,
  })
  @IsEnum(TRANSACTION_TYPE_ENUM)
  type!: TRANSACTION_TYPE_ENUM;

  @ApiProperty({
    description: 'Transaction amount as a decimal string',
    example: '5000',
  })
  @IsNumberString()
  amount!: string;

  @ApiProperty({
    description: 'Transaction currency',
    example: 'NGN',
  })
  @IsString()
  @Length(3, 10)
  currency!: string;

  @ApiProperty({
    description: 'Unique project transaction reference',
    example: 'ref_tx_10001',
  })
  @IsString()
  @Length(5, 120)
  reference!: string;

  @ApiPropertyOptional({
    description: 'Wallet id for credit or debit transactions',
    example: '4d845d2f-8314-45a1-b061-3ee56dbb29ec',
  })
  @IsOptional()
  @IsUUID()
  walletId?: string;

  @ApiPropertyOptional({
    description: 'Source wallet id for transfer transactions',
    example: '4d845d2f-8314-45a1-b061-3ee56dbb29ec',
  })
  @IsOptional()
  @IsUUID()
  fromWalletId?: string;

  @ApiPropertyOptional({
    description: 'Destination wallet id for transfer transactions',
    example: '6d2dcb46-8cab-45ef-9f2e-bf11646d7507',
  })
  @IsOptional()
  @IsUUID()
  toWalletId?: string;

  @ApiPropertyOptional({
    description: 'Provider rail to use for provider-backed transactions',
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
    example: ROUTING_STRATEGY_ENUM.BEST_SUCCESS_RATE,
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
    description: 'Provider-specific payload forwarded to the selected rail',
    example: {
      email: 'sudo.whoami@example.com',
      callback_url: 'https://example.com/payments/callback',
    },
  })
  @IsOptional()
  @IsObject()
  providerPayload?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Application metadata stored with the transaction',
    example: { orderId: 'order_10001' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
