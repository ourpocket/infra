import {
  Headers,
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
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
import { ConnectProjectProviderDto } from './dto/connect-project-provider.dto';

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
    @Headers('x-environment') environment?: string,
  ) {
    return this.projectProviderService.configureProvider(
      userId,
      projectId,
      dto,
      connectionEnvironment(environment),
    );
  }

  @Post('connect')
  @ApiOperation({
    summary: 'Connect a catalog provider to a project',
  })
  connectProvider(
    @CurrentUser('userId') userId: string,
    @Param('projectId') projectId: string,
    @Body() dto: ConnectProjectProviderDto,
    @Headers('x-environment') environment?: string,
  ) {
    return this.projectProviderService.connectProvider(
      userId,
      projectId,
      dto,
      connectionEnvironment(environment),
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
    @Headers('x-environment') environment?: string,
  ) {
    return this.projectProviderService.listProvidersForProject(
      userId,
      projectId,
      environment ? connectionEnvironment(environment) : undefined,
    );
  }
}

function connectionEnvironment(value?: string): 'sandbox' | 'production' {
  if (value === undefined || value === 'production') return 'production';
  if (value === 'sandbox') return 'sandbox';
  throw new BadRequestException('Invalid environment');
}
