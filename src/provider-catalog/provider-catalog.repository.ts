import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ProviderCatalog } from '../entities/provider-catalog.entity';

@Injectable()
export class ProviderCatalogRepository extends Repository<ProviderCatalog> {
  constructor(dataSource: DataSource) {
    super(ProviderCatalog, dataSource.createEntityManager());
  }

  findPublicCatalog(): Promise<ProviderCatalog[]> {
    return this.createQueryBuilder('provider')
      .where('provider.status IN (:...statuses)', {
        statuses: ['active', 'coming_soon', 'maintenance'],
      })
      .orderBy('provider.category', 'ASC')
      .addOrderBy('provider.sortOrder', 'ASC')
      .addOrderBy('provider.name', 'ASC')
      .getMany();
  }
}
