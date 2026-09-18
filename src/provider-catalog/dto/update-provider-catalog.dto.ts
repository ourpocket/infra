import { PartialType } from '@nestjs/swagger';
import { CreateProviderCatalogDto } from './create-provider-catalog.dto';

export class UpdateProviderCatalogDto extends PartialType(
  CreateProviderCatalogDto,
) {}
