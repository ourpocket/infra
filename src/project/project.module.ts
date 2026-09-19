import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from '../entities/project.entity';
import { PlatformAccount } from '../entities/platform-account.entity';
import { ProjectApiKey } from '../entities/project-api-key.entity';
import { ProjectProvider } from '../entities/project-provider.entity';
import { ProjectService } from './project.service';
import { ProjectApiKeyService } from './project-api-key.service';
import { ProjectController } from './project.controller';
import { ProjectApiKeyController } from './project-api-key.controller';
import { ProjectProviderService } from './project-provider.service';
import { ProjectProviderController } from './project-provider.controller';
import { ProviderRegistry } from '../providers/provider-registry';
import { ProjectRepository } from './project.repository';
import { ProjectApiKeyRepository } from './project-api-key.repository';
import { ProjectProviderRepository } from './project-provider.repository';
import { PlatformAccountModule } from '../platform-account/platform-account.module';
import { ProjectApiKeyGuard } from './guards/project-api-key.guard';
import { ProviderCatalogModule } from '../provider-catalog/provider-catalog.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, ProjectApiKey, ProjectProvider]),
    forwardRef(() => PlatformAccountModule),
    ProviderCatalogModule,
  ],
  controllers: [
    ProjectController,
    ProjectApiKeyController,
    ProjectProviderController,
  ],
  providers: [
    ProjectService,
    ProjectApiKeyService,
    ProjectProviderService,
    ProjectRepository,
    ProjectApiKeyRepository,
    ProjectProviderRepository,
    ProviderRegistry,
    ProjectApiKeyGuard,
  ],
  exports: [
    ProjectService,
    ProjectApiKeyService,
    ProjectProviderService,
    ProjectRepository,
    ProjectApiKeyRepository,
    ProjectProviderRepository,
    ProviderRegistry,
    ProjectApiKeyGuard,
  ],
})
export class ProjectModule {}
