import { Test, TestingModule } from '@nestjs/testing';
import { UserProviderRepository } from '../../src/user-provider/user-provider.repository';
import { DataSource } from 'typeorm';
import { PROVIDER_TYPE_ENUM } from '../../src/enums';

describe('UserProviderRepository', () => {
  let repository: UserProviderRepository;
  let dataSource: any;
  let mockRepo: any;

  beforeEach(async () => {
    mockRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
    };
    dataSource = {
      createEntityManager: jest.fn().mockReturnValue({
        getRepository: jest.fn().mockReturnValue(mockRepo),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserProviderRepository,
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile();

    repository = module.get<UserProviderRepository>(UserProviderRepository);
    // Mock methods directly on the instance since it extends Repository
    repository.findOne = mockRepo.findOne;
    repository.find = mockRepo.find;
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findByUserIdAndType', () => {
    it('should find by user id and type', async () => {
      const userId = 'u1';
      const type = PROVIDER_TYPE_ENUM.PAYSTACK;
      const entity = { id: 'p1' };
      mockRepo.findOne.mockResolvedValue(entity);

      const result = await repository.findByUserIdAndType(userId, type);
      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { userId, type, isDeleted: false },
      });
      expect(result).toBe(entity);
    });
  });

  describe('findAllByUserId', () => {
    it('should find all by user id', async () => {
      const userId = 'u1';
      const entities = [{ id: 'p1' }];
      mockRepo.find.mockResolvedValue(entities);

      const result = await repository.findAllByUserId(userId);
      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { userId, isDeleted: false },
        order: { createdAt: 'DESC' },
      });
      expect(result).toBe(entities);
    });
  });

  describe('findByUserIdAndId', () => {
    it('should find by user id and id', async () => {
      const userId = 'u1';
      const id = 'p1';
      const entity = { id: 'p1' };
      mockRepo.findOne.mockResolvedValue(entity);

      const result = await repository.findByUserIdAndId(userId, id);
      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { id, userId, isDeleted: false },
      });
      expect(result).toBe(entity);
    });
  });
});
