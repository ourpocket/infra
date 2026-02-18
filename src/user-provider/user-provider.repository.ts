import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { UserProvider } from '../entities/user-provider.entity';
import { PROVIDER_TYPE_ENUM } from '../enums';

@Injectable()
export class UserProviderRepository extends Repository<UserProvider> {
  constructor(dataSource: DataSource) {
    super(UserProvider, dataSource.createEntityManager());
  }

  async findByUserIdAndType(
    userId: string,
    type: PROVIDER_TYPE_ENUM,
  ): Promise<UserProvider | null> {
    return this.findOne({
      where: {
        userId,
        type,
        isDeleted: false,
      },
    });
  }

  async findAllByUserId(userId: string): Promise<UserProvider[]> {
    return this.find({
      where: {
        userId,
        isDeleted: false,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findByUserIdAndId(
    userId: string,
    id: string,
  ): Promise<UserProvider | null> {
    return this.findOne({
      where: {
        id,
        userId,
        isDeleted: false,
      },
    });
  }
}
