import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiTags,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { ApiKeyService } from './api-key.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserStatusGuard } from '../auth/guards/user-status.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { STATUS_CODE } from '@/constant';

@Controller('api-key')
@ApiTags('Api Keys 🔑')
@UseGuards(JwtAuthGuard, UserStatusGuard)
@ApiBearerAuth()
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new API key',
    description:
      'Creates a new API key for the authenticated user. The raw key is only returned once.',
  })
  @ApiResponse({
    status: STATUS_CODE.SUCCESS.CREATED,
    description: 'API key created successfully',
  })
  @ApiResponse({
    status: STATUS_CODE.ERROR.CONFLICT,
    description: 'API key with this scope already exists',
  })
  async createApiKey(
    @CurrentUser('userId') userId: string,
    @Body() createApiKeyDto: CreateApiKeyDto,
  ) {
    return this.apiKeyService.createApiKey(userId, createApiKeyDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all API keys',
    description: 'Retrieves all API keys for the authenticated user',
  })
  @ApiResponse({
    status: STATUS_CODE.SUCCESS.OK,
    description: 'List of API keys retrieved successfully',
  })
  async getUserApiKeys(@CurrentUser('userId') userId: string) {
    return this.apiKeyService.getUserApiKeys(userId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get API key by ID',
    description: 'Retrieves a specific API key by its ID',
  })
  @ApiResponse({
    status: STATUS_CODE.SUCCESS.OK,
    description: 'API key retrieved successfully',
  })
  @ApiResponse({
    status: STATUS_CODE.ERROR.NOT_FOUND,
    description: 'API key not found',
  })
  async getApiKeyById(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.apiKeyService.getApiKeyById(id, userId);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Revoke an API key',
    description: 'Revokes (deletes) an API key',
  })
  @ApiResponse({
    status: STATUS_CODE.SUCCESS.OK,
    description: 'API key revoked successfully',
  })
  @ApiResponse({
    status: STATUS_CODE.ERROR.NOT_FOUND,
    description: 'API key not found',
  })
  async revokeApiKey(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    await this.apiKeyService.revokeApiKey(id, userId);
    return { message: 'API key revoked successfully' };
  }
}
