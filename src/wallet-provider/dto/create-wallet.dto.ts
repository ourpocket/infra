export class CreateWalletDto {
  provider!: 'paystack' | 'flutterwave' | 'paga' | 'fingra';
  apiKey!: string;
  payload!: Record<string, any>;
}
