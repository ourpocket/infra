import databaseConfig from '../../src/configs/database.config';

describe('DatabaseConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should return default postgres options', () => {
    delete process.env.DATABASE_URL;
    process.env.NODE_ENV = 'development';

    const config = databaseConfig() as any;
    expect(config.type).toBe('postgres');
    expect(config.synchronize).toBe(true);
    expect(config.logging).toBe(true);
    expect(config.autoLoadEntities).toBe(true);
    expect(config.ssl).toBe(false);
  });

  it('should use DATABASE_URL if provided', () => {
    process.env.DATABASE_URL = 'postgres://user:pass@host:5432/db';

    const config = databaseConfig() as any;
    expect(config.url).toBe('postgres://user:pass@host:5432/db');
    // Ensure base options are still present
    expect(config.type).toBe('postgres');
  });

  it('should use individual connection params if DATABASE_URL is not provided', () => {
    delete process.env.DATABASE_URL;
    process.env.DATABASE_HOST = 'localhost';
    process.env.DATABASE_PORT = '5432';
    process.env.DATABASE_USERNAME = 'user';
    process.env.DATABASE_PASSWORD = 'password';
    process.env.DATABASE_NAME = 'test_db';

    const config = databaseConfig() as any;
    expect(config.host).toBe('localhost');
    expect(config.port).toBe(5432);
    expect(config.username).toBe('user');
    expect(config.password).toBe('password');
    expect(config.database).toBe('test_db');
  });

  it('should configure ssl for production', () => {
    process.env.NODE_ENV = 'production';
    const config = databaseConfig() as any;
    expect(config.ssl).toEqual({ rejectUnauthorized: false });
    expect(config.synchronize).toBe(false);
    expect(config.logging).toBe(false);
  });
});
