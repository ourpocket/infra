import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const currencies = Intl.supportedValuesOf('currency');

export class AccountResolutionDto {
  @ApiProperty() @IsString() @MaxLength(32) accountNumber!: string;
  @ApiProperty() @IsString() @MaxLength(32) bankCode!: string;
}

export class PaystackRecipientDto {
  @ApiPropertyOptional({ example: 'nuban' })
  @IsOptional()
  @IsString()
  type?: string;
  @ApiProperty() @IsString() @MaxLength(120) name!: string;
  @ApiProperty() @IsString() @MaxLength(32) accountNumber!: string;
  @ApiProperty() @IsString() @MaxLength(32) bankCode!: string;
  @ApiProperty({ example: 'NGN' }) @IsIn(currencies) currency!: string;
}

export class FlutterwaveBeneficiaryDto {
  @ApiProperty() @IsString() @MaxLength(32) accountNumber!: string;
  @ApiProperty() @IsString() @MaxLength(32) bankCode!: string;
  @ApiProperty({ example: 'NGN' }) @IsIn(currencies) currency!: string;
}

export class PayoutDto {
  @ApiProperty() @Matches(/^[1-9]\d{0,29}$/) amount!: string;
  @ApiProperty({ example: 'NGN' }) @IsIn(currencies) currency!: string;
  @ApiProperty() @IsString() @MaxLength(160) recipient!: string;
  @ApiProperty() @Matches(/^[A-Za-z0-9_.=-]{8,120}$/) reference!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  reason?: string;
}

export class PaystackVirtualAccountDto {
  @ApiProperty() @IsEmail() email!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  firstName?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  lastName?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;
  @ApiProperty() @IsString() @MaxLength(80) preferredBank!: string;
  @ApiPropertyOptional({ example: 'NG' })
  @IsOptional()
  @IsIn(['NG', 'GH'])
  country?: 'NG' | 'GH';
}

export class FlutterwaveVirtualAccountDto {
  @ApiProperty() @IsEmail() email!: string;
  @ApiProperty() @Matches(/^[1-9]\d{0,29}$/) amount!: string;
  @ApiProperty({ example: 'NGN' }) @IsIn(currencies) currency!: string;
  @ApiProperty() @Matches(/^[A-Za-z0-9_.=-]{8,120}$/) reference!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  bankCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPermanent?: boolean;
}

export class PaystackRequeryDto {
  @ApiProperty() @IsString() @MaxLength(32) accountNumber!: string;
  @ApiProperty() @IsString() @MaxLength(80) providerSlug!: string;
  @ApiPropertyOptional({ example: '2026-09-19' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date?: string;
}

export class ProviderActivityQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsDateString() from?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() to?: string;
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;
  @ApiPropertyOptional({ default: 10, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
