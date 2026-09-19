import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SchemaReadinessService } from './schema-readiness.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly schema: SchemaReadinessService) {}

  @Get('live')
  live() {
    return { status: 'live' };
  }

  @Get('ready')
  ready() {
    if (!this.schema.isReady())
      throw new ServiceUnavailableException('Application is not ready');
    return { status: 'ready' };
  }
}
