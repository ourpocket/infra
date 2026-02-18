import { Test, TestingModule } from '@nestjs/testing';
import { UserProviderService } from '../../src/user-provider/user-provider.service';
import { UserProviderRepository } from '../../src/user-provider/user-provider.repository';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PROVIDER_TYPE_ENUM } from '../../src/enums';

describe('UserProviderService', () => {
  let service: UserProviderService;
  let repository: any;

  beforeEach(async () => {
    repository = {
      findByUserIdAndType: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      findAllByUserId: jest.fn(),
      findByUserIdAndId: jest.fn(),
      update: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserProviderService,
        {
          provide: UserProviderRepository,
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get<UserProviderService>(UserProviderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const userId = 'user-1';
    const dto: any = { type: PROVIDER_TYPE_ENUM.PAYSTACK, config: {} };

    it('should create provider successfully', async () => {
      repository.findByUserIdAndType.mockResolvedValue(null);
      const createdEntity = { id: 'p1', userId, ...dto };
      repository.create.mockReturnValue(createdEntity);
      repository.save.mockResolvedValue(createdEntity);

      const result = await service.create(userId, dto);
      expect(repository.findByUserIdAndType).toHaveBeenCalledWith(
        userId,
        dto.type,
      );
      expect(repository.create).toHaveBeenCalledWith({ userId, ...dto });
      expect(repository.save).toHaveBeenCalledWith(createdEntity);
      expect(result.id).toBe('p1');
    });

    it('should throw ConflictException if provider exists', async () => {
      repository.findByUserIdAndType.mockResolvedValue({ id: 'p1' });
      await expect(service.create(userId, dto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findAll', () => {
    it('should return all providers', async () => {
      const providers = [{ id: 'p1' }];
      repository.findAllByUserId.mockResolvedValue(providers);
      const result = await service.findAll('user-1');
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should return provider', async () => {
      const provider = { id: 'p1' };
      repository.findByUserIdAndId.mockResolvedValue(provider);
      const result = await service.findOne('user-1', 'p1');
      expect(result.id).toBe('p1');
    });

    it('should throw NotFoundException if not found', async () => {
      repository.findByUserIdAndId.mockResolvedValue(null);
      await expect(service.findOne('user-1', 'p1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByType', () => {
    it('should return provider by type', async () => {
      const provider = { id: 'p1' };
      repository.findByUserIdAndType.mockResolvedValue(provider);
      const result = await service.findByType(
        'user-1',
        PROVIDER_TYPE_ENUM.PAYSTACK,
      );
      expect(result.id).toBe('p1');
    });

    it('should throw NotFoundException if not found', async () => {
      repository.findByUserIdAndType.mockResolvedValue(null);
      await expect(
        service.findByType('user-1', PROVIDER_TYPE_ENUM.PAYSTACK),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const userId = 'user-1';
    const id = 'p1';
    const dto: any = { config: { new: 'config' } };

    it('should update provider', async () => {
      repository.findByUserIdAndId.mockResolvedValue({ id });
      repository.findOne.mockResolvedValue({
        id,
        config: { new: 'config' },
        isActive: true,
        type: PROVIDER_TYPE_ENUM.PAYSTACK,
        name: 'Provider',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.update(userId, id, dto);
      expect(repository.update).toHaveBeenCalledWith(id, dto);
      expect(result.config).toEqual({ new: 'co***ig' });
    });

    it('should throw NotFoundException if not found', async () => {
      repository.findByUserIdAndId.mockResolvedValue(null);
      await expect(service.update(userId, id, dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should soft delete provider', async () => {
      repository.findByUserIdAndId.mockResolvedValue({ id: 'p1' });
      await service.remove('user-1', 'p1');
      expect(repository.update).toHaveBeenCalledWith('p1', { isDeleted: true });
    });

    it('should throw NotFoundException if not found', async () => {
      repository.findByUserIdAndId.mockResolvedValue(null);
      await expect(service.remove('user-1', 'p1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('toggleActive', () => {
    it('should toggle active status', async () => {
      const provider = { id: 'p1', isActive: true };
      repository.findByUserIdAndId.mockResolvedValue(provider);
      repository.findOne.mockResolvedValue({ ...provider, isActive: false });

      const result = await service.toggleActive('user-1', 'p1');
      expect(repository.update).toHaveBeenCalledWith('p1', { isActive: false });
      expect(result.isActive).toBe(false);
    });

    it('should throw NotFoundException if not found', async () => {
      repository.findByUserIdAndId.mockResolvedValue(null);
      await expect(service.toggleActive('user-1', 'p1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
