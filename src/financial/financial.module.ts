import { FinancialRequestInterceptor } from './financial-request.interceptor';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProviderCatalogModule } from '../provider-catalog/provider-catalog.module';
import { ProjectModule } from '../project/project.module';
import { financialEntities } from './financial.entity';
import { FinancialService } from './financial.service';
import { PaymentAdapters } from './payment-adapters';
import {
  FinancialController,
  FinancialDashboardController,
  ProviderEventsController,
} from './financial.controller';
import { FinancialWebhooksService } from './financial-webhooks.service';
import { FinancialApiGuard, FinancialDashboardGuard } from './financial-auth';
import { FinancialRetentionService } from './financial-retention.service';
@Module({
  imports: [
    TypeOrmModule.forFeature(financialEntities),
    ProjectModule,
    ProviderCatalogModule,
  ],
  controllers: [
    FinancialController,
    FinancialDashboardController,
    ProviderEventsController,
  ],
  providers: [
    FinancialService,
    PaymentAdapters,
    FinancialWebhooksService,
    FinancialApiGuard,
    FinancialDashboardGuard,
    FinancialRetentionService,
    FinancialRequestInterceptor,
  ],
  exports: [FinancialService],
})
export class FinancialModule {}
