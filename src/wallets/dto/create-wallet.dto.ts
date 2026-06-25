import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  Length,
  ValidateNested,
} from 'class-validator';
import { PROVIDER_TYPE_ENUM } from '../../enums';
import { ProviderCredentialDto } from '../../routing/dto/provider-credential.dto';

export class CreateWalletRequestDto {
  @ApiPropertyOptional({
    description: 'Wallet currency. Defaults to NGN when omitted.',
    example: 'NGN',
  })
  @IsOptional()
  @IsString()
  @Length(3, 10)
  currency?: string;

  @ApiPropertyOptional({
    description: 'External user id from the customer application',
    example: 'user_12345',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Provider rail to use for wallet creation',
    enum: PROVIDER_TYPE_ENUM,
    example: PROVIDER_TYPE_ENUM.FLUTTERWAVE,
  })
  @IsOptional()
  @IsEnum(PROVIDER_TYPE_ENUM)
  provider?: PROVIDER_TYPE_ENUM;

  @ApiPropertyOptional({
    description: 'Provider credentials to evaluate for smart routing',
    type: [ProviderCredentialDto],
    example: [
      {
        provider: PROVIDER_TYPE_ENUM.FLUTTERWAVE,
        apiKey: 'FLWSECK_TEST_xxxxx',
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProviderCredentialDto)
  providerCredentials?: ProviderCredentialDto[];

  @ApiPropertyOptional({
    description: 'Provider-specific payload passed to the selected provider',
    example: {
      email: 'sudo.whoami@example.com',
      first_name: 'sudo',
      last_name: 'whoami',
      narration: 'OurPocket wallet',
      Phone_no: '',
    },
  })
  @IsOptional()
  @IsObject()
  providerPayload?: Record<string, unknown>;
}
