import jwtConfig from '../../src/configs/jwt.config';

describe('JwtConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should return values from env vars', () => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_EXPIRES_IN = '1h';

    const config = jwtConfig();
    expect(config.secret).toBe('test-secret');
    expect(config.expiresIn).toBe('1h');
  });

  it('should return undefined if env vars are missing', () => {
    delete process.env.JWT_SECRET;
    delete process.env.JWT_EXPIRES_IN;

    const config = jwtConfig();
    expect(config.secret).toBeUndefined();
    expect(config.expiresIn).toBeUndefined();
  });
});
