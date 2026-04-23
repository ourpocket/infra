import { Module } from '@nestjs/common';
import { PaymentService, ProviderFactory } from './services/payment.service';
import { WebhookController } from './controllers/webhook.controller';
import { WebhookCallbackQueue } from './services/webhook-callback.queue';
import { WebhookCallbackService } from './services/webhook-callback.service';
import { SdkNotificationService } from './services/sdk-notification.service';

@Module({
  controllers: [WebhookController],
  providers: [
    PaymentService,
    ProviderFactory,
    WebhookCallbackQueue,
    WebhookCallbackService,
    SdkNotificationService,
  ],
  exports: [PaymentService],
})
export class PaymentModule {}
