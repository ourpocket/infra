import { MigrationInterface, QueryRunner } from 'typeorm';
export class FinancialInfrastructure20260919000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(
      `ALTER TABLE project_providers ADD COLUMN environment varchar NULL CHECK (environment IN ('sandbox','production'))`,
    );
    await runner.query(
      `ALTER TABLE webhooks ADD COLUMN environment varchar NULL CHECK (environment IN ('sandbox','production'))`,
    );
    await runner.query(
      `CREATE UNIQUE INDEX financial_connection_unique ON project_providers(project_id, type, environment) WHERE environment IS NOT NULL`,
    );
    await runner.query(`CREATE TABLE financial_resources (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "projectId" uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      environment varchar NOT NULL CHECK (environment IN ('sandbox','production')), kind varchar NOT NULL CHECK (kind IN ('customer','payment','refund','wallet','transfer')),
      status varchar NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed')), amount numeric(38,0) NULL CHECK (amount > 0), currency varchar NULL, provider varchar NULL,
      "providerReference" varchar NULL, "parentId" uuid NULL REFERENCES financial_resources(id), details jsonb NOT NULL DEFAULT '{}', "requestId" uuid NOT NULL,
      "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now())`);
    await runner.query(
      `CREATE INDEX financial_resource_scope ON financial_resources("projectId",environment,kind)`,
    );
    await runner.query(`CREATE TABLE financial_idempotency (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "projectId" uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE, environment varchar NOT NULL,
      key varchar(200) NOT NULL, fingerprint varchar NOT NULL, "resourceId" uuid NOT NULL REFERENCES financial_resources(id), "createdAt" timestamp NOT NULL DEFAULT now(), UNIQUE("projectId",environment,key))`);
    await runner.query(`CREATE TABLE financial_events (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "projectId" uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE, environment varchar NOT NULL,
      type varchar NOT NULL, "resourceId" uuid NOT NULL REFERENCES financial_resources(id), "requestId" uuid NOT NULL, data jsonb NOT NULL, dispatched boolean NOT NULL DEFAULT false, "createdAt" timestamp NOT NULL DEFAULT now())`);
    await runner.query(
      `CREATE INDEX financial_event_scope ON financial_events("projectId",environment)`,
    );
    await runner.query(
      `CREATE INDEX financial_outbox_pending ON financial_events("createdAt") WHERE dispatched = false`,
    );
    await runner.query(`CREATE TABLE financial_deliveries (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "projectId" uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE, environment varchar NOT NULL,
      "eventId" uuid NOT NULL REFERENCES financial_events(id), "requestId" uuid NOT NULL, "webhookId" uuid NOT NULL REFERENCES webhooks(id), status varchar NOT NULL DEFAULT 'pending', attempts integer NOT NULL DEFAULT 0,
      history jsonb NOT NULL DEFAULT '[]', "createdAt" timestamp NOT NULL DEFAULT now())`);
    await runner.query(
      `CREATE INDEX financial_delivery_scope ON financial_deliveries("projectId",environment)`,
    );
    await runner.query(`CREATE TABLE financial_receipts (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "projectId" uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      environment varchar NOT NULL, hash varchar NOT NULL, provider varchar NOT NULL, payload jsonb NOT NULL, processed boolean NOT NULL DEFAULT false, "createdAt" timestamp NOT NULL DEFAULT now(), UNIQUE("projectId",environment,hash))`);
    await runner.query(`CREATE TABLE financial_logs (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "projectId" uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE, environment varchar NOT NULL,
      "requestId" uuid NOT NULL, operation varchar NOT NULL, source varchar NOT NULL, details jsonb NOT NULL, "createdAt" timestamp NOT NULL DEFAULT now())`);
    await runner.query(
      `CREATE INDEX financial_log_scope ON financial_logs("projectId",environment,"createdAt")`,
    );
    await runner.query(
      `UPDATE provider_catalog SET capabilities = '["payments","refunds"]'::jsonb WHERE slug IN ('paystack','flutterwave')`,
    );
    await runner.query(
      `UPDATE provider_catalog SET status = 'coming_soon' WHERE slug NOT IN ('paystack','flutterwave') AND status = 'active'`,
    );
    await runner.query(
      `UPDATE provider_catalog SET credential_fields = credential_fields || '[{"key":"webhookSecret","label":"Webhook secret hash","type":"secret","required":true}]'::jsonb WHERE slug = 'flutterwave' AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(credential_fields) field WHERE field->>'key' = 'webhookSecret')`,
    );
  }
  async down(runner: QueryRunner): Promise<void> {
    for (const table of [
      'financial_logs',
      'financial_receipts',
      'financial_deliveries',
      'financial_events',
      'financial_idempotency',
      'financial_resources',
    ])
      await runner.query(`DROP TABLE ${table}`);
    await runner.query('DROP INDEX financial_connection_unique');
    await runner.query('ALTER TABLE webhooks DROP COLUMN environment');
    await runner.query('ALTER TABLE project_providers DROP COLUMN environment');
    await runner.query(
      `UPDATE provider_catalog SET capabilities = '["wallet_operations","payment_collection"]'::jsonb WHERE slug IN ('paystack','flutterwave')`,
    );
  }
}
