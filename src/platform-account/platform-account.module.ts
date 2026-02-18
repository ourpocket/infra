import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformAccount } from '../entities/platform-account.entity';
import { Project } from '../entities/project.entity';
import { User } from '../entities/user.entity';
import { PlatformAccountService } from './platform-account.service';
import { PlatformAccountController } from './platform-account.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PlatformAccount, Project, User])],
  controllers: [PlatformAccountController],
  providers: [PlatformAccountService],
  exports: [PlatformAccountService],
})
export class PlatformAccountModule {}
