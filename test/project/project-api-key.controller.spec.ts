import { Test, TestingModule } from '@nestjs/testing';
import { ProjectApiKeyController } from '../../src/project/project-api-key.controller';
import { ProjectApiKeyService } from '../../src/project/project-api-key.service';
import { CreateProjectApiKeyDto } from '../../src/project/dto/create-project-api-key.dto';

describe('ProjectApiKeyController', () => {
  let controller: ProjectApiKeyController;
  let service: any;

  beforeEach(async () => {
    service = {
      createProjectApiKey: jest.fn(),
      getProjectApiKeys: jest.fn(),
      revokeProjectApiKey: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectApiKeyController],
      providers: [
        {
          provide: ProjectApiKeyService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<ProjectApiKeyController>(ProjectApiKeyController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createProjectApiKey', () => {
    it('should call service.createProjectApiKey and return result', async () => {
      const userId = 'user-id';
      const projectId = 'project-id';
      const dto: CreateProjectApiKeyDto = {
        scope: 'test',
        description: 'Test Key',
      };
      const result = { id: 'key-id', ...dto };

      service.createProjectApiKey.mockResolvedValue(result);

      expect(
        await controller.createProjectApiKey(userId, projectId, dto),
      ).toEqual(result);
      expect(service.createProjectApiKey).toHaveBeenCalledWith(
        userId,
        projectId,
        dto,
      );
    });
  });

  describe('listProjectApiKeys', () => {
    it('should call service.getProjectApiKeys and return result', async () => {
      const userId = 'user-id';
      const projectId = 'project-id';
      const result = [{ id: 'key-id' }];

      service.getProjectApiKeys.mockResolvedValue(result);

      expect(await controller.listProjectApiKeys(userId, projectId)).toEqual(
        result,
      );
      expect(service.getProjectApiKeys).toHaveBeenCalledWith(userId, projectId);
    });
  });

  describe('revokeProjectApiKey', () => {
    it('should call service.revokeProjectApiKey', async () => {
      const userId = 'user-id';
      const projectId = 'project-id';
      const keyId = 'key-id';

      await controller.revokeProjectApiKey(userId, projectId, keyId);

      expect(service.revokeProjectApiKey).toHaveBeenCalledWith(
        userId,
        projectId,
        keyId,
      );
    });
  });
});
