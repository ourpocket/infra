import {
  IsArray,
  IsEnum,
  IsNumberString,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';
import {
  PROVIDER_TYPE_ENUM,
  ROUTING_STRATEGY_ENUM,
  TRANSACTION_TYPE_ENUM,
} from '../../enums';

export class CreateTransactionDto {
  @IsEnum(TRANSACTION_TYPE_ENUM)
  type!: TRANSACTION_TYPE_ENUM;

  @IsNumberString()
  amount!: string;

  @IsString()
  @Length(3, 10)
  currency!: string;

  @IsString()
  @Length(5, 120)
  reference!: string;

  @IsOptional()
  @IsUUID()
  walletId?: string;

  @IsOptional()
  @IsUUID()
  fromWalletId?: string;

  @IsOptional()
  @IsUUID()
  toWalletId?: string;

  @IsOptional()
  @IsEnum(PROVIDER_TYPE_ENUM)
  provider?: PROVIDER_TYPE_ENUM;

  @IsOptional()
  @IsEnum(ROUTING_STRATEGY_ENUM)
  routingStrategy?: ROUTING_STRATEGY_ENUM;

  @IsOptional()
  @IsArray()
  @IsEnum(PROVIDER_TYPE_ENUM, { each: true })
  providerPriority?: PROVIDER_TYPE_ENUM[];

  @IsOptional()
  @IsObject()
  providerPayload?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
