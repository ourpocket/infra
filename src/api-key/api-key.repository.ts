import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ApiKey, ApiKeyScope } from '../entities/api-key.entity';

@Injectable()
export class ApiKeyRepository extends Repository<ApiKey> {
  constructor(dataSource: DataSource) {
    super(ApiKey, dataSource.createEntityManager());
  }

  async findByUserIdAndScope(
    userId: string,
    scope: ApiKeyScope,
  ): Promise<ApiKey | null> {
    return this.findOne({
      where: { user: { id: userId }, scope },
    });
  }

  async findAllWithUsers(): Promise<ApiKey[]> {
    return this.createQueryBuilder('apiKey')
      .leftJoinAndSelect('apiKey.user', 'user')
      .orderBy('apiKey.createdAt', 'DESC')
      .getMany();
  }

  async findByIdWithUser(id: string): Promise<ApiKey | null> {
    return this.findOne({
      where: { id },
      relations: ['user'],
    });
  }

  async findAllByUserId(userId: string): Promise<ApiKey[]> {
    return this.createQueryBuilder('apiKey')
      .innerJoinAndSelect('apiKey.user', 'user')
      .where('user.id = :userId', { userId })
      .orderBy('apiKey.createdAt', 'DESC')
      .getMany();
  }
}
