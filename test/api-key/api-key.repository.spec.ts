import { Test, TestingModule } from '@nestjs/testing';
import { ApiKeyRepository } from '../../src/api-key/api-key.repository';
import { DataSource } from 'typeorm';
import { ApiKeyScope } from '../../src/entities/api-key.entity';

describe('ApiKeyRepository', () => {
  let repository: ApiKeyRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyRepository,
        {
          provide: DataSource,
          useValue: {
            createEntityManager: jest.fn(),
          },
        },
      ],
    }).compile();

    repository = module.get<ApiKeyRepository>(ApiKeyRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findByUserIdAndScope', () => {
    it('should call findOne with userId and scope', async () => {
      const userId = 'u1';
      const scope = 'read' as ApiKeyScope;
      const key: any = { id: 'k1' };

      const spy = jest.spyOn(repository, 'findOne').mockResolvedValue(key);

      const result = await repository.findByUserIdAndScope(userId, scope);
      expect(spy).toHaveBeenCalledWith({
        where: { user: { id: userId }, scope },
      });
      expect(result).toBe(key);
    });
  });

  describe('findAllWithUsers', () => {
    it('should build query to join users and return list', async () => {
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([{ id: 'k1' }]),
      } as any;

      (repository as any).createQueryBuilder = jest
        .fn()
        .mockReturnValue(queryBuilder);

      const result = await repository.findAllWithUsers();
      expect((repository as any).createQueryBuilder).toHaveBeenCalledWith(
        'apiKey',
      );
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'apiKey.user',
        'user',
      );
      expect(queryBuilder.orderBy).toHaveBeenCalledWith(
        'apiKey.createdAt',
        'DESC',
      );
      expect(result).toEqual([{ id: 'k1' }]);
    });
  });

  describe('findByIdWithUser', () => {
    it('should call findOne with relations', async () => {
      const id = 'k1';
      const key: any = { id };
      const spy = jest.spyOn(repository, 'findOne').mockResolvedValue(key);

      const result = await repository.findByIdWithUser(id);
      expect(spy).toHaveBeenCalledWith({
        where: { id },
        relations: ['user'],
      });
      expect(result).toBe(key);
    });
  });

  describe('findAllByUserId', () => {
    it('should build query to filter by user id', async () => {
      const userId = 'u1';
      const keys = [{ id: 'k1' }];
      const queryBuilder = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(keys),
      } as any;

      (repository as any).createQueryBuilder = jest
        .fn()
        .mockReturnValue(queryBuilder);

      const result = await repository.findAllByUserId(userId);
      expect((repository as any).createQueryBuilder).toHaveBeenCalledWith(
        'apiKey',
      );
      expect(queryBuilder.innerJoinAndSelect).toHaveBeenCalledWith(
        'apiKey.user',
        'user',
      );
      expect(queryBuilder.where).toHaveBeenCalledWith('user.id = :userId', {
        userId,
      });
      expect(queryBuilder.orderBy).toHaveBeenCalledWith(
        'apiKey.createdAt',
        'DESC',
      );
      expect(result).toEqual(keys);
    });
  });
});
