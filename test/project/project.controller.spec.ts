import { Test, TestingModule } from '@nestjs/testing';
import { ProjectController } from '../../src/project/project.controller';
import { ProjectService } from '../../src/project/project.service';
import { CreateProjectDto } from '../../src/project/dto/create-project.dto';

describe('ProjectController', () => {
  let controller: ProjectController;
  let projectService: any;

  beforeEach(async () => {
    projectService = {
      createProject: jest.fn(),
      listProjectsForUser: jest.fn(),
      getProjectForUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectController],
      providers: [
        {
          provide: ProjectService,
          useValue: projectService,
        },
      ],
    }).compile();

    controller = module.get<ProjectController>(ProjectController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createProject', () => {
    it('should call projectService.createProject', async () => {
      const userId = 'user-id';
      const dto: CreateProjectDto = { name: 'Project' };
      await controller.createProject(userId, dto);
      expect(projectService.createProject).toHaveBeenCalledWith(userId, dto);
    });
  });

  describe('listProjects', () => {
    it('should call projectService.listProjectsForUser', async () => {
      const userId = 'user-id';
      await controller.listProjects(userId);
      expect(projectService.listProjectsForUser).toHaveBeenCalledWith(userId);
    });
  });

  describe('getProject', () => {
    it('should call projectService.getProjectForUser', async () => {
      const userId = 'user-id';
      const id = 'project-id';
      await controller.getProject(userId, id);
      expect(projectService.getProjectForUser).toHaveBeenCalledWith(userId, id);
    });
  });
});
