import { IsBoolean, IsEnum, IsObject, IsOptional } from 'class-validator';
import { PROVIDER_TYPE_ENUM } from '../../enums';

export class ConfigureProjectProviderDto {
  @IsEnum(PROVIDER_TYPE_ENUM)
  type!: PROVIDER_TYPE_ENUM;

  @IsObject()
  config!: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
