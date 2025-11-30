import { Injectable } from '@nestjs/common';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy {
  validate(payload: JwtPayload): unknown {
    return payload;
  }
}
