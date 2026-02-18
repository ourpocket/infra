import { PartialType } from '@nestjs/swagger';
import { CreateUserProviderDto } from './create-user-provider.dto';

export class UpdateUserProviderDto extends PartialType(CreateUserProviderDto) {}
