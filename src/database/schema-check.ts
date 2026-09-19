import { AppDataSource } from '../data-source';

export async function assertCurrentSchema(): Promise<void> {
  await AppDataSource.initialize();
  try {
    if (await AppDataSource.showMigrations())
      throw new Error('Database schema has pending migrations');
  } finally {
    await AppDataSource.destroy();
  }
}

if (require.main === module) {
  void assertCurrentSchema().catch((error: unknown) => {
    console.error('Schema check failed:', error);
    process.exitCode = 1;
  });
}
