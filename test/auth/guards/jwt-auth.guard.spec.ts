import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from '../../../src/auth/guards/jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should return true if token is valid', () => {
    const token = new JwtService({
      secret: 'ourpocket-development-secret',
    }).sign({
      sub: 'user-id',
      email: 'test@example.com',
      status: 'active',
    });
    const request = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    };
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(mockContext)).toBe(true);
    expect(request).toHaveProperty('user', {
      userId: 'user-id',
      email: 'test@example.com',
      role: undefined,
      status: 'active',
    });
  });

  it('should throw UnauthorizedException if token is missing', () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {},
        }),
      }),
    } as unknown as ExecutionContext;

    expect(() => guard.canActivate(mockContext)).toThrow(UnauthorizedException);
  });
});
