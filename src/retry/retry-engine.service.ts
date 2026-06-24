import { Injectable } from '@nestjs/common';

export interface RetryOptions {
  attempts?: number;
  delayMs?: number;
}

@Injectable()
export class RetryEngineService {
  async execute<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {},
  ): Promise<T> {
    const attempts = options.attempts ?? 3;
    const delayMs = options.delayMs ?? 250;
    let lastError: unknown;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (attempt < attempts) {
          await this.delay(delayMs * attempt);
        }
      }
    }

    throw lastError;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}
