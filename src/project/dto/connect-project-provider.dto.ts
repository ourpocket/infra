import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsObject, IsOptional, IsUUID } from 'class-validator';

export class ConnectProjectProviderDto {
  @ApiProperty({
    description: 'Provider catalog entry to connect to this project',
  })
  @IsUUID()
  providerId!: string;

  @ApiProperty({
    description:
      'Provider credentials and connection settings. Secret values are encrypted at rest.',
    example: { apiKey: 'sk_test_xxxxx' },
  })
  @IsObject()
  config!: Record<string, unknown>;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
