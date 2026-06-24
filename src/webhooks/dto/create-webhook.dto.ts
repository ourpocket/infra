import { IsArray, IsBoolean, IsEnum, IsOptional, IsUrl } from 'class-validator';
import { WEBHOOK_EVENT_ENUM } from '../../enums';

export class CreateWebhookDto {
  @IsUrl({ require_tld: false })
  url!: string;

  @IsOptional()
  @IsArray()
  @IsEnum(WEBHOOK_EVENT_ENUM, { each: true })
  eventTypes?: WEBHOOK_EVENT_ENUM[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
