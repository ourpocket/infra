import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserStatusGuard } from '../auth/guards/user-status.guard';
import { ProviderCatalogService } from './provider-catalog.service';

@ApiTags('Provider Catalog')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, UserStatusGuard)
@Controller({ path: 'provider-catalog', version: '1' })
export class ProviderCatalogController {
  constructor(
    private readonly providerCatalogService: ProviderCatalogService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List provider catalog entries visible to customers',
  })
  listCatalog() {
    return this.providerCatalogService.listPublic();
  }
}
