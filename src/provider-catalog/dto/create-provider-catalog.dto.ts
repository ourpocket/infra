import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  PROVIDER_CAPABILITY_ENUM,
  PROVIDER_CATALOG_STATUS_ENUM,
  PROVIDER_CATEGORY_ENUM,
  PROVIDER_TYPE_ENUM,
} from '../../enums';
import { ProviderCredentialFieldDto } from './provider-credential-field.dto';

export class CreateProviderCatalogDto {
  @ApiProperty({ example: 'paystack' })
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug!: string;

  @ApiProperty({ example: 'Paystack' })
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiProperty({
    example: 'Payment and wallet infrastructure for African businesses.',
  })
  @IsString()
  description!: string;

  @ApiProperty({ example: '/img/paystack_logo.svg' })
  @IsString()
  @Matches(/^\/img\/[a-z0-9_/-]+\.(svg|png|webp)$/)
  logoAsset!: string;

  @ApiProperty({ enum: PROVIDER_CATEGORY_ENUM })
  @IsEnum(PROVIDER_CATEGORY_ENUM)
  category!: PROVIDER_CATEGORY_ENUM;

  @ApiProperty({ enum: PROVIDER_CAPABILITY_ENUM, isArray: true })
  @IsArray()
  @ArrayUnique()
  @IsEnum(PROVIDER_CAPABILITY_ENUM, { each: true })
  capabilities!: PROVIDER_CAPABILITY_ENUM[];

  @ApiProperty({ type: [ProviderCredentialFieldDto] })
  @IsArray()
  @ArrayUnique((field: ProviderCredentialFieldDto) => field.key)
  @ValidateNested({ each: true })
  @Type(() => ProviderCredentialFieldDto)
  credentialFields!: ProviderCredentialFieldDto[];

  @ApiPropertyOptional({ enum: PROVIDER_TYPE_ENUM })
  @IsOptional()
  @IsEnum(PROVIDER_TYPE_ENUM)
  adapterType?: PROVIDER_TYPE_ENUM;

  @ApiProperty({ enum: PROVIDER_CATALOG_STATUS_ENUM })
  @IsEnum(PROVIDER_CATALOG_STATUS_ENUM)
  status!: PROVIDER_CATALOG_STATUS_ENUM;

  @ApiPropertyOptional({ example: 10, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
