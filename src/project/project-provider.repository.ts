import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ProjectProvider } from '../entities/project-provider.entity';
import { PROVIDER_TYPE_ENUM } from '../enums';

@Injectable()
export class ProjectProviderRepository extends Repository<ProjectProvider> {
  constructor(dataSource: DataSource) {
    super(ProjectProvider, dataSource.createEntityManager());
  }

  async findByProjectIdAndType(
    projectId: string,
    type: PROVIDER_TYPE_ENUM,
  ): Promise<ProjectProvider | null> {
    return this.createQueryBuilder('projectProvider')
      .leftJoinAndSelect('projectProvider.project', 'project')
      .where('project.id = :projectId', { projectId })
      .andWhere('projectProvider.type = :type', { type })
      .getOne();
  }

  async findAllByProjectId(projectId: string): Promise<ProjectProvider[]> {
    return this.createQueryBuilder('projectProvider')
      .leftJoin('projectProvider.project', 'project')
      .where('project.id = :projectId', { projectId })
      .orderBy('projectProvider.createdAt', 'DESC')
      .getMany();
  }

  async findActiveByProjectIdAndType(
    projectId: string,
    type: PROVIDER_TYPE_ENUM,
  ): Promise<ProjectProvider | null> {
    return this.createQueryBuilder('projectProvider')
      .leftJoinAndSelect('projectProvider.project', 'project')
      .where('project.id = :projectId', { projectId })
      .andWhere('projectProvider.type = :type', { type })
      .andWhere('projectProvider.isActive = :isActive', { isActive: true })
      .getOne();
  }
}
