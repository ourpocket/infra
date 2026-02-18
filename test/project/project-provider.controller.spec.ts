import { Test, TestingModule } from '@nestjs/testing';
import { ProjectProviderController } from '../../src/project/project-provider.controller';
import { ProjectProviderService } from '../../src/project/project-provider.service';
import { ConfigureProjectProviderDto } from '../../src/project/dto/configure-project-provider.dto';
import { PROVIDER_TYPE_ENUM } from '../../src/enums';

describe('ProjectProviderController', () => {
  let controller: ProjectProviderController;
  let service: any;

  beforeEach(async () => {
    service = {
      configureProvider: jest.fn(),
      listProvidersForProject: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectProviderController],
      providers: [
        {
          provide: ProjectProviderService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<ProjectProviderController>(
      ProjectProviderController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('configureProvider', () => {
    it('should call service.configureProvider and return result', async () => {
      const userId = 'user-id';
      const projectId = 'project-id';
      const dto: ConfigureProjectProviderDto = {
        type: PROVIDER_TYPE_ENUM.PAYSTACK,
        config: {},
        isActive: true,
      };
      const result = { id: 'prov-id', ...dto };

      service.configureProvider.mockResolvedValue(result);

      expect(
        await controller.configureProvider(userId, projectId, dto),
      ).toEqual(result);
      expect(service.configureProvider).toHaveBeenCalledWith(
        userId,
        projectId,
        dto,
      );
    });
  });

  describe('listProviders', () => {
    it('should call service.listProvidersForProject and return result', async () => {
      const userId = 'user-id';
      const projectId = 'project-id';
      const result = [{ id: 'prov-id' }];

      service.listProvidersForProject.mockResolvedValue(result);

      expect(await controller.listProviders(userId, projectId)).toEqual(result);
      expect(service.listProvidersForProject).toHaveBeenCalledWith(
        userId,
        projectId,
      );
    });
  });
});
