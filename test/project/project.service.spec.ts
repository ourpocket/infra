import { Test, TestingModule } from '@nestjs/testing';
import { ProjectService } from '../../src/project/project.service';
import { ProjectRepository } from '../../src/project/project.repository';
import { PlatformAccountRepository } from '../../src/platform-account/platform-account.repository';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('ProjectService', () => {
  let service: ProjectService;
  let projectRepository: any;
  let platformAccountRepository: any;

  beforeEach(async () => {
    projectRepository = {
      findBySlugAndPlatformAccountId: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      findAllByPlatformAccountId: jest.fn(),
      findByIdAndUserId: jest.fn(),
    };

    platformAccountRepository = {
      findByUserId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectService,
        {
          provide: ProjectRepository,
          useValue: projectRepository,
        },
        {
          provide: PlatformAccountRepository,
          useValue: platformAccountRepository,
        },
      ],
    }).compile();

    service = module.get<ProjectService>(ProjectService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createProject', () => {
    const userId = 'user-id';
    const dto = { name: 'My Project', description: 'desc' };

    it('should throw NotFoundException if platform account not found', async () => {
      platformAccountRepository.findByUserId.mockResolvedValue(null);
      await expect(service.createProject(userId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if project with slug exists', async () => {
      platformAccountRepository.findByUserId.mockResolvedValue({
        id: 'account-id',
      });
      projectRepository.findBySlugAndPlatformAccountId.mockResolvedValue({});
      await expect(service.createProject(userId, dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should create and return project', async () => {
      platformAccountRepository.findByUserId.mockResolvedValue({
        id: 'account-id',
      });
      projectRepository.findBySlugAndPlatformAccountId.mockResolvedValue(null);
      const savedProject = { id: 'project-id', ...dto };
      projectRepository.create.mockReturnValue(savedProject);
      projectRepository.save.mockResolvedValue(savedProject);

      const result = await service.createProject(userId, dto);
      expect(result).toEqual(savedProject);
      expect(projectRepository.save).toHaveBeenCalledWith(savedProject);
    });

    it('should use provided slug if available', async () => {
      const dtoWithSlug = { ...dto, slug: 'custom-slug' };
      platformAccountRepository.findByUserId.mockResolvedValue({
        id: 'account-id',
      });
      projectRepository.findBySlugAndPlatformAccountId.mockResolvedValue(null);
      projectRepository.create.mockReturnValue(dtoWithSlug);
      projectRepository.save.mockResolvedValue(dtoWithSlug);

      await service.createProject(userId, dtoWithSlug);
      expect(projectRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'custom-slug' }),
      );
    });
  });

  describe('listProjectsForUser', () => {
    const userId = 'user-id';

    it('should throw NotFoundException if platform account not found', async () => {
      platformAccountRepository.findByUserId.mockResolvedValue(null);
      await expect(service.listProjectsForUser(userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return list of projects', async () => {
      platformAccountRepository.findByUserId.mockResolvedValue({
        id: 'account-id',
      });
      const projects = [{ id: 'p1' }];
      projectRepository.findAllByPlatformAccountId.mockResolvedValue(projects);

      const result = await service.listProjectsForUser(userId);
      expect(result).toBe(projects);
      expect(projectRepository.findAllByPlatformAccountId).toHaveBeenCalledWith(
        'account-id',
      );
    });
  });

  describe('getProjectForUser', () => {
    const userId = 'user-id';
    const projectId = 'project-id';

    it('should throw NotFoundException if project not found', async () => {
      projectRepository.findByIdAndUserId.mockResolvedValue(null);
      await expect(
        service.getProjectForUser(userId, projectId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return project if found', async () => {
      const project = { id: projectId };
      projectRepository.findByIdAndUserId.mockResolvedValue(project);

      const result = await service.getProjectForUser(userId, projectId);
      expect(result).toBe(project);
    });
  });
});
