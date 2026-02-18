import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UserStatusGuard } from '../../../src/auth/guards/user-status.guard';
import { USERS_STATUS_ENUM } from '../../../src/enums';

describe('UserStatusGuard', () => {
  let guard: UserStatusGuard;

  beforeEach(() => {
    guard = new UserStatusGuard();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow when user is active', () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { status: USERS_STATUS_ENUM.ACTIVE },
        }),
      }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(mockContext)).toBe(true);
  });

  it('should throw when user is missing', () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: undefined,
        }),
      }),
    } as unknown as ExecutionContext;

    expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
  });

  it('should throw when user is banned', () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { status: USERS_STATUS_ENUM.BANNED },
        }),
      }),
    } as unknown as ExecutionContext;

    expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
  });
});
