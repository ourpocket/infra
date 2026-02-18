import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformAccount } from '../entities/platform-account.entity';
import { PlatformAccountService } from './platform-account.service';
import { PlatformAccountController } from './platform-account.controller';
import { PlatformAccountRepository } from './platform-account.repository';
import { ProjectModule } from '../project/project.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PlatformAccount]),
    forwardRef(() => ProjectModule),
    UserModule,
  ],
  controllers: [PlatformAccountController],
  providers: [PlatformAccountService, PlatformAccountRepository],
  exports: [PlatformAccountService, PlatformAccountRepository],
})
export class PlatformAccountModule {}
