import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { ProviderCatalog } from '../entities/provider-catalog.entity';
import { RoutingEngineModule } from '../routing/routing-engine.module';
import { PlatformAdminGuard } from '../auth/guards/platform-admin.guard';
import { AdminProviderCatalogController } from './admin-provider-catalog.controller';
import { ProviderCatalogController } from './provider-catalog.controller';
import { ProviderCatalogRepository } from './provider-catalog.repository';
import { ProviderCatalogService } from './provider-catalog.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProviderCatalog, User]),
    RoutingEngineModule,
  ],
  controllers: [ProviderCatalogController, AdminProviderCatalogController],
  providers: [
    ProviderCatalogService,
    ProviderCatalogRepository,
    PlatformAdminGuard,
  ],
  exports: [ProviderCatalogService, ProviderCatalogRepository],
})
export class ProviderCatalogModule {}
