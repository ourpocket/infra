import { Test, TestingModule } from '@nestjs/testing';
import { PlatformAccountRepository } from '../../src/platform-account/platform-account.repository';
import { DataSource } from 'typeorm';

describe('PlatformAccountRepository', () => {
  let repository: PlatformAccountRepository;
  let dataSource: any;
  let queryBuilder: any;

  beforeEach(async () => {
    queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    };

    dataSource = {
      createEntityManager: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformAccountRepository,
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile();

    repository = module.get<PlatformAccountRepository>(
      PlatformAccountRepository,
    );
    (repository as any).createQueryBuilder = jest
      .fn()
      .mockReturnValue(queryBuilder);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findByUserId', () => {
    it('should build query and return account', async () => {
      const userId = 'user-id';
      const account = { id: 'acc-id' };
      queryBuilder.getOne.mockResolvedValue(account);

      const result = await repository.findByUserId(userId);
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'platformAccount.user',
        'user',
      );
      expect(queryBuilder.where).toHaveBeenCalledWith('user.id = :userId', {
        userId,
      });
      expect(result).toBe(account);
    });
  });
});
