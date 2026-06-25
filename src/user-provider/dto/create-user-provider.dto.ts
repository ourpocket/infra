import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { PROVIDER_TYPE_ENUM } from '../../enums';

export class CreateUserProviderDto {
  @ApiProperty({
    description: 'Provider rail to save for the authenticated user',
    enum: PROVIDER_TYPE_ENUM,
    example: PROVIDER_TYPE_ENUM.PAYSTACK,
  })
  @IsEnum(PROVIDER_TYPE_ENUM)
  type!: PROVIDER_TYPE_ENUM;

  @ApiProperty({
    description: 'Display name for this provider configuration',
    example: 'Paystack production',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    description: 'Provider configuration stored in the user vault',
    example: {
      apiKey: 'sk_test_paystack_xxxxx',
      businessId: 'business_12345',
    },
  })
  @IsObject()
  @IsNotEmpty()
  config!: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Whether this user provider is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}
