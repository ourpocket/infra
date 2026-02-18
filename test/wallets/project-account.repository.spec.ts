import { Test, TestingModule } from '@nestjs/testing';
import { ProjectAccountRepository } from '../../src/wallets/project-account.repository';
import { DataSource } from 'typeorm';

describe('ProjectAccountRepository', () => {
  let repository: ProjectAccountRepository;
  let dataSource: any;
  let queryBuilder: any;

  beforeEach(async () => {
    queryBuilder = {
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    };

    dataSource = {
      createEntityManager: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectAccountRepository,
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile();

    repository = module.get<ProjectAccountRepository>(ProjectAccountRepository);
    (repository as any).createQueryBuilder = jest
      .fn()
      .mockReturnValue(queryBuilder);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findByIdAndProjectId', () => {
    it('should build query and return account', async () => {
      const id = 'acc1';
      const projectId = 'p1';
      const account = { id };
      queryBuilder.getOne.mockResolvedValue(account);

      const result = await repository.findByIdAndProjectId(id, projectId);

      expect(queryBuilder.leftJoin).toHaveBeenCalledWith(
        'projectAccount.project',
        'project',
      );
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'projectAccount.id = :id',
        {
          id,
        },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'project.id = :projectId',
        { projectId },
      );
      expect(result).toBe(account);
    });
  });
});
