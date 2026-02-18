import { Test, TestingModule } from '@nestjs/testing';
import { UserProviderController } from '../../src/user-provider/user-provider.controller';
import { UserProviderService } from '../../src/user-provider/user-provider.service';
import { JwtAuthGuard } from '../../src/auth/guards/jwt-auth.guard';
import { UserStatusGuard } from '../../src/auth/guards/user-status.guard';

describe('UserProviderController', () => {
  let controller: UserProviderController;
  let service: any;

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      findByType: jest.fn(),
      update: jest.fn(),
      toggleActive: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserProviderController],
      providers: [
        {
          provide: UserProviderService,
          useValue: service,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(UserStatusGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UserProviderController>(UserProviderController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createProvider', () => {
    it('should create provider', async () => {
      const dto: any = {};
      const result = { id: 'p1' };
      service.create.mockResolvedValue(result);
      expect(await controller.createProvider('user-1', dto)).toEqual({
        message: 'Provider added successfully',
        data: result,
      });
      expect(service.create).toHaveBeenCalledWith('user-1', dto);
    });
  });

  describe('getAllProviders', () => {
    it('should return all providers', async () => {
      const result = [{ id: 'p1' }];
      service.findAll.mockResolvedValue(result);
      expect(await controller.getAllProviders('user-1')).toEqual({
        message: 'Providers retrieved successfully',
        data: result,
      });
      expect(service.findAll).toHaveBeenCalledWith('user-1');
    });
  });

  describe('getProvider', () => {
    it('should return provider', async () => {
      const result = { id: 'p1' };
      service.findOne.mockResolvedValue(result);
      expect(await controller.getProvider('user-1', 'p1')).toEqual({
        message: 'Provider retrieved successfully',
        data: result,
      });
      expect(service.findOne).toHaveBeenCalledWith('user-1', 'p1');
    });
  });

  describe('getProviderByType', () => {
    it('should return provider by type', async () => {
      const result = { id: 'p1' };
      service.findByType.mockResolvedValue(result);
      expect(await controller.getProviderByType('user-1', 'type')).toEqual({
        message: 'Provider retrieved successfully',
        data: result,
      });
      expect(service.findByType).toHaveBeenCalledWith('user-1', 'type');
    });
  });

  describe('updateProvider', () => {
    it('should update provider', async () => {
      const dto: any = {};
      const result = { id: 'p1' };
      service.update.mockResolvedValue(result);
      expect(await controller.updateProvider('user-1', 'p1', dto)).toEqual({
        message: 'Provider updated successfully',
        data: result,
      });
      expect(service.update).toHaveBeenCalledWith('user-1', 'p1', dto);
    });
  });

  describe('toggleProvider', () => {
    it('should toggle provider', async () => {
      const result = { id: 'p1', isActive: false };
      service.toggleActive.mockResolvedValue(result);
      expect(await controller.toggleProvider('user-1', 'p1')).toEqual({
        message: 'Provider status toggled successfully',
        data: result,
      });
      expect(service.toggleActive).toHaveBeenCalledWith('user-1', 'p1');
    });
  });

  describe('deleteProvider', () => {
    it('should delete provider', async () => {
      expect(await controller.deleteProvider('user-1', 'p1')).toEqual({
        message: 'Provider deleted successfully',
      });
      expect(service.remove).toHaveBeenCalledWith('user-1', 'p1');
    });
  });
});
