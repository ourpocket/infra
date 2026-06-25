import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEncryptedProjectApiKeys20260625010000 implements MigrationInterface {
  name = 'AddEncryptedProjectApiKeys20260625010000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "project_api_keys" ADD "encryptedKey" text',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "project_api_keys" DROP COLUMN "encryptedKey"',
    );
  }
}
