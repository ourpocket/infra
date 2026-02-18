import { IsOptional, IsString, IsObject, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProjectDto {
  @ApiProperty({
    description: 'Human readable project name',
    example: 'Production Wallets',
  })
  @IsString()
  name!: string;

  @ApiPropertyOptional({
    description: 'URL friendly project slug, unique per platform account',
    example: 'production-wallets',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  slug?: string;

  @ApiPropertyOptional({
    description: 'Optional project description',
    example: 'Main production environment for customer wallets',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Arbitrary metadata for the project',
    example: { environment: 'production', region: 'eu-west-1' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
