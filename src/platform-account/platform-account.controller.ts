import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserStatusGuard } from '../auth/guards/user-status.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PlatformAccountService } from './platform-account.service';
import { CreatePlatformAccountDto } from './dto/create-platform-account.dto';

@ApiTags('Platform Accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, UserStatusGuard)
@Controller({ path: 'platform-accounts', version: '1' })
export class PlatformAccountController {
  constructor(
    private readonly platformAccountService: PlatformAccountService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create a platform account for the current user',
  })
  @ApiResponse({
    status: 201,
    description: 'Platform account created successfully',
  })
  createPlatformAccount(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreatePlatformAccountDto,
  ) {
    return this.platformAccountService.createPlatformAccount(userId, dto);
  }

  @Get('me')
  @ApiOperation({
    summary: 'Get the platform account for the current user',
  })
  @ApiResponse({
    status: 200,
    description: 'Platform account retrieved successfully',
  })
  getMyPlatformAccount(@CurrentUser('userId') userId: string) {
    return this.platformAccountService.getPlatformAccountForUser(userId);
  }

  @Get('me/projects')
  @ApiOperation({
    summary: 'List projects for the current user platform account',
  })
  @ApiResponse({
    status: 200,
    description: 'Projects retrieved successfully',
  })
  listProjects(@CurrentUser('userId') userId: string) {
    return this.platformAccountService.listProjectsForUser(userId);
  }
}
