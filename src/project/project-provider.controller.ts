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
import { ProjectProviderService } from './project-provider.service';
import { ConfigureProjectProviderDto } from './dto/configure-project-provider.dto';

@ApiTags('Project Providers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, UserStatusGuard)
@Controller({ path: 'projects/:projectId/providers', version: '1' })
export class ProjectProviderController {
  constructor(
    private readonly projectProviderService: ProjectProviderService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create or update provider configuration for a project',
  })
  @ApiResponse({
    status: 201,
    description: 'Project provider configuration saved successfully',
  })
  configureProvider(
    @CurrentUser('userId') userId: string,
    @Param('projectId') projectId: string,
    @Body() dto: ConfigureProjectProviderDto,
  ) {
    return this.projectProviderService.configureProvider(
      userId,
      projectId,
      dto,
    );
  }

  @Get()
  @ApiOperation({
    summary: 'List configured providers for a project',
  })
  @ApiResponse({
    status: 200,
    description: 'Project providers retrieved successfully',
  })
  listProviders(
    @CurrentUser('userId') userId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.projectProviderService.listProvidersForProject(
      userId,
      projectId,
    );
  }
}
