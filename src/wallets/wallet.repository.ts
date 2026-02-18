import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Wallet } from '../entities/wallet.entity';

@Injectable()
export class WalletRepository extends Repository<Wallet> {
  constructor(dataSource: DataSource) {
    super(Wallet, dataSource.createEntityManager());
  }

  async findByIdAndProjectId(
    id: string,
    projectId: string,
  ): Promise<Wallet | null> {
    return this.createQueryBuilder('wallet')
      .leftJoinAndSelect('wallet.project', 'project')
      .leftJoinAndSelect('wallet.account', 'account')
      .where('wallet.id = :id', { id })
      .andWhere('project.id = :projectId', { projectId })
      .getOne();
  }

  async findByIdAndProjectIdWithoutRelations(
    id: string,
    projectId: string,
  ): Promise<Wallet | null> {
    return this.createQueryBuilder('wallet')
      .leftJoin('wallet.project', 'project')
      .where('wallet.id = :id', { id })
      .andWhere('project.id = :projectId', { projectId })
      .getOne();
  }
}
