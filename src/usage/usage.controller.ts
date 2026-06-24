import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserStatusGuard } from '../auth/guards/user-status.guard';
import { UsageService } from './usage.service';

@ApiTags('Usage')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, UserStatusGuard)
@Controller({ path: 'projects/:projectId/usage-metrics', version: '1' })
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  @Get()
  @ApiOperation({ summary: 'Get usage metrics for a project' })
  @ApiResponse({ status: 200, description: 'Usage metrics retrieved' })
  getProjectUsage(
    @CurrentUser('userId') userId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.usageService.getProjectUsage(userId, projectId);
  }
}
