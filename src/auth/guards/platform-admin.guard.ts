import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { JwtUser } from '../interfaces/jwt-payload.interface';

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: JwtUser }>();

    if (!request.user) {
      throw new ForbiddenException('Platform administrator access is required');
    }

    const user = await this.userRepository.findOne({
      where: { id: request.user.userId, isDeleted: false },
      select: { id: true, isPlatformAdmin: true },
    });

    if (!user?.isPlatformAdmin) {
      throw new ForbiddenException('Platform administrator access is required');
    }

    return true;
  }
}
