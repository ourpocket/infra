import { JwtStrategy } from '../../../src/auth/strategies/jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(() => {
    strategy = new JwtStrategy();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  it('should validate and return user payload', () => {
    const payload = {
      sub: 'user-id',
      email: 'test@example.com',
      iat: 1234567890,
      exp: 1234567890,
    };

    const result = strategy.validate(payload);
    expect(result).toEqual({
      userId: 'user-id',
      email: 'test@example.com',
    });
  });
});
