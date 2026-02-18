import { IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class CreateWalletRequestDto {
  @IsString()
  @Length(3, 10)
  currency!: string;

  @IsOptional()
  @IsUUID()
  accountId?: string;
}
