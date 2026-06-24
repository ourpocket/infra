import {
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { PROVIDER_TYPE_ENUM, WEBHOOK_EVENT_ENUM } from '../../enums';

export class ProviderWebhookDto {
  @IsEnum(PROVIDER_TYPE_ENUM)
  provider!: PROVIDER_TYPE_ENUM;

  @IsOptional()
  @IsEnum(WEBHOOK_EVENT_ENUM)
  event?: WEBHOOK_EVENT_ENUM;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  providerReference?: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}
