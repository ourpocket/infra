import { Module } from '@nestjs/common';
import { FlutterwaveService } from './flutterwave/flutterwave.service';
import { PaystackService } from './paystack/paystack.service';

@Module({
  providers: [PaystackService, FlutterwaveService],
  exports: [PaystackService, FlutterwaveService],
})
export class Web2ProvidersModule {}
