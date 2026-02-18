import redisConfig from '../../src/configs/redis.config';

describe('RedisConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should return default values', () => {
    delete process.env.REDIS_HOST;
    delete process.env.REDIS_PORT;
    delete process.env.REDIS_PASSWORD;

    const config = redisConfig();
    expect(config.port).toBe(6379);
    expect(config.host).toBeUndefined();
    expect(config.password).toBeUndefined();
  });

  it('should return values from env vars', () => {
    process.env.REDIS_HOST = 'redis-host';
    process.env.REDIS_PORT = '6380';
    process.env.REDIS_PASSWORD = 'password';

    const config = redisConfig();
    expect(config.host).toBe('redis-host');
    expect(config.port).toBe(6380);
    expect(config.password).toBe('password');
  });
});
