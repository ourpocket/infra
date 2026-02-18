import { Test, TestingModule } from '@nestjs/testing';
import { PlatformAccountService } from '../../src/platform-account/platform-account.service';
import { PlatformAccountRepository } from '../../src/platform-account/platform-account.repository';
import { ProjectRepository } from '../../src/project/project.repository';
import { UserRepository } from '../../src/user/user.repository';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('PlatformAccountService', () => {
  let service: PlatformAccountService;
  let platformAccountRepository: any;
  let projectRepository: any;
  let userRepository: any;

  beforeEach(async () => {
    platformAccountRepository = {
      findByUserId: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    projectRepository = {
      findAllByPlatformAccountId: jest.fn(),
    };
    userRepository = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformAccountService,
        {
          provide: PlatformAccountRepository,
          useValue: platformAccountRepository,
        },
        {
          provide: ProjectRepository,
          useValue: projectRepository,
        },
        {
          provide: UserRepository,
          useValue: userRepository,
        },
      ],
    }).compile();

    service = module.get<PlatformAccountService>(PlatformAccountService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPlatformAccount', () => {
    const userId = 'user-id';
    const dto = { name: 'My Company' };

    it('should throw ConflictException if account already exists', async () => {
      platformAccountRepository.findByUserId.mockResolvedValue({
        id: 'acc-id',
      });

      await expect(service.createPlatformAccount(userId, dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      platformAccountRepository.findByUserId.mockResolvedValue(null);
      userRepository.findById.mockResolvedValue(null);

      await expect(service.createPlatformAccount(userId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should create and return platform account', async () => {
      platformAccountRepository.findByUserId.mockResolvedValue(null);
      userRepository.findById.mockResolvedValue({ id: userId });

      const newAccount = { id: 'acc-id', ...dto };
      platformAccountRepository.create.mockReturnValue(newAccount);
      platformAccountRepository.save.mockResolvedValue(newAccount);

      const result = await service.createPlatformAccount(userId, dto);
      expect(result).toEqual(newAccount);
      expect(platformAccountRepository.create).toHaveBeenCalled();
      expect(platformAccountRepository.save).toHaveBeenCalledWith(newAccount);
    });
  });

  describe('getPlatformAccountForUser', () => {
    const userId = 'user-id';

    it('should throw NotFoundException if account not found', async () => {
      platformAccountRepository.findByUserId.mockResolvedValue(null);

      await expect(service.getPlatformAccountForUser(userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return account if found', async () => {
      const account = { id: 'acc-id' };
      platformAccountRepository.findByUserId.mockResolvedValue(account);

      const result = await service.getPlatformAccountForUser(userId);
      expect(result).toBe(account);
    });
  });

  describe('listProjectsForUser', () => {
    const userId = 'user-id';

    it('should throw NotFoundException if account not found', async () => {
      platformAccountRepository.findByUserId.mockResolvedValue(null);

      await expect(service.listProjectsForUser(userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return list of projects', async () => {
      const account = { id: 'acc-id' };
      const projects = [{ id: 'p1' }];
      platformAccountRepository.findByUserId.mockResolvedValue(account);
      projectRepository.findAllByPlatformAccountId.mockResolvedValue(projects);

      const result = await service.listProjectsForUser(userId);
      expect(result).toBe(projects);
      expect(projectRepository.findAllByPlatformAccountId).toHaveBeenCalledWith(
        account.id,
      );
    });
  });
});
