import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { SchemaReadinessService } from './schema-readiness.service';

@Module({
  controllers: [HealthController],
  providers: [SchemaReadinessService],
})
export class HealthModule {}
