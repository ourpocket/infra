import { Test, TestingModule } from '@nestjs/testing';
import { UserRepository } from '../../src/user/user.repository';
import { DataSource } from 'typeorm';

describe('UserRepository', () => {
  let repository: UserRepository;
  let dataSource: any;

  beforeEach(async () => {
    dataSource = {
      createEntityManager: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRepository,
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile();

    repository = module.get<UserRepository>(UserRepository);
    repository.findOne = jest.fn();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const email = 'test@example.com';
      const user = { id: 'user-id', email };
      (repository.findOne as jest.Mock).mockResolvedValue(user);

      const result = await repository.findByEmail(email);
      expect(result).toBe(user);
    });
  });

  describe('findById', () => {
    it('should find user by id', async () => {
      const id = 'user-id';
      const user = { id };
      (repository.findOne as jest.Mock).mockResolvedValue(user);

      const result = await repository.findById(id);
      expect(result).toBe(user);
    });
  });
});
