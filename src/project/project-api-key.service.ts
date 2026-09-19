import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import {
  ProjectApiKey,
  ProjectApiKeyScope,
} from '../entities/project-api-key.entity';
import { Project } from '../entities/project.entity';
import { generateApiKey } from '../helpers';
import { API_KEY_PREFIX, PROJECT_API_KEY_PREFIX } from '../constant';
import { CreateProjectApiKeyDto } from './dto/create-project-api-key.dto';
import { ProjectApiKeyRepository } from './project-api-key.repository';
import { ProjectRepository } from './project.repository';
import { PROJECT_API_KEY_SCOPE_ENUM } from '../enums';

export interface ProjectApiKeyResponse {
  id: string;
  rawKey: string;
  scope: ProjectApiKeyScope;
  description?: string;
  expiresAt?: Date;
  createdAt: Date;
}

export type ProjectApiKeyListItem = Omit<
  ProjectApiKey,
  'hashedKey' | 'encryptedKey'
> & {
  keyPreview: string;
  rawKey?: string;
};

@Injectable()
export class ProjectApiKeyService {
  constructor(
    private readonly projectApiKeyRepository: ProjectApiKeyRepository,
    private readonly projectRepository: ProjectRepository,
  ) {}

  async createProjectApiKey(
    userId: string,
    projectId: string,
    dto: CreateProjectApiKeyDto,
  ): Promise<ProjectApiKeyResponse> {
    const project = await this.projectRepository.findByIdAndUserId(
      projectId,
      userId,
    );

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const existingKey =
      await this.projectApiKeyRepository.findByProjectIdAndScope(
        project.id,
        dto.scope,
      );

    if (existingKey) {
      throw new ConflictException(
        `API key with scope '${dto.scope}' already exists for this project`,
      );
    }

    const { rawKey, hashedKey } = generateApiKey(32);
    const prefixedRawKey = `${PROJECT_API_KEY_PREFIX[dto.scope]}${rawKey}`;

    const apiKey = this.projectApiKeyRepository.create({
      project,
      scope: dto.scope as ProjectApiKeyScope,
      description: dto.description,
      expiresAt: dto.expiresAt,
      quota: dto.quota ?? 1000,
      hashedKey,
      encryptedKey: null,
    });

    const savedApiKey = await this.projectApiKeyRepository.save(apiKey);

    return {
      id: savedApiKey.id,
      rawKey: prefixedRawKey,
      scope: savedApiKey.scope,
      description: savedApiKey.description ?? undefined,
      expiresAt: savedApiKey.expiresAt ?? undefined,
      createdAt: savedApiKey.createdAt,
    };
  }

  async verifyProjectApiKey(incomingKey: string): Promise<ProjectApiKey> {
    const { rawKey, scope } = this.extractRawKey(incomingKey);

    const hashedKey = crypto.createHash('sha256').update(rawKey).digest('hex');

    const matchedKey =
      await this.projectApiKeyRepository.findByHashedKey(hashedKey);

    if (!matchedKey) {
      throw new UnauthorizedException('Invalid project API key');
    }

    if (matchedKey.expiresAt && new Date() > matchedKey.expiresAt) {
      throw new UnauthorizedException('Project API key has expired');
    }

    if (scope && matchedKey.scope !== scope) {
      throw new UnauthorizedException('Invalid project API key scope');
    }

    return matchedKey;
  }

  async revokeProjectApiKey(
    userId: string,
    projectId: string,
    apiKeyId: string,
  ): Promise<void> {
    const apiKey =
      await this.projectApiKeyRepository.findByIdAndProjectIdAndUserId(
        apiKeyId,
        projectId,
        userId,
      );

    if (!apiKey) {
      throw new NotFoundException('Project API key not found');
    }

    await this.projectApiKeyRepository.remove(apiKey);
  }

  async rotateProjectApiKey(
    userId: string,
    projectId: string,
    apiKeyId: string,
  ): Promise<ProjectApiKeyResponse> {
    const owned =
      await this.projectApiKeyRepository.findByIdAndProjectIdAndUserId(
        apiKeyId,
        projectId,
        userId,
      );
    if (!owned) throw new NotFoundException('Project API key not found');
    return this.projectApiKeyRepository.manager.transaction(async (manager) => {
      const key = await manager.findOne(ProjectApiKey, {
        where: { id: apiKeyId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!key) throw new NotFoundException('Project API key not found');
      const { rawKey, hashedKey } = generateApiKey(32);
      key.hashedKey = hashedKey;
      key.encryptedKey = null;
      key.used = 0;
      await manager.save(key);
      return {
        id: key.id,
        rawKey: `${PROJECT_API_KEY_PREFIX[key.scope]}${rawKey}`,
        scope: key.scope,
        description: key.description ?? undefined,
        expiresAt: key.expiresAt ?? undefined,
        createdAt: key.createdAt,
      };
    });
  }

  async getProjectApiKeys(
    userId: string,
    projectId: string,
  ): Promise<ProjectApiKeyListItem[]> {
    const project = await this.projectRepository.findByIdAndUserId(
      projectId,
      userId,
    );

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const apiKeys = await this.projectApiKeyRepository.findAllByProjectId(
      project.id,
    );

    return apiKeys.map(({ hashedKey, encryptedKey, ...rest }) => ({
      ...rest,
      keyPreview: `${PROJECT_API_KEY_PREFIX[rest.scope]}********`,
    }));
  }

  private extractRawKey(incomingKey: string): {
    rawKey: string;
    scope?: ProjectApiKeyScope;
  } {
    const normalizedKey = incomingKey.trim();

    if (normalizedKey.startsWith(PROJECT_API_KEY_PREFIX.test)) {
      return {
        rawKey: normalizedKey.slice(PROJECT_API_KEY_PREFIX.test.length),
        scope: PROJECT_API_KEY_SCOPE_ENUM.TEST,
      };
    }

    if (normalizedKey.startsWith(PROJECT_API_KEY_PREFIX.live)) {
      return {
        rawKey: normalizedKey.slice(PROJECT_API_KEY_PREFIX.live.length),
        scope: PROJECT_API_KEY_SCOPE_ENUM.LIVE,
      };
    }

    if (normalizedKey.startsWith(API_KEY_PREFIX)) {
      return {
        rawKey: normalizedKey.slice(API_KEY_PREFIX.length),
      };
    }

    return {
      rawKey: normalizedKey,
    };
  }
}
