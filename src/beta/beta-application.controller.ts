import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { CreateBetaApplicationDto } from './beta-application.dto';
import { BetaApplicationService } from './beta-application.service';

@ApiTags('Beta')
@Controller({ path: 'beta-applications', version: '1' })
export class BetaApplicationController {
  constructor(private readonly applications: BetaApplicationService) {}

  @Post()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @ApiOperation({ summary: 'Request access to the OurPocket beta' })
  @ResponseMessage('Beta application received')
  apply(@Body() dto: CreateBetaApplicationDto) {
    return this.applications.apply(dto);
  }
}
