import {
  Body,
  Controller,
  Delete,
  Param,
  Post,
  Get,
  UseGuards,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserStatusGuard } from '../auth/guards/user-status.guard';
import { ProjectApiKey } from '../entities/project-api-key.entity';
import { CurrentProjectApiKey } from '../project/decorators/current-project-api-key.decorator';
import { ProjectApiKeyGuard } from '../project/guards/project-api-key.guard';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { ProviderWebhookDto } from './dto/provider-webhook.dto';
import { WebhooksService } from './webhooks.service';

@ApiTags('Project Webhooks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, UserStatusGuard)
@Controller({ path: 'projects/:projectId/webhooks', version: '1' })
export class ProjectWebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a webhook endpoint for a project' })
  @ApiResponse({ status: 201, description: 'Webhook endpoint created' })
  createWebhook(
    @CurrentUser('userId') userId: string,
    @Param('projectId') projectId: string,
    @Body() dto: CreateWebhookDto,
  ) {
    return this.webhooksService.createWebhook(userId, projectId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List webhook endpoints for a project' })
  @ApiResponse({ status: 200, description: 'Webhook endpoints retrieved' })
  listWebhooks(
    @CurrentUser('userId') userId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.webhooksService.listWebhooks(userId, projectId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a webhook endpoint' })
  @ApiResponse({ status: 200, description: 'Webhook endpoint deleted' })
  deleteWebhook(
    @CurrentUser('userId') userId: string,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ) {
    return this.webhooksService.deleteWebhook(userId, projectId, id);
  }
}

@ApiTags('Unified Webhooks')
@ApiBearerAuth()
@UseGuards(ProjectApiKeyGuard)
@Controller({ path: 'ourpocket/webhook', version: VERSION_NEUTRAL })
export class UnifiedWebhookController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post()
  @ApiOperation({ summary: 'Receive and normalize a provider webhook' })
  @ApiResponse({ status: 201, description: 'Webhook normalized' })
  receiveWebhook(
    @CurrentProjectApiKey() projectApiKey: ProjectApiKey,
    @Body() dto: ProviderWebhookDto,
  ) {
    return this.webhooksService.normalizeProviderWebhook(projectApiKey, dto);
  }
}
