import { Test, TestingModule } from '@nestjs/testing';
import { ApiKeyService } from '../../src/api-key/api-key.service';
import { ApiKeyRepository } from '../../src/api-key/api-key.repository';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../../src/entities/user.entity';
import { ApiKeyScope } from '../../src/entities/api-key.entity';
import {
  NotFoundException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import * as helpers from '../../src/helpers/api-helper';
import { API_KEY_PREFIX } from '../../src/constant';

describe('ApiKeyService', () => {
  let service: ApiKeyService;
  let apiKeyRepository: any;
  let userRepository: any;

  beforeEach(async () => {
    apiKeyRepository = {
      findByUserIdAndScope: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      findByIdWithUser: jest.fn(),
      remove: jest.fn(),
      findAllByUserId: jest.fn(),
    };

    userRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyService,
        {
          provide: ApiKeyRepository,
          useValue: apiKeyRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
      ],
    }).compile();

    service = module.get<ApiKeyService>(ApiKeyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createApiKey', () => {
    const userId = 'user-id';
    const createApiKeyDto = {
      scope: 'test' as ApiKeyScope,
      description: 'Test Key',
      quota: 1000,
    };

    it('should throw NotFoundException if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);
      await expect(
        service.createApiKey(userId, createApiKeyDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if key already exists for scope', async () => {
      userRepository.findOne.mockResolvedValue({ id: userId });
      apiKeyRepository.findByUserIdAndScope.mockResolvedValue({});
      await expect(
        service.createApiKey(userId, createApiKeyDto),
      ).rejects.toThrow(ConflictException);
    });

    it('should create and return new API key', async () => {
      userRepository.findOne.mockResolvedValue({ id: userId });
      apiKeyRepository.findByUserIdAndScope.mockResolvedValue(null);

      const rawKey = 'rawKey';
      const hashedKey = 'hashedKey';
      jest
        .spyOn(helpers, 'generateApiKey')
        .mockReturnValue({ rawKey, hashedKey });

      const savedApiKey = {
        id: 'key-id',
        hashedKey,
        scope: createApiKeyDto.scope,
        description: createApiKeyDto.description,
        createdAt: new Date(),
        user: { id: userId },
      };
      apiKeyRepository.create.mockReturnValue(savedApiKey); // mock create return
      apiKeyRepository.save.mockResolvedValue(savedApiKey);

      const result = await service.createApiKey(userId, createApiKeyDto);

      expect(result.rawKey).toBe(`${API_KEY_PREFIX}key-id_${rawKey}`);
      expect(apiKeyRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          hashedKey,
          scope: createApiKeyDto.scope,
          user: expect.objectContaining({ id: userId }),
        }),
      );
    });
  });

  describe('verifyApiKey', () => {
    it('should throw UnauthorizedException for invalid format', async () => {
      await expect(service.verifyApiKey('invalid')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for invalid parts length', async () => {
      await expect(
        service.verifyApiKey(`${API_KEY_PREFIX}invalid`),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if key not found', async () => {
      apiKeyRepository.findByIdWithUser.mockResolvedValue(null);
      await expect(
        service.verifyApiKey(`${API_KEY_PREFIX}id_secret`),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if hash verification fails', async () => {
      apiKeyRepository.findByIdWithUser.mockResolvedValue({
        hashedKey: 'hash',
      });
      jest.spyOn(helpers, 'verifyApiKey').mockReturnValue(false);
      await expect(
        service.verifyApiKey(`${API_KEY_PREFIX}id_secret`),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if key expired', async () => {
      apiKeyRepository.findByIdWithUser.mockResolvedValue({
        hashedKey: 'hash',
        expiresAt: new Date(Date.now() - 1000),
      });
      jest.spyOn(helpers, 'verifyApiKey').mockReturnValue(true);
      await expect(
        service.verifyApiKey(`${API_KEY_PREFIX}id_secret`),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return api key if valid', async () => {
      const apiKey = { hashedKey: 'hash' };
      apiKeyRepository.findByIdWithUser.mockResolvedValue(apiKey);
      jest.spyOn(helpers, 'verifyApiKey').mockReturnValue(true);

      const result = await service.verifyApiKey(`${API_KEY_PREFIX}id_secret`);
      expect(result).toBe(apiKey);
    });
  });

  describe('revokeApiKey', () => {
    const apiKeyId = 'key-id';
    const userId = 'user-id';

    it('should throw NotFoundException if key not found', async () => {
      apiKeyRepository.findByIdWithUser.mockResolvedValue(null);
      await expect(service.revokeApiKey(apiKeyId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw UnauthorizedException if user mismatch', async () => {
      apiKeyRepository.findByIdWithUser.mockResolvedValue({
        user: { id: 'other-user' },
      });
      await expect(service.revokeApiKey(apiKeyId, userId)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should remove key if valid', async () => {
      const apiKey = { user: { id: userId } };
      apiKeyRepository.findByIdWithUser.mockResolvedValue(apiKey);
      await service.revokeApiKey(apiKeyId, userId);
      expect(apiKeyRepository.remove).toHaveBeenCalledWith(apiKey);
    });
  });

  describe('getUserApiKeys', () => {
    it('should return list of keys without hashedKey', async () => {
      const keys = [
        { hashedKey: 'hash', id: '1' },
        { hashedKey: 'hash', id: '2' },
      ];
      apiKeyRepository.findAllByUserId.mockResolvedValue(keys);

      const result = await service.getUserApiKeys('user-id');
      expect(result).toHaveLength(2);
      expect(result[0]).not.toHaveProperty('hashedKey');
      expect(result[0]).toHaveProperty('id', '1');
    });
  });

  describe('getApiKeyById', () => {
    const apiKeyId = 'key-id';
    const userId = 'user-id';

    it('should throw NotFoundException if key not found', async () => {
      apiKeyRepository.findByIdWithUser.mockResolvedValue(null);
      await expect(service.getApiKeyById(apiKeyId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw UnauthorizedException if user mismatch', async () => {
      apiKeyRepository.findByIdWithUser.mockResolvedValue({
        user: { id: 'other-user' },
      });
      await expect(service.getApiKeyById(apiKeyId, userId)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should return key without hashedKey', async () => {
      const apiKey = { user: { id: userId }, hashedKey: 'hash', id: apiKeyId };
      apiKeyRepository.findByIdWithUser.mockResolvedValue(apiKey);

      const result = await service.getApiKeyById(apiKeyId, userId);
      expect(result).not.toHaveProperty('hashedKey');
      expect(result).toHaveProperty('id', apiKeyId);
    });
  });
});
