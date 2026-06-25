import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { PROVIDER_TYPE_ENUM, WEBHOOK_EVENT_ENUM } from '../../enums';

export class ProviderWebhookDto {
  @ApiProperty({
    description: 'Provider that emitted the source webhook',
    enum: PROVIDER_TYPE_ENUM,
    example: PROVIDER_TYPE_ENUM.PAYSTACK,
  })
  @IsEnum(PROVIDER_TYPE_ENUM)
  provider!: PROVIDER_TYPE_ENUM;

  @ApiPropertyOptional({
    description: 'Normalized event name',
    enum: WEBHOOK_EVENT_ENUM,
    example: WEBHOOK_EVENT_ENUM.TRANSACTION_SUCCESS,
  })
  @IsOptional()
  @IsEnum(WEBHOOK_EVENT_ENUM)
  event?: WEBHOOK_EVENT_ENUM;

  @ApiPropertyOptional({
    description: 'Webhook amount in the provider payload',
    example: 10000,
  })
  @IsOptional()
  @IsNumber()
  amount?: number;

  @ApiPropertyOptional({
    description: 'Webhook currency',
    example: 'NGN',
  })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({
    description: 'OurPocket or merchant reference',
    example: 'ref_tx_10001',
  })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({
    description: 'Provider transaction or wallet reference',
    example: 'provider_ref_10001',
  })
  @IsOptional()
  @IsString()
  providerReference?: string;

  @ApiPropertyOptional({
    description: 'Raw provider webhook data',
    example: {
      status: 'success',
      customer: { email: 'sudo.whoami@example.com' },
    },
  })
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}
