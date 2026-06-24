import { Module } from '@nestjs/common';
import { RetryEngineService } from './retry-engine.service';

@Module({
  providers: [RetryEngineService],
  exports: [RetryEngineService],
})
export class RetryEngineModule {}
