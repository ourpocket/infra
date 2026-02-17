import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectProvider } from '../entities/project-provider.entity';
import { Project } from '../entities/project.entity';
import { PROVIDER_TYPE_ENUM } from '../enums';
import { ConfigureProjectProviderDto } from './dto/configure-project-provider.dto';

@Injectable()
export class ProjectProviderService {
  constructor(
    @InjectRepository(ProjectProvider)
    private readonly projectProviderRepository: Repository<ProjectProvider>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  async configureProvider(
    userId: string,
    projectId: string,
    dto: ConfigureProjectProviderDto,
  ): Promise<ProjectProvider> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId, platformAccount: { user: { id: userId } } },
      relations: ['platformAccount'],
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const existing = await this.projectProviderRepository.findOne({
      where: {
        project: { id: projectId },
        type: dto.type,
      },
      relations: ['project'],
    });

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
    const project = await this.projectRepository.findOne({
      where: { id: projectId, platformAccount: { user: { id: userId } } },
      relations: ['platformAccount'],
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return this.projectProviderRepository.find({
      where: { project: { id: projectId } },
      order: { createdAt: 'DESC' },
    });
  }

  async findActiveProviderForProject(
    projectId: string,
    type: PROVIDER_TYPE_ENUM,
  ): Promise<ProjectProvider> {
    const provider = await this.projectProviderRepository.findOne({
      where: { project: { id: projectId }, type, isActive: true },
      relations: ['project'],
    });

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
