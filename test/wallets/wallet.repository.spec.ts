import { Test, TestingModule } from '@nestjs/testing';
import { WalletRepository } from '../../src/wallets/wallet.repository';
import { DataSource } from 'typeorm';

describe('WalletRepository', () => {
  let repository: WalletRepository;
  let dataSource: any;
  let queryBuilder: any;
  let leftJoinAndSelect: jest.Mock;
  let leftJoin: jest.Mock;

  beforeEach(async () => {
    leftJoinAndSelect = jest.fn().mockReturnThis();
    leftJoin = jest.fn().mockReturnThis();
    queryBuilder = {
      leftJoinAndSelect,
      leftJoin,
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    };

    dataSource = {
      createEntityManager: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletRepository,
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile();

    repository = module.get<WalletRepository>(WalletRepository);
    (repository as any).createQueryBuilder = jest
      .fn()
      .mockReturnValue(queryBuilder);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findByIdAndProjectId', () => {
    it('should build query and return wallet', async () => {
      const id = 'w1';
      const projectId = 'p1';
      const wallet = { id };
      queryBuilder.getOne.mockResolvedValue(wallet);

      const result = await repository.findByIdAndProjectId(id, projectId);

      expect(leftJoinAndSelect).toHaveBeenCalledWith(
        'wallet.project',
        'project',
      );
      expect(leftJoinAndSelect).toHaveBeenCalledWith(
        'wallet.account',
        'account',
      );
      expect(queryBuilder.where).toHaveBeenCalledWith('wallet.id = :id', {
        id,
      });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'project.id = :projectId',
        { projectId },
      );
      expect(result).toBe(wallet);
    });
  });

  describe('findByIdAndProjectIdWithoutRelations', () => {
    it('should build query and return wallet', async () => {
      const id = 'w1';
      const projectId = 'p1';
      const wallet = { id };
      queryBuilder.getOne.mockResolvedValue(wallet);

      const result = await repository.findByIdAndProjectIdWithoutRelations(
        id,
        projectId,
      );

      expect(leftJoin).toHaveBeenCalledWith('wallet.project', 'project');
      expect(queryBuilder.where).toHaveBeenCalledWith('wallet.id = :id', {
        id,
      });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'project.id = :projectId',
        { projectId },
      );
      expect(result).toBe(wallet);
    });
  });
});
