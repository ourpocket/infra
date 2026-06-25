import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsObject, IsOptional } from 'class-validator';
import { PROVIDER_TYPE_ENUM } from '../../enums';

export class ConfigureProjectProviderDto {
  @ApiProperty({
    description: 'Provider rail to configure for the project',
    enum: PROVIDER_TYPE_ENUM,
    example: PROVIDER_TYPE_ENUM.PAYSTACK,
  })
  @IsEnum(PROVIDER_TYPE_ENUM)
  type!: PROVIDER_TYPE_ENUM;

  @ApiProperty({
    description: 'Encrypted provider configuration metadata',
    example: {
      apiKey: 'sk_test_paystack_xxxxx',
      successRate: 99,
      feePercentage: 1.5,
      settlementMinutes: 60,
      priority: 1,
    },
  })
  @IsObject()
  config!: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Whether this project provider is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
