import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';

export class TransferRequestDto {
  @ApiProperty({
    description: 'Source wallet id',
    example: '4d845d2f-8314-45a1-b061-3ee56dbb29ec',
  })
  @IsUUID()
  fromWalletId!: string;

  @ApiProperty({
    description: 'Destination wallet id',
    example: '6d2dcb46-8cab-45ef-9f2e-bf11646d7507',
  })
  @IsUUID()
  toWalletId!: string;

  @ApiProperty({
    description: 'Amount to transfer as a decimal string',
    example: '1000',
  })
  @IsNumberString()
  amount!: string;

  @ApiProperty({
    description: 'Currency for both wallets',
    example: 'NGN',
  })
  @IsString()
  @Length(3, 10)
  currency!: string;

  @ApiProperty({
    description: 'Unique transfer reference',
    example: 'ref_transfer_10001',
  })
  @IsString()
  @Length(5, 120)
  reference!: string;

  @ApiPropertyOptional({
    description: 'Application metadata stored with the transfer',
    example: { reason: 'merchant settlement' },
  })
  @IsOptional()
  metadata?: Record<string, unknown>;
}
