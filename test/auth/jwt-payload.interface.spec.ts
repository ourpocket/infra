import * as JwtInterfacesModule from '../../src/auth/interfaces/jwt-payload.interface';

describe('JwtPayload interfaces module', () => {
  it('should be importable at runtime', () => {
    expect(JwtInterfacesModule).toBeDefined();
    expect(typeof JwtInterfacesModule).toBe('object');
  });
});
