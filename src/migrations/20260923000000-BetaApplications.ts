import { MigrationInterface, QueryRunner } from 'typeorm';

export class BetaApplications20260923000000 implements MigrationInterface {
  name = 'BetaApplications20260923000000';

  public async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      CREATE TABLE beta_applications (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        email varchar(254) NOT NULL,
        company_name varchar(160) NULL,
        use_case varchar(80) NOT NULL,
        status varchar(32) NOT NULL DEFAULT 'received',
        created_at timestamp NOT NULL DEFAULT now()
      )
    `);
    await runner.query(
      'CREATE UNIQUE INDEX ux_beta_applications_email ON beta_applications (email)',
    );
  }

  public async down(runner: QueryRunner): Promise<void> {
    await runner.query('DROP TABLE IF EXISTS beta_applications');
  }
}
