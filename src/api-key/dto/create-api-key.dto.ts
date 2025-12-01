import { IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApiKeyScope } from '../../entities/api-key.entity';

export class CreateApiKeyDto {
  @ApiProperty({
    enum: ['test', 'prod'],
    description: 'The scope of the API key',
    example: 'test',
  })
  @IsEnum(['test', 'prod'])
  scope!: ApiKeyScope;

  @ApiPropertyOptional({
    description: 'Optional description for the API key',
    example: 'Development API key for testing',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Optional expiration date for the API key',
    example: '2026-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: Date;
}
