import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getStat(): Record<string, any> {
    return {
      message: 'Our Pocket Api is return well',
      date: new Date(),
    };
  }
}
