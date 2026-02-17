import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { USERS_STATUS_ENUM } from 'src/enums';

@Injectable()
export class UserStatusGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: any }>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('User not logged in.');
    }
    if (user.status === USERS_STATUS_ENUM.BANNED) {
      throw new ForbiddenException('User is banned, please contact support.');
    }
    return true;
  }
}
