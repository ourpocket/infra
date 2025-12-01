import { Injectable } from '@nestjs/common';
import { JwtPayload, JwtUser } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy {
  validate(payload: JwtPayload): JwtUser {
    return {
      userId: payload.sub,
      email: payload.email,
    };
  }
}
