import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserStatusGuard } from '../auth/guards/user-status.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserProviderService } from './user-provider.service';
import { CreateUserProviderDto } from './dto/create-user-provider.dto';
import { UpdateUserProviderDto } from './dto/update-user-provider.dto';
import { UserProviderResponseDto } from './dto/user-provider-response.dto';

@ApiTags('User Providers 👤')
@Controller('user-providers')
@UseGuards(JwtAuthGuard, UserStatusGuard)
@ApiBearerAuth()
export class UserProviderController {
  constructor(private readonly userProviderService: UserProviderService) {}

  @Post()
  @ApiOperation({ summary: 'Add a new provider for the user' })
  @ApiResponse({ status: 201, description: 'Provider added successfully' })
  @ApiResponse({
    status: 409,
    description: 'Provider of this type already exists',
  })
  async createProvider(
    @CurrentUser('userId') userId: string,
    @Body() createUserProviderDto: CreateUserProviderDto,
  ): Promise<{ message: string; data: UserProviderResponseDto }> {
    const provider = await this.userProviderService.create(
      userId,
      createUserProviderDto,
    );
    return {
      message: 'Provider added successfully',
      data: provider,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all user providers' })
  @ApiResponse({ status: 200, description: 'Providers retrieved successfully' })
  async getAllProviders(
    @CurrentUser('userId') userId: string,
  ): Promise<{ message: string; data: UserProviderResponseDto[] }> {
    const providers = await this.userProviderService.findAll(userId);
    return {
      message: 'Providers retrieved successfully',
      data: providers,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific provider by ID' })
  @ApiResponse({ status: 200, description: 'Provider retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  async getProvider(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ): Promise<{ message: string; data: UserProviderResponseDto }> {
    const provider = await this.userProviderService.findOne(userId, id);
    return {
      message: 'Provider retrieved successfully',
      data: provider,
    };
  }

  @Get('type/:type')
  @ApiOperation({ summary: 'Get a provider by type' })
  @ApiResponse({ status: 200, description: 'Provider retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  async getProviderByType(
    @CurrentUser('userId') userId: string,
    @Param('type') type: string,
  ): Promise<{ message: string; data: UserProviderResponseDto }> {
    const provider = await this.userProviderService.findByType(
      userId,
      type as any,
    );
    return {
      message: 'Provider retrieved successfully',
      data: provider,
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a provider' })
  @ApiResponse({ status: 200, description: 'Provider updated successfully' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  async updateProvider(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() updateUserProviderDto: UpdateUserProviderDto,
  ): Promise<{ message: string; data: UserProviderResponseDto }> {
    const provider = await this.userProviderService.update(
      userId,
      id,
      updateUserProviderDto,
    );
    return {
      message: 'Provider updated successfully',
      data: provider,
    };
  }

  @Put(':id/toggle')
  @ApiOperation({ summary: 'Toggle provider active status' })
  @ApiResponse({
    status: 200,
    description: 'Provider status toggled successfully',
  })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  async toggleProvider(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ): Promise<{ message: string; data: UserProviderResponseDto }> {
    const provider = await this.userProviderService.toggleActive(userId, id);
    return {
      message: 'Provider status toggled successfully',
      data: provider,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a provider' })
  @ApiResponse({ status: 200, description: 'Provider deleted successfully' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  async deleteProvider(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    await this.userProviderService.remove(userId, id);
    return {
      message: 'Provider deleted successfully',
    };
  }
}
