import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserProvider } from '../entities/user-provider.entity';
import { UserProviderService } from './user-provider.service';
import { UserProviderController } from './user-provider.controller';
import { UserProviderRepository } from './user-provider.repository';

@Module({
  imports: [TypeOrmModule.forFeature([UserProvider])],
  controllers: [UserProviderController],
  providers: [UserProviderService, UserProviderRepository],
  exports: [UserProviderService, UserProviderRepository],
})
export class UserProviderModule {}
