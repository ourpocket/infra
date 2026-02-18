import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { generateApiKey, verifyApiKey } from '../helpers';
import { Repository } from 'typeorm';
import { ApiKey, ApiKeyScope } from '../entities/api-key.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { API_KEY_PREFIX } from '../constant';
import { ApiKeyRepository } from './api-key.repository';

export interface ApiKeyResponse {
  id: string;
  rawKey: string;
  scope: ApiKeyScope;
  description?: string;
  expiresAt?: Date;
  createdAt: Date;
}

@Injectable()
export class ApiKeyService {
  constructor(
    private readonly apiKeyRepository: ApiKeyRepository,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async createApiKey(
    userId: string,
    createApiKeyDto: CreateApiKeyDto,
  ): Promise<ApiKeyResponse> {
    const { scope, description, expiresAt, quota } = createApiKeyDto;

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const existingKey = await this.apiKeyRepository.findByUserIdAndScope(
      userId,
      scope,
    );

    if (existingKey) {
      throw new ConflictException(
        `API key with scope '${scope}' already exists for this user`,
      );
    }

    const { rawKey, hashedKey } = generateApiKey(32);

    const apiKey = this.apiKeyRepository.create({
      hashedKey,
      scope,
      description,
      expiresAt,
      quota: quota ?? 1000,
      user,
    });

    const savedApiKey = await this.apiKeyRepository.save(apiKey);

    return {
      id: savedApiKey.id,
      rawKey: `${API_KEY_PREFIX}${savedApiKey.id}_${rawKey}`,
      scope: savedApiKey.scope,
      description: savedApiKey.description,
      expiresAt: savedApiKey.expiresAt,
      createdAt: savedApiKey.createdAt,
    };
  }

  async verifyApiKey(incomingKey: string): Promise<ApiKey> {
    if (!incomingKey.startsWith(API_KEY_PREFIX)) {
      throw new UnauthorizedException('Invalid API key format');
    }

    const keyWithoutPrefix = incomingKey.slice(API_KEY_PREFIX.length);
    const parts = keyWithoutPrefix.split('_');

    if (parts.length !== 2) {
      throw new UnauthorizedException('Invalid API key format');
    }

    const [apiKeyId, rawSecret] = parts;

    const apiKey = await this.apiKeyRepository.findByIdWithUser(apiKeyId);

    if (!apiKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    if (!verifyApiKey(rawSecret, apiKey.hashedKey)) {
      throw new UnauthorizedException('Invalid API key');
    }

    if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
      throw new UnauthorizedException('API key has expired');
    }

    return apiKey;
  }

  async revokeApiKey(apiKeyId: string, userId: string): Promise<void> {
    const apiKey = await this.apiKeyRepository.findByIdWithUser(apiKeyId);

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    if (apiKey.user.id !== userId) {
      throw new UnauthorizedException(
        'You are not authorized to revoke this API key',
      );
    }

    await this.apiKeyRepository.remove(apiKey);
  }

  async getUserApiKeys(userId: string): Promise<Omit<ApiKey, 'hashedKey'>[]> {
    const apiKeys = await this.apiKeyRepository.findAllByUserId(userId);

    return apiKeys.map(({ hashedKey, ...rest }) => rest);
  }

  async getApiKeyById(
    apiKeyId: string,
    userId: string,
  ): Promise<Omit<ApiKey, 'hashedKey'>> {
    const apiKey = await this.apiKeyRepository.findByIdWithUser(apiKeyId);

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    if (apiKey.user.id !== userId) {
      throw new UnauthorizedException(
        'You are not authorized to view this API key',
      );
    }

    const { hashedKey, ...rest } = apiKey;
    return rest;
  }
}
