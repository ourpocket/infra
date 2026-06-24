import {
  IsEnum,
  IsOptional,
  IsString,
  IsDateString,
  IsInt,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PROJECT_API_KEY_SCOPE_ENUM } from '../../enums';

export type ProjectApiKeyScopeDto = 'test' | 'live';

export class CreateProjectApiKeyDto {
  @ApiPropertyOptional({
    description: 'Quota for this API key',
    example: 1000,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  quota?: number;

  @ApiProperty({
    enum: PROJECT_API_KEY_SCOPE_ENUM,
    description: 'The scope of the API key',
    example: PROJECT_API_KEY_SCOPE_ENUM.TEST,
  })
  @IsEnum(PROJECT_API_KEY_SCOPE_ENUM)
  scope!: ProjectApiKeyScopeDto;

  @ApiPropertyOptional({
    description: 'Optional description for the API key',
    example: 'Test environment API key',
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
