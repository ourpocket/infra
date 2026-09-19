import { MigrationInterface, QueryRunner } from 'typeorm';

/** Adds catalog metadata only. Provider responses remain transient. */
export class ProviderOperationCapabilities20260922000000 implements MigrationInterface {
  name = 'ProviderOperationCapabilities20260922000000';

  public async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      UPDATE provider_catalog
      SET capabilities = CASE slug
        WHEN 'paystack' THEN '["hosted_checkout","payment_verification","refunds","account_resolution","payout_recipients","payouts","virtual_accounts","provider_activity"]'::jsonb
        WHEN 'flutterwave' THEN '["hosted_checkout","payment_verification","refunds","account_resolution","payout_recipients","payouts","virtual_accounts","provider_activity"]'::jsonb
        ELSE capabilities
      END
      WHERE slug IN ('paystack', 'flutterwave')
    `);
  }

  public async down(runner: QueryRunner): Promise<void> {
    await runner.query(`
      UPDATE provider_catalog
      SET capabilities = CASE slug
        WHEN 'paystack' THEN '["hosted_checkout","payment_verification","refunds"]'::jsonb
        WHEN 'flutterwave' THEN '["hosted_checkout","payment_verification","refunds"]'::jsonb
        ELSE capabilities
      END
      WHERE slug IN ('paystack', 'flutterwave')
    `);
  }
}
