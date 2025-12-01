import { Injectable } from '@nestjs/common';
import { generateApiKey } from '../helpers';

@Injectable()
export class ApiKeyService {
  private apiKey = generateApiKey();

  constructor() {
    console.log(this.apiKey);
  }
}
