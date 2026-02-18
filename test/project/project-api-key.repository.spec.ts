import { Test, TestingModule } from '@nestjs/testing';
import { ProjectApiKeyRepository } from '../../src/project/project-api-key.repository';
import { DataSource } from 'typeorm';

describe('ProjectApiKeyRepository', () => {
  let repository: ProjectApiKeyRepository;
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
        ProjectApiKeyRepository,
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile();

    repository = module.get<ProjectApiKeyRepository>(ProjectApiKeyRepository);
    (repository as any).createQueryBuilder = jest
      .fn()
      .mockReturnValue(queryBuilder);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findByHashedKey', () => {
    it('should build query and return key', async () => {
      const hashedKey = 'hash';
      const key = { id: 'key-1' };
      queryBuilder.getOne.mockResolvedValue(key);

      const result = await repository.findByHashedKey(hashedKey);
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'projectApiKey.project',
        'project',
      );
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'projectApiKey.hashedKey = :hashedKey',
        { hashedKey },
      );
      expect(result).toBe(key);
    });
  });

  describe('findByProjectIdAndScope', () => {
    it('should build query and return key', async () => {
      const projectId = 'p-id';
      const scope = 'read';
      const key = { id: 'key-1' };
      queryBuilder.getOne.mockResolvedValue(key);

      const result = await repository.findByProjectIdAndScope(projectId, scope);
      expect(queryBuilder.leftJoin).toHaveBeenCalledWith(
        'projectApiKey.project',
        'project',
      );
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'project.id = :projectId',
        { projectId },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'projectApiKey.scope = :scope',
        { scope },
      );
      expect(result).toBe(key);
    });
  });

  describe('findAllByProjectId', () => {
    it('should build query and return keys', async () => {
      const projectId = 'p-id';
      const keys = [{ id: 'key-1' }];
      queryBuilder.getMany.mockResolvedValue(keys);

      const result = await repository.findAllByProjectId(projectId);
      expect(queryBuilder.leftJoin).toHaveBeenCalledWith(
        'projectApiKey.project',
        'project',
      );
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'project.id = :projectId',
        { projectId },
      );
      expect(queryBuilder.orderBy).toHaveBeenCalledWith(
        'projectApiKey.createdAt',
        'DESC',
      );
      expect(result).toBe(keys);
    });
  });

  describe('findByIdAndProjectIdAndUserId', () => {
    it('should build query and return key', async () => {
      const id = 'key-id';
      const projectId = 'p-id';
      const userId = 'u-id';
      const key = { id: 'key-1' };
      queryBuilder.getOne.mockResolvedValue(key);

      const result = await repository.findByIdAndProjectIdAndUserId(
        id,
        projectId,
        userId,
      );
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'projectApiKey.project',
        'project',
      );
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'project.platformAccount',
        'platformAccount',
      );
      expect(queryBuilder.leftJoin).toHaveBeenCalledWith(
        'platformAccount.user',
        'user',
      );
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'projectApiKey.id = :id',
        {
          id,
        },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'project.id = :projectId',
        { projectId },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('user.id = :userId', {
        userId,
      });
      expect(result).toBe(key);
    });
  });
});
