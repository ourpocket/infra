import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Webhook } from '../entities/webhook.entity';
import { ProjectModule } from '../project/project.module';
import {
  ProjectWebhooksController,
  UnifiedWebhookController,
} from './webhooks.controller';
import { WebhookRepository } from './webhook.repository';
import { WebhooksService } from './webhooks.service';

@Module({
  imports: [TypeOrmModule.forFeature([Webhook]), ProjectModule],
  controllers: [ProjectWebhooksController, UnifiedWebhookController],
  providers: [WebhooksService, WebhookRepository],
  exports: [WebhooksService, WebhookRepository],
})
export class WebhooksModule {}
