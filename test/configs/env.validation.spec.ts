import { validateEnvironment } from '../../src/configs/env.validation';

describe('validateEnvironment', () => {
  const validEnvironment = {
    JWT_SECRET: 'test-secret',
    DATABASE_URL: 'postgres://user:password@localhost:5432/ourpocket',
  };

  it('returns parsed environment values', () => {
    const environment = validateEnvironment({
      ...validEnvironment,
      PORT: '4000',
    });

    expect(environment.PORT).toBe(4000);
    expect(environment.JWT_EXPIRES_IN).toBe('1d');
  });

  it('throws immediately when JWT_SECRET is missing', () => {
    expect(() =>
      validateEnvironment({ DATABASE_URL: validEnvironment.DATABASE_URL }),
    ).toThrow('JWT_SECRET is required');
  });

  it('requires individual database settings without DATABASE_URL', () => {
    expect(() => validateEnvironment({ JWT_SECRET: 'test-secret' })).toThrow(
      'DATABASE_HOST is required when DATABASE_URL is not set',
    );
  });

  it('rejects invalid numeric settings', () => {
    expect(() =>
      validateEnvironment({ ...validEnvironment, PORT: 'not-a-port' }),
    ).toThrow('PORT');
  });
});
