import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ProjectApiKey } from '../entities/project-api-key.entity';

@Injectable()
export class ProjectApiKeyRepository extends Repository<ProjectApiKey> {
  constructor(dataSource: DataSource) {
    super(ProjectApiKey, dataSource.createEntityManager());
  }

  async findByHashedKey(hashedKey: string): Promise<ProjectApiKey | null> {
    return this.createQueryBuilder('projectApiKey')
      .leftJoinAndSelect('projectApiKey.project', 'project')
      .where('projectApiKey.hashedKey = :hashedKey', { hashedKey })
      .getOne();
  }

  async findByProjectIdAndScope(
    projectId: string,
    scope: string,
  ): Promise<ProjectApiKey | null> {
    return this.createQueryBuilder('projectApiKey')
      .leftJoin('projectApiKey.project', 'project')
      .where('project.id = :projectId', { projectId })
      .andWhere('projectApiKey.scope = :scope', { scope })
      .getOne();
  }

  async findAllByProjectId(projectId: string): Promise<ProjectApiKey[]> {
    return this.createQueryBuilder('projectApiKey')
      .leftJoin('projectApiKey.project', 'project')
      .where('project.id = :projectId', { projectId })
      .orderBy('projectApiKey.createdAt', 'DESC')
      .getMany();
  }

  async findByIdAndProjectIdAndUserId(
    id: string,
    projectId: string,
    userId: string,
  ): Promise<ProjectApiKey | null> {
    return this.createQueryBuilder('projectApiKey')
      .leftJoinAndSelect('projectApiKey.project', 'project')
      .leftJoinAndSelect('project.platformAccount', 'platformAccount')
      .leftJoin('platformAccount.user', 'user')
      .where('projectApiKey.id = :id', { id })
      .andWhere('project.id = :projectId', { projectId })
      .andWhere('user.id = :userId', { userId })
      .getOne();
  }
}
