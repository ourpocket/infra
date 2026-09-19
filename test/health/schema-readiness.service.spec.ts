import { SchemaReadinessService } from '../../src/health/schema-readiness.service';

describe('SchemaReadinessService', () => {
  const originalEnvironment = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnvironment;
  });

  it('rejects an API start when compiled migrations are pending in production', async () => {
    process.env.NODE_ENV = 'production';
    const service = new SchemaReadinessService({
      showMigrations: jest.fn().mockResolvedValue(true),
    } as never);
    await expect(service.onModuleInit()).rejects.toThrow('behind this release');
  });

  it('marks a current schema ready', async () => {
    process.env.NODE_ENV = 'production';
    const service = new SchemaReadinessService({
      showMigrations: jest.fn().mockResolvedValue(false),
    } as never);
    await service.onModuleInit();
    expect(service.isReady()).toBe(true);
  });
});
