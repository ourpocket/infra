import {
  IsEmail,
  IsIn,
  IsString,
  IsUUID,
  IsUrl,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
const fiatCurrencies = Intl.supportedValuesOf('currency').filter(
  (currency) =>
    !['XAU', 'XAG', 'XDR', 'XPT', 'XPD', 'XXX', 'XTS'].includes(currency),
);
export const scenarios = [
  'success',
  'failure',
  'pending',
  'insufficient_funds',
  'timeout',
  'provider_outage',
] as const;
export type Scenario = (typeof scenarios)[number];
export class CustomerDto {
  @ApiProperty() @IsEmail() email!: string;
  @ApiPropertyOptional()
  @ValidateIf((_: unknown, value: unknown) => value !== undefined)
  @IsString()
  @MaxLength(120)
  name?: string;
}
export class AmountDto {
  @ApiProperty({
    example: '50000',
    description: 'Positive integer minor units',
  })
  @Matches(/^[1-9]\d{0,29}$/)
  amount!: string;
  @ApiProperty({ example: 'NGN' })
  @Matches(/^[A-Z]{3}$/)
  @IsIn(fiatCurrencies)
  currency!: string;
  @ApiPropertyOptional({ enum: scenarios })
  @ValidateIf((_: unknown, value: unknown) => value !== undefined)
  @IsIn(scenarios)
  scenario?: Scenario;
}
export class PaymentDto extends AmountDto {
  @ApiProperty() @IsUUID() customer!: string;
  @ApiPropertyOptional({ enum: ['paystack', 'flutterwave'] })
  @ValidateIf((_: unknown, value: unknown) => value !== undefined)
  @IsIn(['paystack', 'flutterwave'])
  provider?: 'paystack' | 'flutterwave';
  @ApiPropertyOptional()
  @ValidateIf((_: unknown, value: unknown) => value !== undefined)
  @IsUrl({ protocols: ['https'], require_protocol: true })
  callbackUrl?: string;
}
export class RefundDto {
  @ApiProperty() @IsUUID() payment!: string;
  @ApiPropertyOptional({ example: '5000' })
  @ValidateIf((_: unknown, value: unknown) => value !== undefined)
  @Matches(/^[1-9]\d{0,29}$/)
  amount?: string;
  @ApiPropertyOptional({ enum: scenarios })
  @ValidateIf((_: unknown, value: unknown) => value !== undefined)
  @IsIn(scenarios)
  scenario?: Scenario;
}
export class WalletDto {
  @ApiProperty({ example: 'NGN' })
  @Matches(/^[A-Z]{3}$/)
  @IsIn(fiatCurrencies)
  currency!: string;
  @ApiPropertyOptional()
  @ValidateIf((_: unknown, value: unknown) => value !== undefined)
  @IsUUID()
  customer?: string;
}
export class TransferDto extends AmountDto {
  @ApiProperty() @IsUUID() fromWallet!: string;
  @ApiProperty() @IsUUID() toWallet!: string;
}
export class SimulationDto {
  @ApiProperty({ enum: ['completed', 'failed'] })
  @IsIn(['completed', 'failed'])
  status!: 'completed' | 'failed';
}
export class EnvironmentQuery {
  @ApiPropertyOptional({ enum: ['sandbox', 'production'] })
  @ValidateIf((_: unknown, value: unknown) => value !== undefined)
  @IsIn(['sandbox', 'production'])
  environment?: 'sandbox' | 'production';
}
export class FinancialWebhookDto extends EnvironmentQuery {
  @ApiProperty()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  url!: string;
  @ApiPropertyOptional({
    description: 'Comma-separated event names; empty subscribes to all',
  })
  @ValidateIf((_: unknown, value: unknown) => value !== undefined)
  @IsString()
  @MaxLength(1000)
  events?: string;
}

export class FinancialListQuery {
  @ApiPropertyOptional({
    enum: ['transactions', 'wallets', 'customers', 'all'],
  })
  @ValidateIf((_: unknown, value: unknown) => value !== undefined)
  @IsIn(['transactions', 'wallets', 'customers', 'all'])
  group?: 'transactions' | 'wallets' | 'customers' | 'all';
}
