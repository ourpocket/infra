import { Test, TestingModule } from '@nestjs/testing';
import { ProjectProviderService } from '../../src/project/project-provider.service';
import { ProjectProviderRepository } from '../../src/project/project-provider.repository';
import { ProjectRepository } from '../../src/project/project.repository';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PROVIDER_TYPE_ENUM } from '../../src/enums';
import { ProviderCatalogService } from '../../src/provider-catalog/provider-catalog.service';

describe('ProjectProviderService', () => {
  let service: ProjectProviderService;
  let projectProviderRepository: any;
  let projectRepository: any;
  let providerCatalogService: any;

  beforeEach(async () => {
    projectProviderRepository = {
      findByProjectIdAndType: jest.fn(),
      findByProjectIdAndProviderId: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      findAllByProjectId: jest.fn(),
      findActiveByProjectIdAndType: jest.fn(),
    };

    projectRepository = {
      findByIdAndUserId: jest.fn(),
    };

    providerCatalogService = {
      findConnectable: jest.fn(),
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
        {
          provide: ProviderCatalogService,
          useValue: providerCatalogService,
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
      expect(result).toEqual({
        ...existingProvider,
        config: {
          apiKey: 'sk_t********_123',
        },
      });
      expect(projectProviderRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            encrypted: true,
            iv: expect.any(String),
            tag: expect.any(String),
            data: expect.any(String),
          }),
        }),
      );
    });

    it('should create new provider if not found', async () => {
      projectRepository.findByIdAndUserId.mockResolvedValue({ id: projectId });
      projectProviderRepository.findByProjectIdAndType.mockResolvedValue(null);
      const newProvider = { id: 'prov-2', ...dto };
      projectProviderRepository.create.mockReturnValue(newProvider);
      projectProviderRepository.save.mockResolvedValue(newProvider);

      const result = await service.configureProvider(userId, projectId, dto);
      expect(result).toEqual({
        ...newProvider,
        config: {
          apiKey: 'sk_t********_123',
        },
      });
      expect(projectProviderRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            encrypted: true,
            iv: expect.any(String),
            tag: expect.any(String),
            data: expect.any(String),
          }),
        }),
      );
      expect(projectProviderRepository.save).toHaveBeenCalled();
    });
  });

  describe('connectProvider', () => {
    const userId = 'user-id';
    const projectId = 'project-id';
    const dto = {
      providerId: 'catalog-provider-id',
      config: { apiKey: 'sk_test_123' },
    };

    it('should create a connection for an active, supported catalog provider', async () => {
      const project = { id: projectId };
      const catalogProvider = {
        id: dto.providerId,
        adapterType: PROVIDER_TYPE_ENUM.PAYSTACK,
        credentialFields: [
          {
            key: 'apiKey',
            label: 'Secret key',
            type: 'secret',
            required: true,
          },
        ],
      };
      const createdProvider = {
        id: 'project-provider-id',
        project,
        provider: catalogProvider,
        providerCatalogId: dto.providerId,
        type: PROVIDER_TYPE_ENUM.PAYSTACK,
        config: dto.config,
        isActive: true,
      };

      projectRepository.findByIdAndUserId.mockResolvedValue(project);
      providerCatalogService.findConnectable.mockResolvedValue(catalogProvider);
      projectProviderRepository.findByProjectIdAndProviderId.mockResolvedValue(
        null,
      );
      projectProviderRepository.create.mockReturnValue(createdProvider);
      projectProviderRepository.save.mockResolvedValue(createdProvider);

      const result = await service.connectProvider(userId, projectId, dto);

      expect(projectProviderRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          providerCatalogId: dto.providerId,
          type: PROVIDER_TYPE_ENUM.PAYSTACK,
          config: expect.objectContaining({ encrypted: true }),
        }),
      );
      expect(result).toEqual({
        ...createdProvider,
        config: { apiKey: 'sk_t********_123' },
      });
    });

    it('should reject a connection with a missing required credential', async () => {
      projectRepository.findByIdAndUserId.mockResolvedValue({ id: projectId });
      providerCatalogService.findConnectable.mockResolvedValue({
        id: dto.providerId,
        adapterType: PROVIDER_TYPE_ENUM.PAYSTACK,
        credentialFields: [
          {
            key: 'apiKey',
            label: 'Secret key',
            type: 'secret',
            required: true,
          },
        ],
      });

      await expect(
        service.connectProvider(userId, projectId, {
          providerId: dto.providerId,
          config: {},
        }),
      ).rejects.toThrow(UnauthorizedException);
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
      expect(result).toEqual([{ id: 'prov-1', config: {} }]);
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
