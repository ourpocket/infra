import { MigrationInterface, QueryRunner } from 'typeorm';

export class FinancialControlPlane20260920000000 implements MigrationInterface {
  name = 'FinancialControlPlane20260920000000';

  public async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      CREATE TABLE financial_control_plane_catalog_backup AS
      SELECT id, description, capabilities, credential_fields, status
      FROM provider_catalog
      WHERE slug IN ('paystack','flutterwave','turnkey','privy')
    `);
    await runner.query(
      `ALTER TABLE financial_deliveries ADD COLUMN "leaseExpiresAt" timestamp NULL`,
    );
    await runner.query(
      'ALTER TABLE financial_resources DROP CONSTRAINT IF EXISTS financial_resources_status_check',
    );
    await runner.query(
      `ALTER TABLE financial_resources ADD CONSTRAINT financial_resources_status_check CHECK (status IN ('pending','unknown','completed','failed'))`,
    );
    await runner.query(`
      CREATE TABLE financial_routing_policies (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "projectId" uuid NOT NULL,
        environment varchar NOT NULL CHECK (environment IN ('sandbox','production')),
        strategy varchar NOT NULL DEFAULT 'best_success_rate',
        "providerPriority" jsonb NOT NULL DEFAULT '["paystack","flutterwave"]'::jsonb,
        "requireHealthy" boolean NOT NULL DEFAULT true,
        "safeFailover" boolean NOT NULL DEFAULT false,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT financial_routing_policy_project_fk FOREIGN KEY ("projectId") REFERENCES projects(id) ON DELETE CASCADE,
        CONSTRAINT financial_routing_policy_scope_unique UNIQUE ("projectId", environment)
      )
    `);
    await runner.query(`
      CREATE TABLE financial_provider_health (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "projectId" uuid NOT NULL,
        environment varchar NOT NULL CHECK (environment IN ('sandbox','production')),
        provider varchar NOT NULL CHECK (provider IN ('paystack','flutterwave')),
        status varchar NOT NULL DEFAULT 'healthy' CHECK (status IN ('healthy','degraded','down')),
        "successRate" numeric(5,2) NOT NULL DEFAULT 100,
        "p95LatencyMs" integer NOT NULL DEFAULT 0,
        "estimatedFeeBps" integer NOT NULL DEFAULT 0,
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT financial_provider_health_project_fk FOREIGN KEY ("projectId") REFERENCES projects(id) ON DELETE CASCADE,
        CONSTRAINT financial_provider_health_scope_unique UNIQUE ("projectId", environment, provider)
      )
    `);
    await runner.query(`
      CREATE TABLE financial_reconciliation_runs (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "projectId" uuid NOT NULL,
        environment varchar NOT NULL CHECK (environment IN ('sandbox','production')),
        status varchar NOT NULL DEFAULT 'completed' CHECK (status IN ('running','completed','failed')),
        inspected integer NOT NULL DEFAULT 0,
        resolved integer NOT NULL DEFAULT 0,
        unresolved integer NOT NULL DEFAULT 0,
        "resourceIds" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "requestId" uuid NOT NULL,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT financial_reconciliation_project_fk FOREIGN KEY ("projectId") REFERENCES projects(id) ON DELETE CASCADE
      )
    `);
    await runner.query(
      `CREATE INDEX financial_reconciliation_scope_idx ON financial_reconciliation_runs ("projectId", environment, "createdAt")`,
    );
    await runner.query(`
      UPDATE provider_catalog SET
        description='Hosted checkout, payment verification and full or partial refunds for African businesses.',
        capabilities='["payments","refunds"]'::jsonb,
        credential_fields='[{"key":"apiKey","label":"Secret key","type":"secret","required":true,"placeholder":"sk_live_..."}]'::jsonb,
        status='active'
      WHERE slug='paystack'
    `);
    await runner.query(`
      UPDATE provider_catalog SET
        description='Hosted checkout, payment verification and full or partial refunds across Africa.',
        capabilities='["payments","refunds"]'::jsonb,
        credential_fields='[{"key":"apiKey","label":"Secret key","type":"secret","required":true,"placeholder":"FLWSECK-..."},{"key":"webhookSecret","label":"Webhook secret hash","type":"secret","required":true,"placeholder":"Your Flutterwave secret hash"}]'::jsonb,
        status='active'
      WHERE slug='flutterwave'
    `);
    await runner.query(`
      INSERT INTO provider_catalog (
        slug, name, description, logo_asset, category, capabilities,
        credential_fields, adapter_type, status, sort_order
      ) VALUES
        (
          'turnkey', 'Turnkey',
          'Policy-controlled wallet infrastructure for Ethereum and Solana.',
          '/img/turnkey_logo.svg', 'wallet_infrastructure',
          '["wallet_operations","signing","policies"]'::jsonb,
          '[{"key":"organizationId","label":"Organization ID","type":"text","required":true},{"key":"apiPublicKey","label":"API public key","type":"text","required":true},{"key":"apiPrivateKey","label":"API private key","type":"secret","required":true}]'::jsonb,
          'turnkey', 'active', 10
        ),
        (
          'privy', 'Privy',
          'Embedded wallet infrastructure for Ethereum and Solana.',
          '/img/privy_logo.svg', 'wallet_infrastructure',
          '["wallet_operations","signing","policies"]'::jsonb,
          '[{"key":"appId","label":"App ID","type":"text","required":true},{"key":"appSecret","label":"App secret","type":"secret","required":true}]'::jsonb,
          'privy', 'active', 20
        )
      ON CONFLICT (slug) DO UPDATE SET
        name=EXCLUDED.name,
        description=EXCLUDED.description,
        logo_asset=EXCLUDED.logo_asset,
        category=EXCLUDED.category,
        capabilities=EXCLUDED.capabilities,
        credential_fields=EXCLUDED.credential_fields,
        adapter_type=EXCLUDED.adapter_type,
        status=EXCLUDED.status,
        sort_order=EXCLUDED.sort_order,
        "updatedAt"=now()
    `);
  }

  public async down(runner: QueryRunner): Promise<void> {
    await runner.query(
      `ALTER TABLE financial_deliveries DROP COLUMN "leaseExpiresAt"`,
    );
    await runner.query(
      `UPDATE financial_resources SET status='pending' WHERE status='unknown'`,
    );
    await runner.query(
      'ALTER TABLE financial_resources DROP CONSTRAINT IF EXISTS financial_resources_status_check',
    );
    await runner.query(
      `ALTER TABLE financial_resources ADD CONSTRAINT financial_resources_status_check CHECK (status IN ('pending','completed','failed'))`,
    );
    await runner.query(`
      UPDATE provider_catalog AS catalog SET
        description=backup.description,
        capabilities=backup.capabilities,
        credential_fields=backup.credential_fields,
        status=backup.status
      FROM financial_control_plane_catalog_backup AS backup
      WHERE catalog.id=backup.id
    `);
    await runner.query('DROP TABLE financial_control_plane_catalog_backup');
    await runner.query(
      `DELETE FROM provider_catalog WHERE slug IN ('turnkey','privy')`,
    );
    await runner.query('DROP TABLE financial_reconciliation_runs');
    await runner.query('DROP TABLE financial_provider_health');
    await runner.query('DROP TABLE financial_routing_policies');
  }
}
