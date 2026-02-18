import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ProjectAccount } from '../entities/project-account.entity';

@Injectable()
export class ProjectAccountRepository extends Repository<ProjectAccount> {
  constructor(dataSource: DataSource) {
    super(ProjectAccount, dataSource.createEntityManager());
  }

  async findByIdAndProjectId(
    id: string,
    projectId: string,
  ): Promise<ProjectAccount | null> {
    return this.createQueryBuilder('projectAccount')
      .leftJoin('projectAccount.project', 'project')
      .where('projectAccount.id = :id', { id })
      .andWhere('project.id = :projectId', { projectId })
      .getOne();
  }
}
