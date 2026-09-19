import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BetaApplication } from '../entities/beta-application.entity';
import { BetaApplicationController } from './beta-application.controller';
import { BetaApplicationService } from './beta-application.service';

@Module({
  imports: [TypeOrmModule.forFeature([BetaApplication])],
  controllers: [BetaApplicationController],
  providers: [BetaApplicationService],
})
export class BetaModule {}
