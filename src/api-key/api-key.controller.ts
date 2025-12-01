import { Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';

@Controller('api-key')
@ApiTags('Api Keys 🔑')
export class ApiKeyController {}
