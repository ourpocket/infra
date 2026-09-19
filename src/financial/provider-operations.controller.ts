import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserStatusGuard } from '../auth/guards/user-status.guard';
import { PaymentProviderId } from '../providers/contracts';
import {
  CurrentFinancialContext,
  FinancialApiGuard,
  FinancialDashboardGuard,
} from './financial-auth';
import { FinancialRequestInterceptor } from './financial-request.interceptor';
import {
  AccountResolutionDto,
  FlutterwaveBeneficiaryDto,
  FlutterwaveVirtualAccountDto,
  PaystackRecipientDto,
  PaystackRequeryDto,
  PaystackVirtualAccountDto,
  PayoutDto,
  ProviderActivityQueryDto,
} from './provider-operations.dto';
import { ProviderOperationsService } from './provider-operations.service';
import { FinancialContext } from './financial.service';

function provider(value: string): PaymentProviderId {
  if (value === 'paystack' || value === 'flutterwave' || value === 'mono')
    return value;
  throw new BadRequestException('Unsupported provider');
}

@ApiTags('Provider operations')
@ApiBearerAuth()
@UseGuards(FinancialApiGuard)
@UseInterceptors(FinancialRequestInterceptor)
@Controller({ path: 'providers', version: '1' })
export class ProviderOperationsController {
  constructor(private readonly operations: ProviderOperationsService) {}

  @Get(':provider/overview')
  overview(
    @CurrentFinancialContext() ctx: FinancialContext,
    @Param('provider') id: string,
    @Query() query: ProviderActivityQueryDto,
  ) {
    return this.operations.overview(
      ctx,
      provider(id),
      this.activityQuery(query),
    );
  }

  @Post(':provider/account-resolution')
  resolveAccount(
    @CurrentFinancialContext() ctx: FinancialContext,
    @Param('provider') id: string,
    @Body() input: AccountResolutionDto,
  ) {
    return this.operations.resolveAccount(ctx, provider(id), input);
  }

  private activityQuery(query: ProviderActivityQueryDto) {
    return {
      from: query.from,
      to: query.to,
      page: query.page ?? 1,
      limit: query.limit ?? 10,
    };
  }

  @Post('paystack/recipients')
  paystackRecipient(
    @CurrentFinancialContext() ctx: FinancialContext,
    @Body() input: PaystackRecipientDto,
  ) {
    return this.operations.createRecipient(ctx, 'paystack', {
      type: input.type ?? 'nuban',
      name: input.name,
      account_number: input.accountNumber,
      bank_code: input.bankCode,
      currency: input.currency,
    });
  }

  @Post('flutterwave/beneficiaries')
  flutterwaveBeneficiary(
    @CurrentFinancialContext() ctx: FinancialContext,
    @Body() input: FlutterwaveBeneficiaryDto,
  ) {
    return this.operations.createRecipient(ctx, 'flutterwave', {
      account_number: input.accountNumber,
      account_bank: input.bankCode,
      currency: input.currency,
    });
  }

  @Get(':provider/recipients/:reference')
  recipient(
    @CurrentFinancialContext() ctx: FinancialContext,
    @Param('provider') id: string,
    @Param('reference') reference: string,
  ) {
    return this.operations.getRecipient(ctx, provider(id), reference);
  }

  @Post(':provider/payouts')
  payout(
    @CurrentFinancialContext() ctx: FinancialContext,
    @Param('provider') id: string,
    @Body() input: PayoutDto,
  ) {
    const selected = provider(id);
    return this.operations.createPayout(ctx, selected, {
      ...(selected === 'paystack'
        ? { source: 'balance', recipient: input.recipient }
        : { beneficiary: input.recipient }),
      amount: input.amount,
      currency: input.currency,
      reference: input.reference,
      narration: input.reason,
    });
  }

  @Get(':provider/payouts/:reference')
  payoutStatus(
    @CurrentFinancialContext() ctx: FinancialContext,
    @Param('provider') id: string,
    @Param('reference') reference: string,
  ) {
    return this.operations.getPayout(ctx, provider(id), reference);
  }

  @Post('paystack/virtual-accounts')
  paystackVirtualAccount(
    @CurrentFinancialContext() ctx: FinancialContext,
    @Body() input: PaystackVirtualAccountDto,
  ) {
    return this.operations.createVirtualAccount(ctx, 'paystack', {
      email: input.email,
      first_name: input.firstName,
      last_name: input.lastName,
      phone: input.phone,
      preferred_bank: input.preferredBank,
      country: input.country,
    });
  }

  @Post('flutterwave/virtual-accounts')
  flutterwaveVirtualAccount(
    @CurrentFinancialContext() ctx: FinancialContext,
    @Body() input: FlutterwaveVirtualAccountDto,
  ) {
    return this.operations.createVirtualAccount(ctx, 'flutterwave', {
      email: input.email,
      amount: input.amount,
      currency: input.currency,
      tx_ref: input.reference,
      bank_code: input.bankCode,
      is_permanent: input.isPermanent,
    });
  }

  @Get(':provider/virtual-accounts/:reference')
  virtualAccount(
    @CurrentFinancialContext() ctx: FinancialContext,
    @Param('provider') id: string,
    @Param('reference') reference: string,
  ) {
    return this.operations.getVirtualAccount(ctx, provider(id), reference);
  }

  @Post('paystack/virtual-accounts/requery')
  requeryPaystackVirtualAccount(
    @CurrentFinancialContext() ctx: FinancialContext,
    @Body() input: PaystackRequeryDto,
  ) {
    return this.operations.requeryPaystackVirtualAccount(ctx, {
      account_number: input.accountNumber,
      provider_slug: input.providerSlug,
      date: input.date,
    });
  }
}

@ApiTags('Provider activity')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, UserStatusGuard, FinancialDashboardGuard)
@UseInterceptors(FinancialRequestInterceptor)
@Controller({ path: 'projects/:projectId/providers', version: '1' })
export class ProviderActivityDashboardController {
  constructor(private readonly operations: ProviderOperationsService) {}

  @Get(':provider/overview')
  @ApiOperation({
    summary: 'Fetch a live provider activity snapshot without retention',
  })
  overview(
    @CurrentFinancialContext() ctx: FinancialContext,
    @Param('projectId', ParseUUIDPipe) _projectId: string,
    @Param('provider') id: string,
    @Query() query: ProviderActivityQueryDto,
  ) {
    return this.operations.overview(ctx, provider(id), {
      from: query.from,
      to: query.to,
      page: query.page ?? 1,
      limit: query.limit ?? 10,
    });
  }

  @Post(':provider/account-resolution')
  resolveAccount(
    @CurrentFinancialContext() ctx: FinancialContext,
    @Param('provider') id: string,
    @Body() input: AccountResolutionDto,
  ) {
    return this.operations.resolveAccount(ctx, provider(id), input);
  }

  @Post('paystack/recipients')
  paystackRecipient(
    @CurrentFinancialContext() ctx: FinancialContext,
    @Body() input: PaystackRecipientDto,
  ) {
    return this.operations.createRecipient(ctx, 'paystack', {
      type: input.type ?? 'nuban',
      name: input.name,
      account_number: input.accountNumber,
      bank_code: input.bankCode,
      currency: input.currency,
    });
  }

  @Post('flutterwave/beneficiaries')
  flutterwaveBeneficiary(
    @CurrentFinancialContext() ctx: FinancialContext,
    @Body() input: FlutterwaveBeneficiaryDto,
  ) {
    return this.operations.createRecipient(ctx, 'flutterwave', {
      account_number: input.accountNumber,
      account_bank: input.bankCode,
      currency: input.currency,
    });
  }

  @Get(':provider/recipients/:reference')
  recipient(
    @CurrentFinancialContext() ctx: FinancialContext,
    @Param('provider') id: string,
    @Param('reference') reference: string,
  ) {
    return this.operations.getRecipient(ctx, provider(id), reference);
  }

  @Post(':provider/payouts')
  payout(
    @CurrentFinancialContext() ctx: FinancialContext,
    @Param('provider') id: string,
    @Body() input: PayoutDto,
  ) {
    const selected = provider(id);
    return this.operations.createPayout(ctx, selected, {
      ...(selected === 'paystack'
        ? { source: 'balance', recipient: input.recipient }
        : { beneficiary: input.recipient }),
      amount: input.amount,
      currency: input.currency,
      reference: input.reference,
      narration: input.reason,
    });
  }

  @Get(':provider/payouts/:reference')
  payoutStatus(
    @CurrentFinancialContext() ctx: FinancialContext,
    @Param('provider') id: string,
    @Param('reference') reference: string,
  ) {
    return this.operations.getPayout(ctx, provider(id), reference);
  }

  @Post('paystack/virtual-accounts')
  paystackVirtualAccount(
    @CurrentFinancialContext() ctx: FinancialContext,
    @Body() input: PaystackVirtualAccountDto,
  ) {
    return this.operations.createVirtualAccount(ctx, 'paystack', {
      email: input.email,
      first_name: input.firstName,
      last_name: input.lastName,
      phone: input.phone,
      preferred_bank: input.preferredBank,
      country: input.country,
    });
  }

  @Post('flutterwave/virtual-accounts')
  flutterwaveVirtualAccount(
    @CurrentFinancialContext() ctx: FinancialContext,
    @Body() input: FlutterwaveVirtualAccountDto,
  ) {
    return this.operations.createVirtualAccount(ctx, 'flutterwave', {
      email: input.email,
      amount: input.amount,
      currency: input.currency,
      tx_ref: input.reference,
      bank_code: input.bankCode,
      is_permanent: input.isPermanent,
    });
  }

  @Get(':provider/virtual-accounts/:reference')
  virtualAccount(
    @CurrentFinancialContext() ctx: FinancialContext,
    @Param('provider') id: string,
    @Param('reference') reference: string,
  ) {
    return this.operations.getVirtualAccount(ctx, provider(id), reference);
  }

  @Post('paystack/virtual-accounts/requery')
  requeryPaystackVirtualAccount(
    @CurrentFinancialContext() ctx: FinancialContext,
    @Body() input: PaystackRequeryDto,
  ) {
    return this.operations.requeryPaystackVirtualAccount(ctx, {
      account_number: input.accountNumber,
      provider_slug: input.providerSlug,
      date: input.date,
    });
  }
}
