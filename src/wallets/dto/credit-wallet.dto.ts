import {
  IsEnum,
  IsNumberString,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';
import { PROVIDER_TYPE_ENUM } from '../../enums';

export class CreditWalletRequestDto {
  @IsUUID()
  walletId!: string;

  @IsNumberString()
  amount!: string;

  @IsString()
  @Length(3, 10)
  currency!: string;

  @IsString()
  @Length(5, 120)
  reference!: string;

  @IsOptional()
  @IsEnum(PROVIDER_TYPE_ENUM)
  provider?: PROVIDER_TYPE_ENUM;

  @IsOptional()
  @IsObject()
  providerPayload?: Record<string, unknown>;

  @IsOptional()
  metadata?: Record<string, unknown>;
}
