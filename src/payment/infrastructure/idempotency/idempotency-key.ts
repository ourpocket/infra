// ============================================================================
// Idempotency Key Generator
// ============================================================================
// Generates unique keys for idempotent requests. Prevents duplicate operations.

import { generateRef } from '../mapper/request-mapper';

// Generate UUID v4 style idempotency key
export const generateIdempotencyKey = (): string => {
  return (
    generateRef('idem') + '-' + Math.random().toString(36).substring(2, 10)
  );
};

// Store for caching idempotency responses (in production, use Redis)
export class IdempotencyStore {
  private cache = new Map<string, { response: unknown; timestamp: number }>();
  private readonly ttlMs = 24 * 60 * 60 * 1000; // 24 hours

  get(key: string): unknown {
    const entry = this.cache.get(key);
    if (!entry) return undefined as unknown;

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return undefined as unknown;
    }

    return entry.response;
  }

  set(key: string, response: unknown): void {
    this.cache.set(key, { response, timestamp: Date.now() });
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  // Cleanup expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > this.ttlMs) {
        this.cache.delete(key);
      }
    }
  }
}

export const idempotencyStore = new IdempotencyStore();
