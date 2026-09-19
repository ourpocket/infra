import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const betaUseCases = [
  'payments',
  'payouts',
  'virtual_accounts',
  'other',
] as const;

export class CreateBetaApplicationDto {
  @ApiProperty({ example: 'developer@example.com' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ example: 'Example Labs' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  companyName?: string;

  @ApiProperty({ enum: betaUseCases, example: 'payments' })
  @IsIn(betaUseCases)
  useCase!: (typeof betaUseCases)[number];
}
