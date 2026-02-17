import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserStatusGuard } from '../auth/guards/user-status.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto/create-project.dto';

@ApiTags('Projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, UserStatusGuard)
@Controller({ path: 'projects', version: '1' })
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new project for the current platform account',
  })
  @ApiResponse({
    status: 201,
    description: 'Project created successfully',
  })
  createProject(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateProjectDto,
  ) {
    return this.projectService.createProject(userId, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List projects for the current platform account',
  })
  @ApiResponse({
    status: 200,
    description: 'Projects retrieved successfully',
  })
  listProjects(@CurrentUser('userId') userId: string) {
    return this.projectService.listProjectsForUser(userId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get project by id for the current platform account',
  })
  @ApiResponse({
    status: 200,
    description: 'Project retrieved successfully',
  })
  getProject(@CurrentUser('userId') userId: string, @Param('id') id: string) {
    return this.projectService.getProjectForUser(userId, id);
  }
}
