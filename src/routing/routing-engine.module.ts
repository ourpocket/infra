import { Module } from '@nestjs/common';
import { RoutingEngineService } from './routing-engine.service';
import { LedgerModule } from '../ledger/ledger.module';
import { RetryEngineModule } from '../retry/retry-engine.module';
import { Web2ProvidersModule } from '../services/web2';

@Module({
  imports: [Web2ProvidersModule, LedgerModule, RetryEngineModule],
  providers: [RoutingEngineService],
  exports: [RoutingEngineService],
})
export class RoutingEngineModule {}
