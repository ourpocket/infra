import {
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { User } from '../../entities/user.entity';
import { USERS_STATUS_ENUM } from 'src/enums';

export const CheckUserStatus = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user: User = request.user;
    if (!user) {
      throw new ForbiddenException('User not logged in.');
    }
    if (user.status === USERS_STATUS_ENUM.BANNED) {
      throw new ForbiddenException('User is banned, please contact support.');
    }
    return user;
  },
);
