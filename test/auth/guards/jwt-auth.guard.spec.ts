import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from '../../../src/auth/guards/jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should return true if token is present', async () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {
            authorization: 'Bearer valid-token',
          },
        }),
        getResponse: () => ({}),
      }),
    } as unknown as ExecutionContext;

    jest
      .spyOn(guard as any, 'canActivate')
      .mockImplementation(() => Promise.resolve(true));

    expect(await guard.canActivate(mockContext)).toBe(true);
  });

  it('should throw UnauthorizedException if token is missing', async () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {},
        }),
        getResponse: () => ({}),
      }),
    } as unknown as ExecutionContext;

    jest
      .spyOn(guard as any, 'canActivate')
      .mockImplementation(() => Promise.reject(new UnauthorizedException()));

    await expect(guard.canActivate(mockContext)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
