import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Project } from '../entities/project.entity';

@Injectable()
export class ProjectRepository extends Repository<Project> {
  constructor(dataSource: DataSource) {
    super(Project, dataSource.createEntityManager());
  }

  async findAllByPlatformAccountId(
    platformAccountId: string,
  ): Promise<Project[]> {
    return this.createQueryBuilder('project')
      .leftJoin('project.platformAccount', 'platformAccount')
      .where('platformAccount.id = :platformAccountId', { platformAccountId })
      .orderBy('project.createdAt', 'DESC')
      .getMany();
  }

  async findBySlugAndPlatformAccountId(
    slug: string,
    platformAccountId: string,
  ): Promise<Project | null> {
    return this.createQueryBuilder('project')
      .leftJoin('project.platformAccount', 'platformAccount')
      .where('project.slug = :slug', { slug })
      .andWhere('platformAccount.id = :platformAccountId', {
        platformAccountId,
      })
      .getOne();
  }

  async findByIdAndUserId(id: string, userId: string): Promise<Project | null> {
    return this.createQueryBuilder('project')
      .leftJoinAndSelect('project.platformAccount', 'platformAccount')
      .leftJoin('platformAccount.user', 'user')
      .where('project.id = :id', { id })
      .andWhere('user.id = :userId', { userId })
      .getOne();
  }
}
