import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserProvider } from '../entities/user-provider.entity';
import { UserProviderService } from './user-provider.service';
import { UserProviderController } from './user-provider.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UserProvider])],
  controllers: [UserProviderController],
  providers: [UserProviderService],
  exports: [UserProviderService],
})
export class UserProviderModule {}
