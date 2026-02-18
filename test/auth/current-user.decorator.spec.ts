import {
  CurrentUser,
  AuthUser,
} from '../../src/auth/decorators/current-user.decorator';

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

describe('CurrentUser decorator', () => {
  const invokeDecorator = (
    data: keyof AuthUser | undefined,
    user?: AuthUser,
  ) => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as any;

    return {
      data,
      context,
    };
  };

  it('should return full user when data is undefined', () => {
    const user: AuthUser = { userId: 'u1', email: 'test@example.com' };
    const { data, context } = invokeDecorator(undefined, user);
    const result = CurrentUser(data as any, context);

    expect(result).toEqual(user);
  });

  it('should return specific property when data is provided', () => {
    const user: AuthUser = { userId: 'u1', email: 'test@example.com' };
    const { data, context } = invokeDecorator('email', user);
    const result = CurrentUser(data as any, context);

    expect(result).toBe('test@example.com');
  });

  it('should throw when user is missing from request', () => {
    const { data, context } = invokeDecorator(undefined, undefined);

    expect(() => CurrentUser(data as any, context)).toThrow(
      'User not found in request',
    );
  });
});
