import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Webhook } from '../entities/webhook.entity';

@Injectable()
export class WebhookRepository extends Repository<Webhook> {
  constructor(dataSource: DataSource) {
    super(Webhook, dataSource.createEntityManager());
  }

  async findAllByProjectId(projectId: string): Promise<Webhook[]> {
    return this.createQueryBuilder('webhook')
      .leftJoin('webhook.project', 'project')
      .where('project.id = :projectId', { projectId })
      .orderBy('webhook.createdAt', 'DESC')
      .getMany();
  }

  async findByIdAndProjectIdAndUserId(
    id: string,
    projectId: string,
    userId: string,
  ): Promise<Webhook | null> {
    return this.createQueryBuilder('webhook')
      .leftJoinAndSelect('webhook.project', 'project')
      .leftJoinAndSelect('project.platformAccount', 'platformAccount')
      .leftJoin('platformAccount.user', 'user')
      .where('webhook.id = :id', { id })
      .andWhere('project.id = :projectId', { projectId })
      .andWhere('user.id = :userId', { userId })
      .getOne();
  }
}
