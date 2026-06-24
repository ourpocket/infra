import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Transaction } from '../entities/transaction.entity';

@Injectable()
export class TransactionRepository extends Repository<Transaction> {
  constructor(dataSource: DataSource) {
    super(Transaction, dataSource.createEntityManager());
  }

  async findByProjectIdAndReference(
    projectId: string,
    reference: string,
  ): Promise<Transaction | null> {
    return this.createQueryBuilder('transaction')
      .leftJoin('transaction.project', 'project')
      .where('project.id = :projectId', { projectId })
      .andWhere('transaction.reference = :reference', { reference })
      .getOne();
  }

  async findByIdAndProjectId(
    id: string,
    projectId: string,
  ): Promise<Transaction | null> {
    return this.createQueryBuilder('transaction')
      .leftJoin('transaction.project', 'project')
      .where('transaction.id = :id', { id })
      .andWhere('project.id = :projectId', { projectId })
      .getOne();
  }

  async findRecentByProjectId(
    projectId: string,
    limit = 10,
  ): Promise<Transaction[]> {
    return this.createQueryBuilder('transaction')
      .leftJoin('transaction.project', 'project')
      .where('project.id = :projectId', { projectId })
      .orderBy('transaction.createdAt', 'DESC')
      .take(limit)
      .getMany();
  }

  async findAllByProjectId(projectId: string): Promise<Transaction[]> {
    return this.createQueryBuilder('transaction')
      .leftJoin('transaction.project', 'project')
      .where('project.id = :projectId', { projectId })
      .orderBy('transaction.createdAt', 'DESC')
      .getMany();
  }
}
