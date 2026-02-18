import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { PlatformAccount } from '../entities/platform-account.entity';

@Injectable()
export class PlatformAccountRepository extends Repository<PlatformAccount> {
  constructor(dataSource: DataSource) {
    super(PlatformAccount, dataSource.createEntityManager());
  }

  async findByUserId(userId: string): Promise<PlatformAccount | null> {
    return this.createQueryBuilder('platformAccount')
      .leftJoinAndSelect('platformAccount.user', 'user')
      .where('user.id = :userId', { userId })
      .getOne();
  }
}
