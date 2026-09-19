import {
  IsEmail,
  IsOptional,
  ValidateNested,
  IsIn,
  IsString,
  IsUUID,
  IsUrl,
  IsBoolean,
  IsInt,
  Min,
  Max,
  IsArray,
  ArrayMinSize,
  ArrayUnique,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
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
  @ApiProperty({
    description: 'Deprecated. OurPocket does not store end-customer records.',
  })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional()
  @ValidateIf((_: unknown, value: unknown) => value !== undefined)
  @IsString()
  @MaxLength(120)
  name?: string;
}

export class CheckoutContactDto {
  @ApiProperty({
    description:
      'Forwarded to the selected provider and never persisted by OurPocket.',
  })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({
    description:
      'Forwarded to the selected provider and never persisted by OurPocket.',
  })
  @IsOptional()
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
  @ApiPropertyOptional({
    description:
      'Opaque caller-generated reference. Required for production and never persisted by OurPocket.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9_.-]{8,120}$/)
  reference?: string;

  @ApiPropertyOptional({ enum: ['paystack', 'flutterwave', 'mono'] })
  @ValidateIf((_: unknown, value: unknown) => value !== undefined)
  @IsIn(['paystack', 'flutterwave', 'mono'])
  provider?: 'paystack' | 'flutterwave' | 'mono';

  @ApiPropertyOptional({ type: CheckoutContactDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CheckoutContactDto)
  contact?: CheckoutContactDto;

  @ApiPropertyOptional({
    description:
      'Deprecated customer resource id. Ignored and never read in production.',
  })
  @IsOptional()
  @IsUUID()
  customer?: string;

  @ApiPropertyOptional()
  @ValidateIf((_: unknown, value: unknown) => value !== undefined)
  @IsUrl({ protocols: ['https'], require_protocol: true })
  callbackUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  description?: string;
}
export class RefundDto {
  @ApiPropertyOptional({
    description: 'Deprecated stored payment id. Ignored in production.',
  })
  @IsOptional()
  @IsUUID()
  payment?: string;

  @ApiPropertyOptional({ enum: ['paystack', 'flutterwave', 'mono'] })
  @IsOptional()
  @IsIn(['paystack', 'flutterwave', 'mono'])
  provider?: 'paystack' | 'flutterwave' | 'mono';

  @ApiPropertyOptional({
    description: 'Provider transaction reference. Required in production.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  paymentReference?: string;

  @ApiPropertyOptional({
    example: 'NGN',
    description: 'Required in production.',
  })
  @IsOptional()
  @Matches(/^[A-Z]{3}$/)
  @IsIn(fiatCurrencies)
  currency?: string;

  @ApiPropertyOptional({ example: '5000' })
  @ValidateIf((_: unknown, value: unknown) => value !== undefined)
  @Matches(/^[1-9]\d{0,29}$/)
  amount?: string;
  @ApiPropertyOptional({ enum: scenarios })
  @ValidateIf((_: unknown, value: unknown) => value !== undefined)
  @IsIn(scenarios)
  scenario?: Scenario;
}

export class PaymentVerificationDto {
  @ApiProperty({ enum: ['paystack', 'flutterwave', 'mono'] })
  @IsIn(['paystack', 'flutterwave', 'mono'])
  provider!: 'paystack' | 'flutterwave' | 'mono';

  @ApiProperty()
  @IsString()
  @MaxLength(160)
  reference!: string;
}

export class RefundVerificationDto extends PaymentVerificationDto {
  @ApiProperty({ example: 'NGN' })
  @Matches(/^[A-Z]{3}$/)
  @IsIn(fiatCurrencies)
  currency!: string;
}

export class WalletDto {
  @ApiPropertyOptional({
    example: 'NGN',
    description:
      'Required for Sandbox fiat wallets; omit for Production chain wallets',
  })
  @ValidateIf((_: unknown, value: unknown) => value !== undefined)
  @Matches(/^[A-Z]{3}$/)
  @IsIn(fiatCurrencies)
  currency?: string;
  @ApiPropertyOptional()
  @ValidateIf((_: unknown, value: unknown) => value !== undefined)
  @IsUUID()
  customer?: string;
  @ApiPropertyOptional({ enum: ['turnkey', 'privy'] })
  @ValidateIf((_: unknown, value: unknown) => value !== undefined)
  @IsIn(['turnkey', 'privy'])
  provider?: 'turnkey' | 'privy';
  @ApiPropertyOptional({ enum: ['ethereum', 'solana'] })
  @ValidateIf((_: unknown, value: unknown) => value !== undefined)
  @IsIn(['ethereum', 'solana'])
  chain?: 'ethereum' | 'solana';
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

export class RoutingPolicyDto {
  @ApiProperty({
    enum: [
      'best_success_rate',
      'lowest_fees',
      'fastest_response',
      'custom_priority',
    ],
  })
  @IsIn([
    'best_success_rate',
    'lowest_fees',
    'fastest_response',
    'custom_priority',
  ])
  strategy!:
    | 'best_success_rate'
    | 'lowest_fees'
    | 'fastest_response'
    | 'custom_priority';

  @ApiPropertyOptional({ type: [String], example: ['paystack', 'flutterwave'] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsIn(['paystack', 'flutterwave'], { each: true })
  providerPriority!: Array<'paystack' | 'flutterwave'>;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  requireHealthy!: boolean;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  safeFailover!: boolean;
}

export class ProviderHealthDto {
  @ApiProperty({ enum: ['healthy', 'degraded', 'down'] })
  @IsIn(['healthy', 'degraded', 'down'])
  status!: 'healthy' | 'degraded' | 'down';

  @ApiPropertyOptional({
    description: 'Configured fee estimate in basis points',
  })
  @ValidateIf(
    (_: unknown, value: unknown) => value !== undefined && value !== null,
  )
  @IsInt()
  @Min(0)
  @Max(10000)
  estimatedFeeBps?: number | null;
}
