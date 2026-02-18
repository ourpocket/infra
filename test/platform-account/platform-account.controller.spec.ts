import { Test, TestingModule } from '@nestjs/testing';
import { PlatformAccountController } from '../../src/platform-account/platform-account.controller';
import { PlatformAccountService } from '../../src/platform-account/platform-account.service';
import { CreatePlatformAccountDto } from '../../src/platform-account/dto/create-platform-account.dto';

describe('PlatformAccountController', () => {
  let controller: PlatformAccountController;
  let service: any;

  beforeEach(async () => {
    service = {
      createPlatformAccount: jest.fn(),
      getPlatformAccountForUser: jest.fn(),
      listProjectsForUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlatformAccountController],
      providers: [
        {
          provide: PlatformAccountService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<PlatformAccountController>(
      PlatformAccountController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createPlatformAccount', () => {
    it('should call service.createPlatformAccount', async () => {
      const userId = 'user-id';
      const dto: CreatePlatformAccountDto = { name: 'My Company' };
      const result = { id: 'acc-id', ...dto };

      service.createPlatformAccount.mockResolvedValue(result);

      expect(await controller.createPlatformAccount(userId, dto)).toEqual(
        result,
      );
      expect(service.createPlatformAccount).toHaveBeenCalledWith(userId, dto);
    });
  });

  describe('getMyPlatformAccount', () => {
    it('should call service.getPlatformAccountForUser', async () => {
      const userId = 'user-id';
      const result = { id: 'acc-id' };

      service.getPlatformAccountForUser.mockResolvedValue(result);

      expect(await controller.getMyPlatformAccount(userId)).toEqual(result);
      expect(service.getPlatformAccountForUser).toHaveBeenCalledWith(userId);
    });
  });

  describe('listProjects', () => {
    it('should call service.listProjectsForUser', async () => {
      const userId = 'user-id';
      const result = [{ id: 'p1' }];

      service.listProjectsForUser.mockResolvedValue(result);

      expect(await controller.listProjects(userId)).toEqual(result);
      expect(service.listProjectsForUser).toHaveBeenCalledWith(userId);
    });
  });
});
