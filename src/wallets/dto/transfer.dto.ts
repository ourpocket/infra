import {
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';

export class TransferRequestDto {
  @IsUUID()
  fromWalletId!: string;

  @IsUUID()
  toWalletId!: string;

  @IsNumberString()
  amount!: string;

  @IsString()
  @Length(3, 10)
  currency!: string;

  @IsString()
  @Length(5, 120)
  reference!: string;

  @IsOptional()
  metadata?: Record<string, unknown>;
}
