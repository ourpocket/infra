import { Module } from '@nestjs/common';
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

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Project,
      PlatformAccount,
      ProjectApiKey,
      ProjectProvider,
    ]),
  ],
  controllers: [
    ProjectController,
    ProjectApiKeyController,
    ProjectProviderController,
  ],
  providers: [ProjectService, ProjectApiKeyService, ProjectProviderService],
  exports: [ProjectService, ProjectApiKeyService, ProjectProviderService],
})
export class ProjectModule {}
