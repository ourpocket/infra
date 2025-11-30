import {
  IsEmail,
  IsOptional,
  IsString,
  IsUrl,
  IsEnum,
  IsBoolean,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AUTH_TYPE_ENUM } from '../../enums';

export class CreateAccountDto {
  @ApiProperty({
    description: 'Full name of the user or developer',
    example: 'Jane Doe',
  })
  @IsString()
  name!: string;

  @ApiProperty({
    description: 'Valid email address of the user',
    example: 'jane.doe@example.com',
  })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({
    description: 'URL to profile photo',
    example: 'https://example.com/avatar.jpg',
  })
  @IsOptional()
  @IsUrl()
  photoUrl?: string;

  @ApiPropertyOptional({
    description: 'Authentication provider used to create account',
    enum: AUTH_TYPE_ENUM,
    example: AUTH_TYPE_ENUM.GOOGLE,
  })
  @IsOptional()
  @IsEnum(AUTH_TYPE_ENUM)
  provider?: AUTH_TYPE_ENUM;

  @ApiPropertyOptional({
    description: 'Password (only required for local provider)',
    example: 'securePassword123!',
  })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional({
    description: 'Company or project name',
    example: 'Pocket Labs',
  })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiProperty({
    description: 'Users country of residence',
    example: 'Nigeria',
  })
  @ValidateIf((o) => !o.provider || o.provider === AUTH_TYPE_ENUM.LOCAL)
  @IsString()
  country?: string;

  @ApiPropertyOptional({
    description: 'User role or persona',
    enum: ['developer', 'team', 'founder'],
    example: 'developer',
  })
  @IsOptional()
  @IsString()
  role?: 'developer' | 'team' | 'founder';

  @ApiProperty({
    description: 'User must agree to Terms and Privacy Policy',
    example: true,
  })
  @IsBoolean()
  acceptTerms!: boolean;
}
