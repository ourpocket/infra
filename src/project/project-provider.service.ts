import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ProjectProvider } from '../entities/project-provider.entity';
import { Project } from '../entities/project.entity';
import { PROVIDER_TYPE_ENUM } from '../enums';
import { ConfigureProjectProviderDto } from './dto/configure-project-provider.dto';
import { ProjectProviderRepository } from './project-provider.repository';
import { ProjectRepository } from './project.repository';

@Injectable()
export class ProjectProviderService {
  constructor(
    private readonly projectProviderRepository: ProjectProviderRepository,
    private readonly projectRepository: ProjectRepository,
  ) {}

  async configureProvider(
    userId: string,
    projectId: string,
    dto: ConfigureProjectProviderDto,
  ): Promise<ProjectProvider> {
    const project = await this.projectRepository.findByIdAndUserId(
      projectId,
      userId,
    );

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const existing =
      await this.projectProviderRepository.findByProjectIdAndType(
        projectId,
        dto.type,
      );

    if (existing) {
      existing.config = dto.config;
      existing.isActive = dto.isActive ?? true;
      return this.projectProviderRepository.save(existing);
    }

    const provider = this.projectProviderRepository.create({
      project,
      type: dto.type,
      config: dto.config,
      isActive: dto.isActive ?? true,
    });

    return this.projectProviderRepository.save(provider);
  }

  async listProvidersForProject(
    userId: string,
    projectId: string,
  ): Promise<ProjectProvider[]> {
    const project = await this.projectRepository.findByIdAndUserId(
      projectId,
      userId,
    );

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return this.projectProviderRepository.findAllByProjectId(projectId);
  }

  async findActiveProviderForProject(
    projectId: string,
    type: PROVIDER_TYPE_ENUM,
  ): Promise<ProjectProvider> {
    const provider =
      await this.projectProviderRepository.findActiveByProjectIdAndType(
        projectId,
        type,
      );

    if (!provider) {
      throw new NotFoundException('Provider is not configured for project');
    }

    return provider;
  }

  async getProviderApiKeyForProject(
    projectId: string,
    type: PROVIDER_TYPE_ENUM,
  ): Promise<string> {
    const provider = await this.findActiveProviderForProject(projectId, type);
    const apiKey = provider.config?.apiKey;

    if (!apiKey || typeof apiKey !== 'string') {
      throw new UnauthorizedException('Provider API key is not configured');
    }

    return apiKey;
  }
}
