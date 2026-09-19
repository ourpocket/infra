import {
  Body,
  Controller,
  Get,
  Query,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  RawBodyRequest,
  Req,
  UseGuards,
  UseInterceptors,
  Delete,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { PROVIDER_CATALOG_STATUS_ENUM } from '../enums';
import { ProviderCatalogService } from '../provider-catalog/provider-catalog.service';
import { FinancialRequestInterceptor } from './financial-request.interceptor';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserStatusGuard } from '../auth/guards/user-status.guard';
import {
  AmountDto,
  FinancialListQuery,
  CustomerDto,
  FinancialWebhookDto,
  PaymentDto,
  RefundDto,
  SimulationDto,
  TransferDto,
  WalletDto,
} from './financial.dto';
import {
  CurrentFinancialContext,
  FinancialApiGuard,
  FinancialDashboardGuard,
  requestId,
} from './financial-auth';
import { FinancialContext, FinancialService } from './financial.service';
import { FinancialWebhooksService } from './financial-webhooks.service';
import { BadRequestException } from '@nestjs/common';
@ApiTags('Financial API')
@ApiBearerAuth()
@ApiHeader({
  name: 'Idempotency-Key',
  required: false,
  description: 'Required for creation and wallet operations',
})
@UseGuards(FinancialApiGuard)
@UseInterceptors(FinancialRequestInterceptor)
@Controller({ version: '1' })
export class FinancialController {
  constructor(
    private readonly service: FinancialService,
    private readonly catalog: ProviderCatalogService,
  ) {}
  @Post('customers')
  @ApiOperation({ summary: 'Create a normalized customer' })
  customer(
    @CurrentFinancialContext() ctx: FinancialContext,
    @Body() dto: CustomerDto,
    @Headers('idempotency-key') key?: string,
  ) {
    return this.service.customer(ctx, dto, key);
  }
  @Get('customers') customers(
    @CurrentFinancialContext() ctx: FinancialContext,
  ) {
    return this.service.list(ctx, 'customer');
  }
  @Get('customers/:id') customerDetail(
    @CurrentFinancialContext() ctx: FinancialContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.resource(ctx, id, 'customer');
  }
  @Post('payments')
  @ApiOperation({
    summary: 'Create hosted checkout or a simulated sandbox payment',
  })
  payment(
    @CurrentFinancialContext() ctx: FinancialContext,
    @Body() dto: PaymentDto,
    @Headers('idempotency-key') key?: string,
  ) {
    return this.service.payment(ctx, dto, key);
  }
  @Get('payments') payments(@CurrentFinancialContext() ctx: FinancialContext) {
    return this.service.list(ctx, 'payment');
  }
  @Get('payments/:id') paymentDetail(
    @CurrentFinancialContext() ctx: FinancialContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.resource(ctx, id, 'payment');
  }
  @Post('payments/:id/verify') verify(
    @CurrentFinancialContext() ctx: FinancialContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.verify(ctx, id);
  }
  @Post('refunds')
  @ApiOperation({ summary: 'Create a full or partial refund' })
  refund(
    @CurrentFinancialContext() ctx: FinancialContext,
    @Body() dto: RefundDto,
    @Headers('idempotency-key') key?: string,
  ) {
    return this.service.refund(ctx, dto, key);
  }
  @Get('refunds') refunds(@CurrentFinancialContext() ctx: FinancialContext) {
    return this.service.list(ctx, 'refund');
  }
  @Get('refunds/:id') refundDetail(
    @CurrentFinancialContext() ctx: FinancialContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.resource(ctx, id, 'refund');
  }
  @Post('refunds/:id/verify') verifyRefund(
    @CurrentFinancialContext() ctx: FinancialContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.verifyRefund(ctx, id);
  }
  @Post('sandbox/wallets') wallet(
    @CurrentFinancialContext() ctx: FinancialContext,
    @Body() dto: WalletDto,
    @Headers('idempotency-key') key?: string,
  ) {
    return this.service.wallet(ctx, dto, key);
  }
  @Get('sandbox/wallets') wallets(
    @CurrentFinancialContext() ctx: FinancialContext,
  ) {
    return this.service.list(ctx, 'wallet');
  }
  @Get('sandbox/wallets/:id') walletDetail(
    @CurrentFinancialContext() ctx: FinancialContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.resource(ctx, id, 'wallet');
  }
  @Post('sandbox/wallets/:id/fund') fund(
    @CurrentFinancialContext() ctx: FinancialContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AmountDto,
    @Headers('idempotency-key') key?: string,
  ) {
    return this.service.walletOperation(ctx, 'fund', dto, key, undefined, id);
  }
  @Post('sandbox/wallets/:id/debit') debit(
    @CurrentFinancialContext() ctx: FinancialContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AmountDto,
    @Headers('idempotency-key') key?: string,
  ) {
    return this.service.walletOperation(ctx, 'debit', dto, key, id);
  }
  @Post('sandbox/transfers') transfer(
    @CurrentFinancialContext() ctx: FinancialContext,
    @Body() dto: TransferDto,
    @Headers('idempotency-key') key?: string,
  ) {
    return this.service.transfer(ctx, dto, key);
  }
  @Post('sandbox/operations/:id/complete') simulate(
    @CurrentFinancialContext() ctx: FinancialContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SimulationDto,
  ) {
    return this.service.simulate(ctx, id, dto.status);
  }
  @Get('financial-transactions') transactions(
    @CurrentFinancialContext() ctx: FinancialContext,
  ) {
    return this.service.list(ctx, ['payment', 'refund', 'transfer']);
  }
  @Get('integrations') integrations(
    @CurrentFinancialContext() ctx: FinancialContext,
  ) {
    return this.service.integrations(ctx);
  }
  @Get('events') events(@CurrentFinancialContext() ctx: FinancialContext) {
    return this.service.events(ctx);
  }
  @Get('api-logs') logs(@CurrentFinancialContext() ctx: FinancialContext) {
    return this.service.logs(ctx);
  }
  @Get('financial-context') context(
    @CurrentFinancialContext() ctx: FinancialContext,
  ) {
    return { projectId: ctx.projectId, environment: ctx.environment };
  }
  @Get('providers') async providers() {
    return (await this.catalog.listPublic()).map((provider) => {
      const eligible =
        provider.status === PROVIDER_CATALOG_STATUS_ENUM.ACTIVE &&
        ['paystack', 'flutterwave'].includes(provider.slug);
      return {
        id: provider.id,
        name: provider.slug,
        status: provider.status,
        capabilities: {
          payments: eligible,
          refunds: eligible,
          wallets: false,
          transfers: false,
        },
      };
    });
  }
}
@ApiTags('Financial dashboard')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Environment', enum: ['sandbox', 'production'] })
@UseGuards(JwtAuthGuard, UserStatusGuard, FinancialDashboardGuard)
@UseInterceptors(FinancialRequestInterceptor)
@Controller({ path: 'projects/:projectId/financial', version: '1' })
export class FinancialDashboardController {
  constructor(
    private readonly service: FinancialService,
    private readonly webhooks: FinancialWebhooksService,
  ) {}
  @Get('resources') resources(
    @CurrentFinancialContext() ctx: FinancialContext,
    @Query() query: FinancialListQuery,
  ) {
    return this.service.list(
      ctx,
      query.group === 'transactions'
        ? ['payment', 'refund', 'transfer']
        : query.group === 'wallets'
          ? ['wallet', 'transfer']
          : query.group === 'customers'
            ? 'customer'
            : undefined,
    );
  }
  @Get('metrics') metrics(@CurrentFinancialContext() ctx: FinancialContext) {
    return this.service.metrics(ctx);
  }
  @Get('logs') logs(@CurrentFinancialContext() ctx: FinancialContext) {
    return this.service.logs(ctx);
  }
  @Get('events') events(@CurrentFinancialContext() ctx: FinancialContext) {
    return this.service.events(ctx);
  }
  @Get('webhooks') endpoints(@CurrentFinancialContext() ctx: FinancialContext) {
    return this.webhooks.endpoints(ctx);
  }
  @Post('webhooks') create(
    @CurrentFinancialContext() ctx: FinancialContext,
    @Body() dto: FinancialWebhookDto,
  ) {
    return this.webhooks.create(ctx, dto);
  }
  @Delete('webhooks/:id') remove(
    @CurrentFinancialContext() ctx: FinancialContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.webhooks.remove(ctx, id);
  }
  @Get('deliveries') deliveries(
    @CurrentFinancialContext() ctx: FinancialContext,
  ) {
    return this.webhooks.deliveries(ctx);
  }
  @Post('deliveries/:id/replay') replay(
    @CurrentFinancialContext() ctx: FinancialContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.webhooks.replay(ctx, id);
  }
  @Post('webhooks/test') test(
    @CurrentFinancialContext() ctx: FinancialContext,
  ) {
    return this.webhooks.test(ctx);
  }
}
@ApiTags('Provider events')
@Controller({ path: 'provider-events/:projectId/:provider', version: '1' })
export class ProviderEventsController {
  constructor(private readonly webhooks: FinancialWebhooksService) {}
  @Post()
  @HttpCode(200)
  @ApiOperation({ summary: 'Receive signed production provider events' })
  receive(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('provider') provider: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    if (provider !== 'paystack' && provider !== 'flutterwave')
      throw new BadRequestException('Unsupported provider');
    if (!req.rawBody) throw new BadRequestException('Raw webhook body missing');
    const signature =
      req.headers[
        provider === 'paystack'
          ? 'x-paystack-signature'
          : 'flutterwave-signature'
      ];
    return this.webhooks.receive(
      { projectId, environment: 'production', requestId: requestId(req) },
      provider,
      req.rawBody,
      typeof signature === 'string' ? signature : undefined,
      typeof req.headers['verif-hash'] === 'string'
        ? req.headers['verif-hash']
        : undefined,
    );
  }
}
