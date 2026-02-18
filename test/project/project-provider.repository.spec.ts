import { Test, TestingModule } from '@nestjs/testing';
import { ProjectProviderRepository } from '../../src/project/project-provider.repository';
import { DataSource } from 'typeorm';
import { PROVIDER_TYPE_ENUM } from '../../src/enums';

describe('ProjectProviderRepository', () => {
  let repository: ProjectProviderRepository;
  let dataSource: any;
  let queryBuilder: any;

  beforeEach(async () => {
    queryBuilder = {
      leftJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      getOne: jest.fn(),
    };

    dataSource = {
      createEntityManager: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectProviderRepository,
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile();

    repository = module.get<ProjectProviderRepository>(
      ProjectProviderRepository,
    );
    (repository as any).createQueryBuilder = jest
      .fn()
      .mockReturnValue(queryBuilder);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findByProjectIdAndType', () => {
    it('should build query and return provider', async () => {
      const projectId = 'p-id';
      const type = PROVIDER_TYPE_ENUM.PAYSTACK;
      const provider = { id: 'prov-1' };
      queryBuilder.getOne.mockResolvedValue(provider);

      const result = await repository.findByProjectIdAndType(projectId, type);
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'projectProvider.project',
        'project',
      );
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'project.id = :projectId',
        { projectId },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'projectProvider.type = :type',
        { type },
      );
      expect(result).toBe(provider);
    });
  });

  describe('findAllByProjectId', () => {
    it('should build query and return providers', async () => {
      const projectId = 'p-id';
      const providers = [{ id: 'prov-1' }];
      queryBuilder.getMany.mockResolvedValue(providers);

      const result = await repository.findAllByProjectId(projectId);
      expect(queryBuilder.leftJoin).toHaveBeenCalledWith(
        'projectProvider.project',
        'project',
      );
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'project.id = :projectId',
        { projectId },
      );
      expect(queryBuilder.orderBy).toHaveBeenCalledWith(
        'projectProvider.createdAt',
        'DESC',
      );
      expect(result).toBe(providers);
    });
  });

  describe('findActiveByProjectIdAndType', () => {
    it('should build query and return active provider', async () => {
      const projectId = 'p-id';
      const type = PROVIDER_TYPE_ENUM.PAYSTACK;
      const provider = { id: 'prov-1' };
      queryBuilder.getOne.mockResolvedValue(provider);

      const result = await repository.findActiveByProjectIdAndType(
        projectId,
        type,
      );
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'projectProvider.project',
        'project',
      );
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'project.id = :projectId',
        { projectId },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'projectProvider.type = :type',
        { type },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'projectProvider.isActive = :isActive',
        { isActive: true },
      );
      expect(result).toBe(provider);
    });
  });
});
