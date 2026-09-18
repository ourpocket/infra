import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '../auth/guards/platform-admin.guard';
import { UserStatusGuard } from '../auth/guards/user-status.guard';
import { CreateProviderCatalogDto } from './dto/create-provider-catalog.dto';
import { UpdateProviderCatalogDto } from './dto/update-provider-catalog.dto';
import { ProviderCatalogService } from './provider-catalog.service';

@ApiTags('Admin Provider Catalog')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, UserStatusGuard, PlatformAdminGuard)
@Controller({ path: 'admin/provider-catalog', version: '1' })
export class AdminProviderCatalogController {
  constructor(
    private readonly providerCatalogService: ProviderCatalogService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List every provider catalog entry for platform administrators',
  })
  listCatalog() {
    return this.providerCatalogService.listForAdmin();
  }

  @Post()
  @ApiOperation({ summary: 'Create a provider catalog entry' })
  create(@Body() dto: CreateProviderCatalogDto) {
    return this.providerCatalogService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a provider catalog entry' })
  update(@Param('id') id: string, @Body() dto: UpdateProviderCatalogDto) {
    return this.providerCatalogService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Retire a provider catalog entry' })
  retire(@Param('id') id: string) {
    return this.providerCatalogService.retire(id);
  }
}
