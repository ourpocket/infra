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
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('api-key')
@ApiTags('Api Keys 🔑')
@UseGuards(JwtAuthGuard)
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
    status: 201,
    description: 'API key created successfully',
  })
  @ApiResponse({
    status: 409,
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
    status: 200,
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
    status: 200,
    description: 'API key retrieved successfully',
  })
  @ApiResponse({
    status: 404,
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
    status: 200,
    description: 'API key revoked successfully',
  })
  @ApiResponse({
    status: 404,
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
