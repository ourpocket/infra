import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
  IsEnum,
} from 'class-validator';
import { PROVIDER_TYPE_ENUM } from '../../enums';

export class CreateUserProviderDto {
  @IsEnum(PROVIDER_TYPE_ENUM)
  type!: PROVIDER_TYPE_ENUM;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsObject()
  @IsNotEmpty()
  config!: Record<string, any>;

  @IsOptional()
  isActive?: boolean = true;
}
