import {
  Body,
  Controller,
  Delete,
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
import { ProjectApiKeyService } from './project-api-key.service';
import { CreateProjectApiKeyDto } from './dto/create-project-api-key.dto';

@ApiTags('Project API Keys')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, UserStatusGuard)
@Controller({ path: 'projects/:projectId/api-keys', version: '1' })
export class ProjectApiKeyController {
  constructor(private readonly projectApiKeyService: ProjectApiKeyService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new API key for a project',
  })
  @ApiResponse({
    status: 201,
    description: 'Project API key created successfully',
  })
  createProjectApiKey(
    @CurrentUser('userId') userId: string,
    @Param('projectId') projectId: string,
    @Body() dto: CreateProjectApiKeyDto,
  ) {
    return this.projectApiKeyService.createProjectApiKey(
      userId,
      projectId,
      dto,
    );
  }

  @Get()
  @ApiOperation({
    summary: 'List API keys for a project',
  })
  @ApiResponse({
    status: 200,
    description: 'Project API keys retrieved successfully',
  })
  listProjectApiKeys(
    @CurrentUser('userId') userId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.projectApiKeyService.getProjectApiKeys(userId, projectId);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Revoke a project API key',
  })
  @ApiResponse({
    status: 204,
    description: 'Project API key revoked successfully',
  })
  async revokeProjectApiKey(
    @CurrentUser('userId') userId: string,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ) {
    await this.projectApiKeyService.revokeProjectApiKey(userId, projectId, id);
  }
}
