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
import { ProjectRepository } from './project.repository';
import { ProjectApiKeyRepository } from './project-api-key.repository';
import { ProjectProviderRepository } from './project-provider.repository';
import { PlatformAccountModule } from '../platform-account/platform-account.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, ProjectApiKey, ProjectProvider]),
    forwardRef(() => PlatformAccountModule),
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
  ],
  exports: [
    ProjectService,
    ProjectApiKeyService,
    ProjectProviderService,
    ProjectRepository,
    ProjectApiKeyRepository,
    ProjectProviderRepository,
  ],
})
export class ProjectModule {}
