// ============================================================================
// Circuit Breaker Pattern
// ============================================================================
// Prevents cascade failures by failing fast when a provider is unhealthy.
// States: CLOSED (normal), OPEN (failing fast), HALF_OPEN (testing recovery)

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  readonly failureThreshold: number; // Failures before opening
  readonly resetTimeoutMs: number; // Time before attempting reset
  readonly halfOpenMaxCalls: number; // Test calls in half-open state
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failures = 0;
  private lastFailureTime?: Date;
  private halfOpenCalls = 0;

  constructor(
    private readonly providerId: string,
    private readonly config: CircuitBreakerConfig,
  ) {}

  // Check if request can proceed
  canExecute(): boolean {
    if (this.state === 'CLOSED') return true;

    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.transitionTo('HALF_OPEN');
        return true;
      }
      return false;
    }

    // HALF_OPEN: allow limited test calls
    if (this.state === 'HALF_OPEN') {
      return this.halfOpenCalls < this.config.halfOpenMaxCalls;
    }

    return false;
  }

  // Record success
  recordSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.halfOpenCalls++;
      if (this.halfOpenCalls >= this.config.halfOpenMaxCalls) {
        this.transitionTo('CLOSED');
      }
    }
    this.failures = 0;
  }

  // Record failure
  recordFailure(): void {
    this.failures++;
    this.lastFailureTime = new Date();

    if (this.state === 'HALF_OPEN') {
      this.transitionTo('OPEN');
      return;
    }

    if (this.failures >= this.config.failureThreshold) {
      this.transitionTo('OPEN');
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  getRetryAfter(): Date | undefined {
    if (this.state !== 'OPEN' || !this.lastFailureTime) return undefined;
    return new Date(
      this.lastFailureTime.getTime() + this.config.resetTimeoutMs,
    );
  }

  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) return true;
    const elapsed = Date.now() - this.lastFailureTime.getTime();
    return elapsed >= this.config.resetTimeoutMs;
  }

  private transitionTo(newState: CircuitState): void {
    if (newState === 'CLOSED') {
      this.failures = 0;
      this.halfOpenCalls = 0;
      this.lastFailureTime = undefined;
    }
    this.state = newState;
  }
}

// Registry of circuit breakers per provider
export class CircuitBreakerRegistry {
  private breakers = new Map<string, CircuitBreaker>();

  get(providerId: string, config: CircuitBreakerConfig): CircuitBreaker {
    const existing = this.breakers.get(providerId);
    if (existing) return existing;

    const fresh = new CircuitBreaker(providerId, config);
    this.breakers.set(providerId, fresh);
    return fresh;
  }

  reset(providerId: string): void {
    this.breakers.delete(providerId);
  }

  health(): Record<string, CircuitState> {
    const result: Record<string, CircuitState> = {};
    for (const [id, cb] of this.breakers) {
      result[id] = cb.getState();
    }
    return result;
  }
}

export const circuitRegistry = new CircuitBreakerRegistry();
