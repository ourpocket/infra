import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ProjectApiKey,
  ProjectApiKeyScope,
} from '../entities/project-api-key.entity';
import { Project } from '../entities/project.entity';
import { generateApiKey, verifyApiKey } from '../helpers';
import { API_KEY_PREFIX } from '../constant';
import { CreateProjectApiKeyDto } from './dto/create-project-api-key.dto';

export interface ProjectApiKeyResponse {
  id: string;
  rawKey: string;
  scope: ProjectApiKeyScope;
  description?: string;
  expiresAt?: Date;
  createdAt: Date;
}

@Injectable()
export class ProjectApiKeyService {
  constructor(
    @InjectRepository(ProjectApiKey)
    private readonly projectApiKeyRepository: Repository<ProjectApiKey>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  async createProjectApiKey(
    userId: string,
    projectId: string,
    dto: CreateProjectApiKeyDto,
  ): Promise<ProjectApiKeyResponse> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId, platformAccount: { user: { id: userId } } },
      relations: ['platformAccount'],
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const existingKey = await this.projectApiKeyRepository.findOne({
      where: {
        project: { id: project.id },
        scope: dto.scope as ProjectApiKeyScope,
      },
    });

    if (existingKey) {
      throw new ConflictException(
        `API key with scope '${dto.scope}' already exists for this project`,
      );
    }

    const { rawKey, hashedKey } = generateApiKey(32);

    const apiKey = this.projectApiKeyRepository.create({
      project,
      scope: dto.scope as ProjectApiKeyScope,
      description: dto.description,
      expiresAt: dto.expiresAt,
      quota: dto.quota ?? 1000,
      hashedKey,
    });

    const savedApiKey = await this.projectApiKeyRepository.save(apiKey);

    return {
      id: savedApiKey.id,
      rawKey: `${API_KEY_PREFIX}${rawKey}`,
      scope: savedApiKey.scope,
      description: savedApiKey.description ?? undefined,
      expiresAt: savedApiKey.expiresAt ?? undefined,
      createdAt: savedApiKey.createdAt,
    };
  }

  async verifyProjectApiKey(incomingKey: string): Promise<ProjectApiKey> {
    const prefix = API_KEY_PREFIX;
    const rawKey = incomingKey.startsWith(prefix)
      ? incomingKey.slice(prefix.length)
      : incomingKey;

    const allApiKeys = await this.projectApiKeyRepository.find({
      relations: ['project'],
    });

    const matchedKey = allApiKeys.find((apiKey) =>
      verifyApiKey(rawKey, apiKey.hashedKey),
    );

    if (!matchedKey) {
      throw new UnauthorizedException('Invalid project API key');
    }

    if (matchedKey.expiresAt && new Date() > matchedKey.expiresAt) {
      throw new UnauthorizedException('Project API key has expired');
    }

    return matchedKey;
  }

  async revokeProjectApiKey(
    userId: string,
    projectId: string,
    apiKeyId: string,
  ): Promise<void> {
    const apiKey = await this.projectApiKeyRepository.findOne({
      where: {
        id: apiKeyId,
        project: { id: projectId, platformAccount: { user: { id: userId } } },
      },
      relations: ['project', 'project.platformAccount'],
    });

    if (!apiKey) {
      throw new NotFoundException('Project API key not found');
    }

    await this.projectApiKeyRepository.remove(apiKey);
  }

  async getProjectApiKeys(
    userId: string,
    projectId: string,
  ): Promise<Omit<ProjectApiKey, 'hashedKey'>[]> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId, platformAccount: { user: { id: userId } } },
      relations: ['platformAccount'],
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const apiKeys = await this.projectApiKeyRepository.find({
      where: { project: { id: project.id } },
      order: { createdAt: 'DESC' },
    });

    return apiKeys.map(({ hashedKey, ...rest }) => rest);
  }
}
