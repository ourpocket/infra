import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PROVIDER_CATALOG_STATUS_ENUM, PROVIDER_TYPE_ENUM } from '../enums';
import { ProviderCatalog } from '../entities/provider-catalog.entity';
import { RoutingEngineService } from '../routing/routing-engine.service';
import { CreateProviderCatalogDto } from './dto/create-provider-catalog.dto';
import { UpdateProviderCatalogDto } from './dto/update-provider-catalog.dto';
import { ProviderCatalogRepository } from './provider-catalog.repository';

@Injectable()
export class ProviderCatalogService {
  constructor(
    private readonly providerCatalogRepository: ProviderCatalogRepository,
    private readonly routingEngineService: RoutingEngineService,
  ) {}

  listPublic(): Promise<ProviderCatalog[]> {
    return this.providerCatalogRepository.findPublicCatalog();
  }

  listForAdmin(): Promise<ProviderCatalog[]> {
    return this.providerCatalogRepository.find({
      order: { category: 'ASC', sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async create(dto: CreateProviderCatalogDto): Promise<ProviderCatalog> {
    const existing = await this.providerCatalogRepository.findOne({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new ConflictException('A provider with this slug already exists');
    }

    this.assertActiveProviderHasAdapter(dto.status, dto.adapterType);

    return this.providerCatalogRepository.save(
      this.providerCatalogRepository.create(dto),
    );
  }

  async update(
    id: string,
    dto: UpdateProviderCatalogDto,
  ): Promise<ProviderCatalog> {
    const provider = await this.findById(id);
    const nextStatus = dto.status ?? provider.status;
    const nextAdapterType =
      dto.adapterType ?? provider.adapterType ?? undefined;

    this.assertActiveProviderHasAdapter(nextStatus, nextAdapterType);

    if (dto.slug && dto.slug !== provider.slug) {
      const existing = await this.providerCatalogRepository.findOne({
        where: { slug: dto.slug },
      });

      if (existing) {
        throw new ConflictException('A provider with this slug already exists');
      }
    }

    Object.assign(provider, dto);
    return this.providerCatalogRepository.save(provider);
  }

  async retire(id: string): Promise<ProviderCatalog> {
    const provider = await this.findById(id);
    provider.status = PROVIDER_CATALOG_STATUS_ENUM.RETIRED;
    return this.providerCatalogRepository.save(provider);
  }

  async findConnectable(
    id: string,
  ): Promise<ProviderCatalog & { adapterType: PROVIDER_TYPE_ENUM }> {
    const provider = await this.findById(id);

    if (provider.status !== PROVIDER_CATALOG_STATUS_ENUM.ACTIVE) {
      throw new BadRequestException(
        'This provider is not available for new project connections',
      );
    }

    this.assertAdapterIsAvailable(provider.adapterType);
    return {
      ...provider,
      adapterType: provider.adapterType,
    };
  }

  private async findById(id: string): Promise<ProviderCatalog> {
    const provider = await this.providerCatalogRepository.findOne({
      where: { id },
    });

    if (!provider) {
      throw new NotFoundException('Provider catalog entry not found');
    }

    return provider;
  }

  private assertActiveProviderHasAdapter(
    status: PROVIDER_CATALOG_STATUS_ENUM,
    adapterType?: PROVIDER_TYPE_ENUM | null,
  ): void {
    if (status !== PROVIDER_CATALOG_STATUS_ENUM.ACTIVE) {
      return;
    }

    this.assertAdapterIsAvailable(adapterType);
  }

  private assertAdapterIsAvailable(
    adapterType?: PROVIDER_TYPE_ENUM | null,
  ): asserts adapterType is PROVIDER_TYPE_ENUM {
    if (
      !adapterType ||
      !this.routingEngineService.listSupportedProviders().includes(adapterType)
    ) {
      throw new BadRequestException(
        'An active provider must use a registered routing adapter',
      );
    }
  }
}
