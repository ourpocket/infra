import { Test, TestingModule } from '@nestjs/testing';
import { ProjectProviderService } from '../../src/project/project-provider.service';
import { ProjectProviderRepository } from '../../src/project/project-provider.repository';
import { ProjectRepository } from '../../src/project/project.repository';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PROVIDER_TYPE_ENUM } from '../../src/enums';

describe('ProjectProviderService', () => {
  let service: ProjectProviderService;
  let projectProviderRepository: any;
  let projectRepository: any;

  beforeEach(async () => {
    projectProviderRepository = {
      findByProjectIdAndType: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      findAllByProjectId: jest.fn(),
      findActiveByProjectIdAndType: jest.fn(),
    };

    projectRepository = {
      findByIdAndUserId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectProviderService,
        {
          provide: ProjectProviderRepository,
          useValue: projectProviderRepository,
        },
        {
          provide: ProjectRepository,
          useValue: projectRepository,
        },
      ],
    }).compile();

    service = module.get<ProjectProviderService>(ProjectProviderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('configureProvider', () => {
    const userId = 'user-id';
    const projectId = 'project-id';
    const dto = {
      type: PROVIDER_TYPE_ENUM.PAYSTACK,
      config: { apiKey: 'sk_test_123' },
      isActive: true,
    };

    it('should throw NotFoundException if project not found', async () => {
      projectRepository.findByIdAndUserId.mockResolvedValue(null);

      await expect(
        service.configureProvider(userId, projectId, dto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update existing provider if found', async () => {
      projectRepository.findByIdAndUserId.mockResolvedValue({ id: projectId });
      const existingProvider = { id: 'prov-1', ...dto };
      projectProviderRepository.findByProjectIdAndType.mockResolvedValue(
        existingProvider,
      );
      projectProviderRepository.save.mockResolvedValue(existingProvider);

      const result = await service.configureProvider(userId, projectId, dto);
      expect(result).toEqual(existingProvider);
      expect(projectProviderRepository.save).toHaveBeenCalledWith(
        existingProvider,
      );
    });

    it('should create new provider if not found', async () => {
      projectRepository.findByIdAndUserId.mockResolvedValue({ id: projectId });
      projectProviderRepository.findByProjectIdAndType.mockResolvedValue(null);
      const newProvider = { id: 'prov-2', ...dto };
      projectProviderRepository.create.mockReturnValue(newProvider);
      projectProviderRepository.save.mockResolvedValue(newProvider);

      const result = await service.configureProvider(userId, projectId, dto);
      expect(result).toEqual(newProvider);
      expect(projectProviderRepository.create).toHaveBeenCalled();
      expect(projectProviderRepository.save).toHaveBeenCalled();
    });
  });

  describe('listProvidersForProject', () => {
    const userId = 'user-id';
    const projectId = 'project-id';

    it('should throw NotFoundException if project not found', async () => {
      projectRepository.findByIdAndUserId.mockResolvedValue(null);

      await expect(
        service.listProvidersForProject(userId, projectId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return list of providers', async () => {
      projectRepository.findByIdAndUserId.mockResolvedValue({ id: projectId });
      const providers = [{ id: 'prov-1' }];
      projectProviderRepository.findAllByProjectId.mockResolvedValue(providers);

      const result = await service.listProvidersForProject(userId, projectId);
      expect(result).toBe(providers);
    });
  });

  describe('findActiveProviderForProject', () => {
    const projectId = 'project-id';
    const type = PROVIDER_TYPE_ENUM.PAYSTACK;

    it('should throw NotFoundException if no active provider found', async () => {
      projectProviderRepository.findActiveByProjectIdAndType.mockResolvedValue(
        null,
      );

      await expect(
        service.findActiveProviderForProject(projectId, type),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return provider if found', async () => {
      const provider = { id: 'prov-1' };
      projectProviderRepository.findActiveByProjectIdAndType.mockResolvedValue(
        provider,
      );

      const result = await service.findActiveProviderForProject(
        projectId,
        type,
      );
      expect(result).toBe(provider);
    });
  });

  describe('getProviderApiKeyForProject', () => {
    const projectId = 'project-id';
    const type = PROVIDER_TYPE_ENUM.PAYSTACK;

    it('should throw NotFoundException if provider not found', async () => {
      projectProviderRepository.findActiveByProjectIdAndType.mockResolvedValue(
        null,
      );

      await expect(
        service.getProviderApiKeyForProject(projectId, type),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw UnauthorizedException if API key is missing', async () => {
      const provider = { id: 'prov-1', config: {} };
      projectProviderRepository.findActiveByProjectIdAndType.mockResolvedValue(
        provider,
      );

      await expect(
        service.getProviderApiKeyForProject(projectId, type),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return API key if valid', async () => {
      const apiKey = 'sk_test_123';
      const provider = { id: 'prov-1', config: { apiKey } };
      projectProviderRepository.findActiveByProjectIdAndType.mockResolvedValue(
        provider,
      );

      const result = await service.getProviderApiKeyForProject(projectId, type);
      expect(result).toBe(apiKey);
    });
  });
});
