import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKey } from '../entities/api-key.entity';
import { User } from '../entities/user.entity';
import { ApiKeyController } from './api-key.controller';
import { ApiKeyRepository } from './api-key.repository';
import { ApiKeyService } from './api-key.service';

@Module({
  imports: [TypeOrmModule.forFeature([ApiKey, User])],
  controllers: [ApiKeyController],
  providers: [ApiKeyService, ApiKeyRepository],
  exports: [ApiKeyService],
})
export class ApiKeyModule {}
