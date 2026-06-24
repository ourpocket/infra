import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { ProjectProvider } from '../entities/project-provider.entity';
import { PROVIDER_TYPE_ENUM, ROUTING_STRATEGY_ENUM } from '../enums';
import { ConfigureProjectProviderDto } from './dto/configure-project-provider.dto';
import { ProjectProviderRepository } from './project-provider.repository';
import { ProjectRepository } from './project.repository';

interface EncryptedProviderConfig {
  encrypted: true;
  iv: string;
  tag: string;
  data: string;
}

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
      existing.config = this.encryptConfig(dto.config);
      existing.isActive = dto.isActive ?? true;
      const saved = await this.projectProviderRepository.save(existing);
      return this.sanitizeProvider(saved);
    }

    const provider = this.projectProviderRepository.create({
      project,
      type: dto.type,
      config: this.encryptConfig(dto.config),
      isActive: dto.isActive ?? true,
    });

    const saved = await this.projectProviderRepository.save(provider);
    return this.sanitizeProvider(saved);
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

    const providers =
      await this.projectProviderRepository.findAllByProjectId(projectId);

    return providers.map((provider) => this.sanitizeProvider(provider));
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

  async selectProviderForProject(
    projectId: string,
    strategy: ROUTING_STRATEGY_ENUM = ROUTING_STRATEGY_ENUM.BEST_SUCCESS_RATE,
    priority: PROVIDER_TYPE_ENUM[] = [],
  ): Promise<ProjectProvider> {
    const providers =
      await this.projectProviderRepository.findAllByProjectId(projectId);
    const activeProviders = providers.filter((provider) => provider.isActive);

    if (activeProviders.length === 0) {
      throw new NotFoundException('No active provider is configured');
    }

    if (strategy === ROUTING_STRATEGY_ENUM.CUSTOM_PRIORITY) {
      const prioritizedProvider = priority
        .map((type) =>
          activeProviders.find((provider) => provider.type === type),
        )
        .find((provider): provider is ProjectProvider => Boolean(provider));

      if (prioritizedProvider) {
        return prioritizedProvider;
      }
    }

    const [selectedProvider] = activeProviders.sort((left, right) => {
      const leftConfig = this.decryptConfig(left.config);
      const rightConfig = this.decryptConfig(right.config);

      if (strategy === ROUTING_STRATEGY_ENUM.LOWEST_FEES) {
        return (
          this.getNumericConfig(leftConfig, 'feePercentage') -
          this.getNumericConfig(rightConfig, 'feePercentage')
        );
      }

      if (strategy === ROUTING_STRATEGY_ENUM.FASTEST_SETTLEMENT) {
        return (
          this.getNumericConfig(leftConfig, 'settlementMinutes') -
          this.getNumericConfig(rightConfig, 'settlementMinutes')
        );
      }

      if (strategy === ROUTING_STRATEGY_ENUM.CUSTOM_PRIORITY) {
        return (
          this.getNumericConfig(leftConfig, 'priority') -
          this.getNumericConfig(rightConfig, 'priority')
        );
      }

      return (
        this.getNumericConfig(rightConfig, 'successRate') -
        this.getNumericConfig(leftConfig, 'successRate')
      );
    });

    return selectedProvider;
  }

  async getProviderApiKeyForProject(
    projectId: string,
    type: PROVIDER_TYPE_ENUM,
  ): Promise<string> {
    const provider = await this.findActiveProviderForProject(projectId, type);
    const config = this.decryptConfig(provider.config);
    const apiKey = config.apiKey;

    if (!apiKey || typeof apiKey !== 'string') {
      throw new UnauthorizedException('Provider API key is not configured');
    }

    return apiKey;
  }

  private encryptConfig(
    config: Record<string, unknown>,
  ): EncryptedProviderConfig {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(
      'aes-256-gcm',
      this.getEncryptionKey(),
      iv,
    );
    const data = Buffer.concat([
      cipher.update(JSON.stringify(config), 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    return {
      encrypted: true,
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
      data: data.toString('hex'),
    };
  }

  private decryptConfig(
    config: Record<string, any> | null,
  ): Record<string, any> {
    if (!config) {
      return {};
    }

    if (!this.isEncryptedConfig(config)) {
      return config;
    }

    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      this.getEncryptionKey(),
      Buffer.from(config.iv, 'hex'),
    );
    decipher.setAuthTag(Buffer.from(config.tag, 'hex'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(config.data, 'hex')),
      decipher.final(),
    ]);

    return JSON.parse(decrypted.toString('utf8')) as Record<string, any>;
  }

  private sanitizeProvider(provider: ProjectProvider): ProjectProvider {
    return {
      ...provider,
      config: this.maskConfig(this.decryptConfig(provider.config)),
    };
  }

  private maskConfig(config: Record<string, any>): Record<string, any> {
    return Object.fromEntries(
      Object.entries(config).map(([key, value]) => {
        if (this.isSensitiveKey(key)) {
          return [key, this.maskValue(value)];
        }

        return [key, value];
      }),
    );
  }

  private isSensitiveKey(key: string): boolean {
    const normalizedKey = key.toLowerCase();
    return (
      normalizedKey.includes('key') ||
      normalizedKey.includes('secret') ||
      normalizedKey.includes('token') ||
      normalizedKey.includes('password')
    );
  }

  private maskValue(value: unknown): string {
    if (typeof value !== 'string' || value.length <= 8) {
      return '********';
    }

    return `${value.slice(0, 4)}********${value.slice(-4)}`;
  }

  private getNumericConfig(config: Record<string, any>, key: string): number {
    const value = Number(config[key] ?? 0);
    return Number.isFinite(value) ? value : 0;
  }

  private isEncryptedConfig(
    config: Record<string, any>,
  ): config is EncryptedProviderConfig {
    return (
      config.encrypted === true &&
      typeof config.iv === 'string' &&
      typeof config.tag === 'string' &&
      typeof config.data === 'string'
    );
  }

  private getEncryptionKey(): Buffer {
    return crypto
      .createHash('sha256')
      .update(
        process.env.PROVIDER_CONFIG_ENCRYPTION_KEY ||
          process.env.JWT_SECRET ||
          'ourpocket-provider-config-development-secret',
      )
      .digest();
  }
}
