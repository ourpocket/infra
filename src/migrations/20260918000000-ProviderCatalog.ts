import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProviderCatalog20260918000000 implements MigrationInterface {
  name = 'ProviderCatalog20260918000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        CREATE TYPE "provider_catalog_status_enum" AS ENUM (
          'draft',
          'coming_soon',
          'active',
          'maintenance',
          'retired'
        );
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "provider_catalog" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "slug" character varying(80) NOT NULL,
        "name" character varying(120) NOT NULL,
        "description" text NOT NULL,
        "logo_asset" character varying(120) NOT NULL,
        "category" character varying(40) NOT NULL,
        "capabilities" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "credential_fields" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "adapter_type" character varying(20),
        "status" "provider_catalog_status_enum" NOT NULL DEFAULT 'coming_soon',
        "sort_order" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_provider_catalog" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_provider_catalog_slug" UNIQUE ("slug")
      )
    `);

    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isPlatformAdmin" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_providers" ADD COLUMN IF NOT EXISTS "provider_catalog_id" uuid`,
    );
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE contype = 'f'
            AND conrelid = 'project_providers'::regclass
            AND confrelid = 'provider_catalog'::regclass
        ) THEN
          ALTER TABLE "project_providers"
          ADD CONSTRAINT "FK_project_providers_provider_catalog"
          FOREIGN KEY ("provider_catalog_id") REFERENCES "provider_catalog"("id")
          ON DELETE RESTRICT ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "ix_project_providers_provider_catalog_id" ON "project_providers" ("provider_catalog_id")`,
    );

    await queryRunner.query(`
      INSERT INTO "provider_catalog" (
        "slug", "name", "description", "logo_asset", "category", "capabilities",
        "credential_fields", "adapter_type", "status", "sort_order"
      ) VALUES
        (
          'paystack', 'Paystack',
          'Payments and wallet infrastructure for African businesses.',
          '/img/paystack_logo.svg', 'africa',
          '["wallet_operations", "payment_collection"]'::jsonb,
          '[{"key":"apiKey","label":"Secret key","type":"secret","required":true,"placeholder":"sk_test_..."}]'::jsonb,
          'paystack', 'active', 10
        ),
        (
          'flutterwave', 'Flutterwave',
          'Pan-African payment infrastructure for collections and wallet operations.',
          '/img/flutterwave_logo.svg', 'africa',
          '["wallet_operations", "payment_collection"]'::jsonb,
          '[{"key":"apiKey","label":"Secret key","type":"secret","required":true,"placeholder":"FLWSECK_TEST-..."}]'::jsonb,
          'flutterwave', 'active', 20
        ),
        (
          'paga', 'Paga',
          'Nigerian payment and wallet rail planned for a future adapter release.',
          '/img/paga_logo.svg', 'africa',
          '["wallet_operations", "payment_collection"]'::jsonb,
          '[{"key":"apiKey","label":"API key","type":"secret","required":true}]'::jsonb,
          NULL, 'coming_soon', 30
        ),
        (
          'stripe', 'Stripe',
          'Global payments platform planned for a future adapter release.',
          '/img/provider-placeholder.svg', 'global',
          '["payment_collection"]'::jsonb,
          '[{"key":"apiKey","label":"Restricted API key","type":"secret","required":true}]'::jsonb,
          NULL, 'coming_soon', 10
        ),
        (
          'polar', 'Polar',
          'Global merchant-of-record and billing integration planned for a future adapter release.',
          '/img/provider-placeholder.svg', 'global',
          '["payment_collection"]'::jsonb,
          '[{"key":"accessToken","label":"Access token","type":"secret","required":true}]'::jsonb,
          NULL, 'coming_soon', 20
        ),
        (
          'mono', 'Mono',
          'Account data and verification integration planned for a future adapter release.',
          '/img/provider-placeholder.svg', 'data_verification',
          '["bank_data", "identity_verification"]'::jsonb,
          '[{"key":"secretKey","label":"Secret key","type":"secret","required":true}]'::jsonb,
          NULL, 'coming_soon', 10
        )
      ON CONFLICT ("slug") DO NOTHING;
    `);

    await queryRunner.query(`
      UPDATE "project_providers" AS project_provider
      SET "provider_catalog_id" = provider.id
      FROM "provider_catalog" AS provider
      WHERE provider."adapter_type" = project_provider."type"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "project_providers" DROP CONSTRAINT "FK_project_providers_provider_catalog"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."ix_project_providers_provider_catalog_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_providers" DROP COLUMN "provider_catalog_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "isPlatformAdmin"`,
    );
    await queryRunner.query(`DROP TABLE "provider_catalog"`);
    await queryRunner.query(`DROP TYPE "provider_catalog_status_enum"`);
  }
}
