import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Removes all persisted production provider output. The platform keeps only
 * encrypted project connection credentials and their local verification state.
 */
export class StatelessProviderLayer20260921000000 implements MigrationInterface {
  name = 'StatelessProviderLayer20260921000000';

  public async up(runner: QueryRunner): Promise<void> {
    await runner.query(
      `ALTER TABLE project_providers ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false`,
    );
    await runner.query(
      `ALTER TABLE project_providers ADD COLUMN IF NOT EXISTS verified_at timestamp NULL`,
    );

    // A prior version persisted provider references, checkout URLs and customer
    // contact data. Delete production operational rows in dependency order.
    await runner.query(
      `DELETE FROM financial_deliveries WHERE environment = 'production'`,
    );
    await runner.query(
      `DELETE FROM financial_events WHERE environment = 'production'`,
    );
    await runner.query(
      `DELETE FROM financial_idempotency WHERE environment = 'production'`,
    );
    await runner.query(
      `DELETE FROM financial_receipts WHERE environment = 'production'`,
    );
    await runner.query(
      `DELETE FROM financial_logs WHERE environment = 'production'`,
    );
    await runner.query(
      `DELETE FROM financial_provider_health WHERE environment = 'production'`,
    );
    await runner.query(
      `DELETE FROM financial_reconciliation_runs WHERE environment = 'production'`,
    );
    await runner.query(
      `DELETE FROM financial_resources WHERE environment = 'production'`,
    );

    // Sandbox never needs personal contact data either.
    await runner.query(
      `UPDATE financial_resources SET details = details - 'email' - 'name' - 'checkoutUrl' - 'checkoutReference' - 'callbackUrl' WHERE kind = 'customer'`,
    );

    await runner.query(`
      UPDATE provider_catalog
      SET capabilities = CASE slug
        WHEN 'paystack' THEN '["hosted_checkout","payment_verification","refunds"]'::jsonb
        WHEN 'flutterwave' THEN '["hosted_checkout","payment_verification","refunds"]'::jsonb
        WHEN 'mono' THEN '["hosted_checkout","payment_verification"]'::jsonb
        ELSE capabilities
      END,
      credential_fields = CASE slug
        WHEN 'mono' THEN '[{"key":"secretKey","label":"Secret key","type":"secret","required":true,"placeholder":"test_sk_..."},{"key":"webhookSecret","label":"Webhook secret","type":"secret","required":true}]'::jsonb
        ELSE credential_fields
      END,
      adapter_type = CASE WHEN slug = 'mono' THEN 'mono' ELSE adapter_type END,
      status = CASE WHEN slug = 'mono' THEN 'active'::provider_catalog_status_enum ELSE status END
      WHERE slug IN ('paystack', 'flutterwave', 'mono')
    `);
  }

  public async down(runner: QueryRunner): Promise<void> {
    await runner.query(
      `ALTER TABLE project_providers DROP COLUMN IF EXISTS verified_at`,
    );
    await runner.query(
      `ALTER TABLE project_providers DROP COLUMN IF EXISTS is_verified`,
    );
  }
}
