import { AppDataSource } from '../data-source';

const MIGRATION_LOCK = 'ourpocket:database:migrations';

export async function runProductionMigrations(): Promise<void> {
  await AppDataSource.initialize();
  const runner = AppDataSource.createQueryRunner();
  await runner.connect();
  try {
    await runner.query('SELECT pg_advisory_lock(hashtextextended($1, 0))', [
      MIGRATION_LOCK,
    ]);
    await AppDataSource.runMigrations({ transaction: 'each' });
    if (await AppDataSource.showMigrations())
      throw new Error('Database schema still has pending migrations');
  } finally {
    try {
      await runner.query('SELECT pg_advisory_unlock(hashtextextended($1, 0))', [
        MIGRATION_LOCK,
      ]);
    } finally {
      await runner.release();
      await AppDataSource.destroy();
    }
  }
}

if (require.main === module) {
  void runProductionMigrations().catch((error: unknown) => {
    console.error('Migration job failed:', error);
    process.exitCode = 1;
  });
}
