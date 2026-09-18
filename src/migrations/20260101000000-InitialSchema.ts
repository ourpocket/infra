import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema20260101000000 implements MigrationInterface {
  name = 'InitialSchema20260101000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."api_keys_scope_enum" AS ENUM('test', 'prod')`,
    );
    await queryRunner.query(
      `CREATE TABLE "api_keys" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "scope" "public"."api_keys_scope_enum" NOT NULL, "description" character varying, "quota" integer NOT NULL DEFAULT '1000', "used" integer NOT NULL DEFAULT '0', "expiresAt" TIMESTAMP, "hashedKey" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid, CONSTRAINT "UQ_db9ea541e25ea78ad964fcae59c" UNIQUE ("userId", "scope"), CONSTRAINT "PK_5c8a79801b44bd27b79228e1dad" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(120) NOT NULL, "email" character varying(320) NOT NULL, "photoUrl" character varying(255), "companyName" character varying(120), "provider" character varying(20) NOT NULL DEFAULT 'local', "passwordHash" character varying(255), "status" character varying(20) DEFAULT 'active', "role" character varying(30), "passwordResetToken" character varying(255), "passwordResetExpires" TIMESTAMP, "emailVerificationToken" character varying(255), "emailVerificationExpires" TIMESTAMP, "isEmailVerified" boolean NOT NULL DEFAULT false, "acceptTerms" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "isDeleted" boolean NOT NULL DEFAULT false, "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "ux_users_email" ON "users" ("email") `,
    );
    await queryRunner.query(
      `CREATE TABLE "platform_accounts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "companyName" character varying(255), "metadata" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "user_id" uuid, CONSTRAINT "REL_db75a842a1a76a604041bdd440" UNIQUE ("user_id"), CONSTRAINT "PK_3ee99dfeb0ac9a79b966cc296f9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "ux_platform_accounts_user_id" ON "platform_accounts" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."project_api_keys_scope_enum" AS ENUM('test', 'live')`,
    );
    await queryRunner.query(
      `CREATE TABLE "project_api_keys" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "scope" "public"."project_api_keys_scope_enum" NOT NULL, "description" character varying, "quota" integer NOT NULL DEFAULT '1000', "used" integer NOT NULL DEFAULT '0', "expiresAt" TIMESTAMP, "hashedKey" character varying NOT NULL, "encryptedKey" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "project_id" uuid, CONSTRAINT "UQ_72db674003260c3a569a4576d12" UNIQUE ("project_id", "scope"), CONSTRAINT "PK_6b718d83bcf591e6a9ae5ab7fec" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "project_providers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" character varying(20) NOT NULL, "config" jsonb, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "project_id" uuid, CONSTRAINT "PK_2fb0d82bc2694a436a2c78af332" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "transfers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "amount" numeric NOT NULL, "currency" character varying(10) NOT NULL, "status" character varying(20) NOT NULL, "metadata" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "project_id" uuid, "from_wallet_id" uuid, "to_wallet_id" uuid, CONSTRAINT "PK_f712e908b465e0085b4408cabc3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "wallets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "currency" character varying(10) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "project_id" uuid, "project_account_id" uuid, CONSTRAINT "PK_8402e5df5a30a229380e83e4f7e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "ux_wallets_project_account_currency" ON "wallets" ("project_id", "project_account_id", "currency") `,
    );
    await queryRunner.query(
      `CREATE TABLE "payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "externalReference" character varying(50), "providerReference" character varying(50), "provider" character varying(20) NOT NULL, "amount" numeric NOT NULL, "currency" character varying(10) NOT NULL, "status" character varying(20) NOT NULL, "metadata" jsonb, "providerPayload" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "project_id" uuid, "project_account_id" uuid, "wallet_id" uuid, CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "ux_payments_project_external_reference" ON "payments" ("project_id", "externalReference") `,
    );
    await queryRunner.query(
      `CREATE TABLE "project_accounts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "externalId" character varying(255) NOT NULL, "metadata" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "project_id" uuid, CONSTRAINT "PK_b0f5c6d1b04a4258a2a2cdb0040" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "ux_project_accounts_external_id_project_id" ON "project_accounts" ("externalId", "project_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" character varying(20) NOT NULL, "status" character varying(20) NOT NULL, "provider" character varying(20), "amount" numeric NOT NULL, "currency" character varying(10) NOT NULL, "reference" character varying(120) NOT NULL, "providerReference" character varying(120), "walletId" uuid, "fromWalletId" uuid, "toWalletId" uuid, "metadata" jsonb, "providerPayload" jsonb, "response" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "project_id" uuid, CONSTRAINT "PK_a219afd8dd77ed80f5a862f1db9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "ux_transactions_project_reference" ON "transactions" ("project_id", "reference") `,
    );
    await queryRunner.query(
      `CREATE TABLE "projects" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(120) NOT NULL, "slug" character varying(120) NOT NULL, "description" text, "metadata" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "platform_account_id" uuid, CONSTRAINT "PK_6271df0a7aed1d6c0691ce6ac50" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "ux_projects_slug_platform_account_id" ON "projects" ("slug", "platform_account_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "webhooks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "url" character varying(255) NOT NULL, "secret" character varying(255) NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "eventTypes" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "project_id" uuid, CONSTRAINT "PK_9e8795cfc899ab7bdaa831e8527" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "user_providers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "type" character varying(20) NOT NULL, "config" jsonb, "name" character varying(255), "isActive" boolean NOT NULL DEFAULT true, "isDeleted" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_7c253db00c7cac2a44f1f5a5c58" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_user_providers_user_id" ON "user_providers" ("user_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "api_keys" ADD CONSTRAINT "FK_6c2e267ae764a9413b863a29342" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "platform_accounts" ADD CONSTRAINT "FK_db75a842a1a76a604041bdd4406" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_api_keys" ADD CONSTRAINT "FK_2b9133a420211553f6b882c6c9b" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_providers" ADD CONSTRAINT "FK_60186ea93bd2239eba0e83e60d2" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "transfers" ADD CONSTRAINT "FK_fc2701ec117b3be7833dd385de0" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "transfers" ADD CONSTRAINT "FK_f6caf20d8fa02090ef9a643925d" FOREIGN KEY ("from_wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "transfers" ADD CONSTRAINT "FK_1a07635b8213a2a49f4933ba7af" FOREIGN KEY ("to_wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallets" ADD CONSTRAINT "FK_163e9fa638240e244f169874ebf" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallets" ADD CONSTRAINT "FK_df955c73f6d2c8c95c0b69bf033" FOREIGN KEY ("project_account_id") REFERENCES "project_accounts"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD CONSTRAINT "FK_7679cab4a6968de68c2a1a8faf2" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD CONSTRAINT "FK_e321a4c41bfa469b465d0ad40a7" FOREIGN KEY ("project_account_id") REFERENCES "project_accounts"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD CONSTRAINT "FK_1bdffa25425538e630d8eb8a8bc" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_accounts" ADD CONSTRAINT "FK_9c829a48dc869de75c2754d54f0" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" ADD CONSTRAINT "FK_9a04e1feb675f37ea6a344f809e" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ADD CONSTRAINT "FK_940239cffd34d7355de464ef833" FOREIGN KEY ("platform_account_id") REFERENCES "platform_accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "webhooks" ADD CONSTRAINT "FK_8b545b4c86913152b9da6e04b08" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_providers" ADD CONSTRAINT "FK_66144f0536826f644ce18baac3a" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_providers" DROP CONSTRAINT "FK_66144f0536826f644ce18baac3a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "webhooks" DROP CONSTRAINT "FK_8b545b4c86913152b9da6e04b08"`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" DROP CONSTRAINT "FK_940239cffd34d7355de464ef833"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" DROP CONSTRAINT "FK_9a04e1feb675f37ea6a344f809e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_accounts" DROP CONSTRAINT "FK_9c829a48dc869de75c2754d54f0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP CONSTRAINT "FK_1bdffa25425538e630d8eb8a8bc"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP CONSTRAINT "FK_e321a4c41bfa469b465d0ad40a7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP CONSTRAINT "FK_7679cab4a6968de68c2a1a8faf2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallets" DROP CONSTRAINT "FK_df955c73f6d2c8c95c0b69bf033"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallets" DROP CONSTRAINT "FK_163e9fa638240e244f169874ebf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transfers" DROP CONSTRAINT "FK_1a07635b8213a2a49f4933ba7af"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transfers" DROP CONSTRAINT "FK_f6caf20d8fa02090ef9a643925d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transfers" DROP CONSTRAINT "FK_fc2701ec117b3be7833dd385de0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_providers" DROP CONSTRAINT "FK_60186ea93bd2239eba0e83e60d2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_api_keys" DROP CONSTRAINT "FK_2b9133a420211553f6b882c6c9b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "platform_accounts" DROP CONSTRAINT "FK_db75a842a1a76a604041bdd4406"`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_keys" DROP CONSTRAINT "FK_6c2e267ae764a9413b863a29342"`,
    );
    await queryRunner.query(`DROP INDEX "public"."ix_user_providers_user_id"`);
    await queryRunner.query(`DROP TABLE "user_providers"`);
    await queryRunner.query(`DROP TABLE "webhooks"`);
    await queryRunner.query(
      `DROP INDEX "public"."ux_projects_slug_platform_account_id"`,
    );
    await queryRunner.query(`DROP TABLE "projects"`);
    await queryRunner.query(
      `DROP INDEX "public"."ux_transactions_project_reference"`,
    );
    await queryRunner.query(`DROP TABLE "transactions"`);
    await queryRunner.query(
      `DROP INDEX "public"."ux_project_accounts_external_id_project_id"`,
    );
    await queryRunner.query(`DROP TABLE "project_accounts"`);
    await queryRunner.query(
      `DROP INDEX "public"."ux_payments_project_external_reference"`,
    );
    await queryRunner.query(`DROP TABLE "payments"`);
    await queryRunner.query(
      `DROP INDEX "public"."ux_wallets_project_account_currency"`,
    );
    await queryRunner.query(`DROP TABLE "wallets"`);
    await queryRunner.query(`DROP TABLE "transfers"`);
    await queryRunner.query(`DROP TABLE "project_providers"`);
    await queryRunner.query(`DROP TABLE "project_api_keys"`);
    await queryRunner.query(`DROP TYPE "public"."project_api_keys_scope_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."ux_platform_accounts_user_id"`,
    );
    await queryRunner.query(`DROP TABLE "platform_accounts"`);
    await queryRunner.query(`DROP INDEX "public"."ux_users_email"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TABLE "api_keys"`);
    await queryRunner.query(`DROP TYPE "public"."api_keys_scope_enum"`);
  }
}
