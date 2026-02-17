export class AddWalletProviderDto {
  type!: 'paystack' | 'flutterwave' | 'paga' | 'fingra';
  config!: { apiKey: string; [key: string]: any };
}
