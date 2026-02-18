import { Test, TestingModule } from '@nestjs/testing';
import { ProjectApiKeyService } from '../../src/project/project-api-key.service';
import { ProjectApiKeyRepository } from '../../src/project/project-api-key.repository';
import { ProjectRepository } from '../../src/project/project.repository';
import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ProjectApiKeyScope } from '../../src/entities/project-api-key.entity';
import * as crypto from 'crypto';
import { API_KEY_PREFIX } from '../../src/constant';

describe('ProjectApiKeyService', () => {
  let service: ProjectApiKeyService;
  let projectApiKeyRepository: any;
  let projectRepository: any;

  beforeEach(async () => {
    projectApiKeyRepository = {
      findByProjectIdAndScope: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      findByHashedKey: jest.fn(),
      findByIdAndProjectIdAndUserId: jest.fn(),
      remove: jest.fn(),
      findAllByProjectId: jest.fn(),
    };

    projectRepository = {
      findByIdAndUserId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectApiKeyService,
        {
          provide: ProjectApiKeyRepository,
          useValue: projectApiKeyRepository,
        },
        {
          provide: ProjectRepository,
          useValue: projectRepository,
        },
      ],
    }).compile();

    service = module.get<ProjectApiKeyService>(ProjectApiKeyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createProjectApiKey', () => {
    const userId = 'user-id';
    const projectId = 'project-id';
    const dto = {
      scope: 'test' as ProjectApiKeyScope,
      description: 'test key',
    };

    it('should throw NotFoundException if project not found', async () => {
      projectRepository.findByIdAndUserId.mockResolvedValue(null);

      await expect(
        service.createProjectApiKey(userId, projectId, dto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if key with scope already exists', async () => {
      projectRepository.findByIdAndUserId.mockResolvedValue({ id: projectId });
      projectApiKeyRepository.findByProjectIdAndScope.mockResolvedValue({
        id: 'existing-key',
      });

      await expect(
        service.createProjectApiKey(userId, projectId, dto),
      ).rejects.toThrow(ConflictException);
    });

    it('should create and return new API key', async () => {
      projectRepository.findByIdAndUserId.mockResolvedValue({ id: projectId });
      projectApiKeyRepository.findByProjectIdAndScope.mockResolvedValue(null);

      const savedApiKey = {
        id: 'key-id',
        scope: dto.scope,
        description: dto.description,
        createdAt: new Date(),
        hashedKey: 'hashed-key',
      };

      projectApiKeyRepository.create.mockReturnValue(savedApiKey);
      projectApiKeyRepository.save.mockResolvedValue(savedApiKey);

      const result = await service.createProjectApiKey(userId, projectId, dto);

      expect(result).toEqual({
        id: savedApiKey.id,
        rawKey: expect.stringMatching(new RegExp(`^${API_KEY_PREFIX}`)),
        scope: savedApiKey.scope,
        description: savedApiKey.description,
        expiresAt: undefined,
        createdAt: savedApiKey.createdAt,
      });
      expect(projectApiKeyRepository.create).toHaveBeenCalled();
      expect(projectApiKeyRepository.save).toHaveBeenCalled();
    });
  });

  describe('verifyProjectApiKey', () => {
    const rawKey = 'test-api-key';
    const prefixedKey = `${API_KEY_PREFIX}${rawKey}`;
    const hashedKey = crypto.createHash('sha256').update(rawKey).digest('hex');

    it('should throw UnauthorizedException if key is invalid', async () => {
      projectApiKeyRepository.findByHashedKey.mockResolvedValue(null);

      await expect(service.verifyProjectApiKey(prefixedKey)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if key is expired', async () => {
      projectApiKeyRepository.findByHashedKey.mockResolvedValue({
        expiresAt: new Date(Date.now() - 1000), // Expired
      });

      await expect(service.verifyProjectApiKey(prefixedKey)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should return matched key if valid (with prefix)', async () => {
      const matchedKey = { id: 'key-id' };
      projectApiKeyRepository.findByHashedKey.mockResolvedValue(matchedKey);

      const result = await service.verifyProjectApiKey(prefixedKey);
      expect(result).toBe(matchedKey);
      expect(projectApiKeyRepository.findByHashedKey).toHaveBeenCalledWith(
        hashedKey,
      );
    });

    it('should return matched key if valid (without prefix)', async () => {
      const matchedKey = { id: 'key-id' };
      projectApiKeyRepository.findByHashedKey.mockResolvedValue(matchedKey);

      const result = await service.verifyProjectApiKey(rawKey);
      expect(result).toBe(matchedKey);
      expect(projectApiKeyRepository.findByHashedKey).toHaveBeenCalledWith(
        hashedKey,
      );
    });
  });

  describe('revokeProjectApiKey', () => {
    const userId = 'user-id';
    const projectId = 'project-id';
    const apiKeyId = 'key-id';

    it('should throw NotFoundException if key not found', async () => {
      projectApiKeyRepository.findByIdAndProjectIdAndUserId.mockResolvedValue(
        null,
      );

      await expect(
        service.revokeProjectApiKey(userId, projectId, apiKeyId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should remove the key if found', async () => {
      const apiKey = { id: apiKeyId };
      projectApiKeyRepository.findByIdAndProjectIdAndUserId.mockResolvedValue(
        apiKey,
      );

      await service.revokeProjectApiKey(userId, projectId, apiKeyId);
      expect(projectApiKeyRepository.remove).toHaveBeenCalledWith(apiKey);
    });
  });

  describe('getProjectApiKeys', () => {
    const userId = 'user-id';
    const projectId = 'project-id';

    it('should throw NotFoundException if project not found', async () => {
      projectRepository.findByIdAndUserId.mockResolvedValue(null);

      await expect(
        service.getProjectApiKeys(userId, projectId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return list of keys without hashedKey', async () => {
      projectRepository.findByIdAndUserId.mockResolvedValue({ id: projectId });
      const apiKeys = [
        { id: 'key-1', hashedKey: 'hash-1', scope: 'read' },
        { id: 'key-2', hashedKey: 'hash-2', scope: 'write' },
      ];
      projectApiKeyRepository.findAllByProjectId.mockResolvedValue(apiKeys);

      const result = await service.getProjectApiKeys(userId, projectId);

      expect(result).toHaveLength(2);
      expect(result[0]).not.toHaveProperty('hashedKey');
      expect(result[1]).not.toHaveProperty('hashedKey');
      expect(result[0]).toHaveProperty('id', 'key-1');
    });
  });
});
