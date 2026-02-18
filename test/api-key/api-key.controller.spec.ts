import { Test, TestingModule } from '@nestjs/testing';
import { ApiKeyController } from '../../src/api-key/api-key.controller';
import { ApiKeyService } from '../../src/api-key/api-key.service';
import { CreateApiKeyDto } from '../../src/api-key/dto/create-api-key.dto';

describe('ApiKeyController', () => {
  let controller: ApiKeyController;
  let apiKeyService: any;

  beforeEach(async () => {
    apiKeyService = {
      createApiKey: jest.fn(),
      getUserApiKeys: jest.fn(),
      getApiKeyById: jest.fn(),
      revokeApiKey: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApiKeyController],
      providers: [
        {
          provide: ApiKeyService,
          useValue: apiKeyService,
        },
      ],
    }).compile();

    controller = module.get<ApiKeyController>(ApiKeyController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createApiKey', () => {
    it('should call apiKeyService.createApiKey', async () => {
      const userId = 'user-id';
      const dto: CreateApiKeyDto = {
        scope: 'test',
        description: 'test',
      };
      apiKeyService.createApiKey.mockResolvedValue({ id: 'key' });

      await controller.createApiKey(userId, dto);
      expect(apiKeyService.createApiKey).toHaveBeenCalledWith(userId, dto);
    });
  });

  describe('getUserApiKeys', () => {
    it('should call apiKeyService.getUserApiKeys', async () => {
      const userId = 'user-id';
      await controller.getUserApiKeys(userId);
      expect(apiKeyService.getUserApiKeys).toHaveBeenCalledWith(userId);
    });
  });

  describe('getApiKeyById', () => {
    it('should call apiKeyService.getApiKeyById', async () => {
      const userId = 'user-id';
      const id = 'key-id';
      await controller.getApiKeyById(userId, id);
      expect(apiKeyService.getApiKeyById).toHaveBeenCalledWith(id, userId);
    });
  });

  describe('revokeApiKey', () => {
    it('should call apiKeyService.revokeApiKey', async () => {
      const userId = 'user-id';
      const id = 'key-id';
      await controller.revokeApiKey(userId, id);
      expect(apiKeyService.revokeApiKey).toHaveBeenCalledWith(id, userId);
    });
  });
});
