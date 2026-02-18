import { CheckUserStatus } from '../../src/common/decorators/check-user-status.decorator';
import { ForbiddenException } from '@nestjs/common';
import { USERS_STATUS_ENUM } from '../../src/enums';

jest.mock('@nestjs/common', () => {
  const actual = jest.requireActual('@nestjs/common');
  return {
    ...actual,
    createParamDecorator:
      (factory: (data: unknown, ctx: unknown) => unknown) =>
      (data: unknown, ctx: unknown) =>
        factory(data, ctx as any),
  };
});

describe('CheckUserStatus decorator', () => {
  const createContext = (user: any) => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as any;
  };

  it('should throw if user is not present', () => {
    const context = createContext(null);

    expect(() => CheckUserStatus(null as any, context)).toThrow(
      ForbiddenException,
    );
  });

  it('should throw if user is banned', () => {
    const user = { status: USERS_STATUS_ENUM.BANNED };
    const context = createContext(user);

    expect(() => CheckUserStatus(null as any, context)).toThrow(
      ForbiddenException,
    );
  });

  it('should return user if status is allowed', () => {
    const user = { id: 'u1', status: USERS_STATUS_ENUM.ACTIVE };
    const context = createContext(user);
    const result = CheckUserStatus(null as any, context);

    expect(result).toBe(user);
  });
});
