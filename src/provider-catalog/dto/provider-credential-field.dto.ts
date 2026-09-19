import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

enum PROVIDER_CREDENTIAL_FIELD_TYPE {
  SECRET = 'secret',
  TEXT = 'text',
}

export class ProviderCredentialFieldDto {
  @ApiProperty({ example: 'apiKey' })
  @IsString()
  @Matches(/^[a-z][A-Za-z0-9]*$/)
  key!: string;

  @ApiProperty({ example: 'Secret key' })
  @IsString()
  label!: string;

  @ApiProperty({ enum: PROVIDER_CREDENTIAL_FIELD_TYPE })
  @IsEnum(PROVIDER_CREDENTIAL_FIELD_TYPE)
  type!: PROVIDER_CREDENTIAL_FIELD_TYPE;

  @ApiProperty({ example: true })
  @IsBoolean()
  required!: boolean;

  @ApiPropertyOptional({ example: 'sk_test_...' })
  @IsOptional()
  @IsString()
  placeholder?: string;
}

export { PROVIDER_CREDENTIAL_FIELD_TYPE };
