import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { PROVIDER_TYPE_ENUM } from '../../enums';

export class ProviderCredentialDto {
  @ApiProperty({
    description: 'Provider rail to use for this credential',
    enum: PROVIDER_TYPE_ENUM,
    example: PROVIDER_TYPE_ENUM.PAYSTACK,
  })
  @IsEnum(PROVIDER_TYPE_ENUM)
  provider!: PROVIDER_TYPE_ENUM;

  @ApiProperty({
    description: 'Provider secret key supplied by the API caller',
    example: 'sk_test_paystack_xxxxx',
  })
  @IsString()
  apiKey!: string;

  @ApiPropertyOptional({
    description: 'Observed or configured provider success rate',
    example: 99,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  successRate?: number;

  @ApiPropertyOptional({
    description: 'Provider processing fee percentage used by fee routing',
    example: 1.5,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  feePercentage?: number;

  @ApiPropertyOptional({
    description: 'Expected provider settlement speed in minutes',
    example: 60,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  settlementMinutes?: number;

  @ApiPropertyOptional({
    description: 'Lower values are preferred for custom-priority routing',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  priority?: number;
}

export class ProviderCredentialsDto {
  @ApiProperty({
    description: 'Candidate provider credentials for smart routing',
    type: [ProviderCredentialDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProviderCredentialDto)
  providers!: ProviderCredentialDto[];
}
