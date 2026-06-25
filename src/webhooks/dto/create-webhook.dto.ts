import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEnum, IsOptional, IsUrl } from 'class-validator';
import { WEBHOOK_EVENT_ENUM } from '../../enums';

export class CreateWebhookDto {
  @ApiProperty({
    description: 'HTTPS endpoint that receives normalized OurPocket webhooks',
    example: 'https://example.com/ourpocket/webhook',
  })
  @IsUrl({ require_tld: false })
  url!: string;

  @ApiPropertyOptional({
    description: 'Webhook events to deliver. Omit to receive all events.',
    enum: WEBHOOK_EVENT_ENUM,
    isArray: true,
    example: [
      WEBHOOK_EVENT_ENUM.TRANSACTION_SUCCESS,
      WEBHOOK_EVENT_ENUM.WALLET_CREATED,
    ],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(WEBHOOK_EVENT_ENUM, { each: true })
  eventTypes?: WEBHOOK_EVENT_ENUM[];

  @ApiPropertyOptional({
    description: 'Whether this webhook endpoint is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
