import { IsOptional, IsString, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePlatformAccountDto {
  @ApiProperty({
    description: 'Display name for the platform account',
    example: 'Acme Inc',
  })
  @IsString()
  name!: string;

  @ApiPropertyOptional({
    description: 'Optional company or organization name',
    example: 'Acme Financial Technologies',
  })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({
    description: 'Arbitrary metadata for the platform account',
    example: { plan: 'pro', region: 'eu-west-1' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
