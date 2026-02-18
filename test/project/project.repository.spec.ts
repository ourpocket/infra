import { Test, TestingModule } from '@nestjs/testing';
import { ProjectRepository } from '../../src/project/project.repository';
import { DataSource } from 'typeorm';

describe('ProjectRepository', () => {
  let repository: ProjectRepository;
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
        ProjectRepository,
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile();

    repository = module.get<ProjectRepository>(ProjectRepository);
    (repository as any).createQueryBuilder = jest
      .fn()
      .mockReturnValue(queryBuilder);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findAllByPlatformAccountId', () => {
    it('should build query and return projects', async () => {
      const platformAccountId = 'acc-id';
      const projects = [{ id: 'p1' }];
      queryBuilder.getMany.mockResolvedValue(projects);

      const result =
        await repository.findAllByPlatformAccountId(platformAccountId);
      expect(queryBuilder.leftJoin).toHaveBeenCalledWith(
        'project.platformAccount',
        'platformAccount',
      );
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'platformAccount.id = :platformAccountId',
        { platformAccountId },
      );
      expect(queryBuilder.orderBy).toHaveBeenCalledWith(
        'project.createdAt',
        'DESC',
      );
      expect(result).toBe(projects);
    });
  });

  describe('findBySlugAndPlatformAccountId', () => {
    it('should build query and return project', async () => {
      const slug = 'slug';
      const platformAccountId = 'acc-id';
      const project = { id: 'p1' };
      queryBuilder.getOne.mockResolvedValue(project);

      const result = await repository.findBySlugAndPlatformAccountId(
        slug,
        platformAccountId,
      );
      expect(queryBuilder.leftJoin).toHaveBeenCalledWith(
        'project.platformAccount',
        'platformAccount',
      );
      expect(queryBuilder.where).toHaveBeenCalledWith('project.slug = :slug', {
        slug,
      });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'platformAccount.id = :platformAccountId',
        { platformAccountId },
      );
      expect(result).toBe(project);
    });
  });

  describe('findByIdAndUserId', () => {
    it('should build query and return project', async () => {
      const id = 'p-id';
      const userId = 'u-id';
      const project = { id: 'p1' };
      queryBuilder.getOne.mockResolvedValue(project);

      const result = await repository.findByIdAndUserId(id, userId);
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'project.platformAccount',
        'platformAccount',
      );
      expect(queryBuilder.leftJoin).toHaveBeenCalledWith(
        'platformAccount.user',
        'user',
      );
      expect(queryBuilder.where).toHaveBeenCalledWith('project.id = :id', {
        id,
      });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('user.id = :userId', {
        userId,
      });
      expect(result).toBe(project);
    });
  });
});
