import {
  CircuitBreaker,
  CircuitBreakerRegistry,
  circuitRegistry,
} from '../../../../src/payment/infrastructure/circuit-breaker/circuit-breaker';

describe('CircuitBreaker', () => {
  let cb: CircuitBreaker;
  const config = {
    failureThreshold: 3,
    resetTimeoutMs: 1000,
    halfOpenMaxCalls: 2,
  };

  beforeEach(() => {
    cb = new CircuitBreaker('test-provider', config);
  });

  describe('Initial State', () => {
    it('should start in CLOSED state', () => {
      expect(cb.getState()).toBe('CLOSED');
    });

    it('should allow execution when closed', () => {
      expect(cb.canExecute()).toBe(true);
    });
  });

  describe('Failure Tracking', () => {
    it('should transition to OPEN after threshold failures', () => {
      cb.recordFailure();
      cb.recordFailure();
      expect(cb.getState()).toBe('CLOSED');

      cb.recordFailure();
      expect(cb.getState()).toBe('OPEN');
    });

    it('should block execution when OPEN', () => {
      cb.recordFailure();
      cb.recordFailure();
      cb.recordFailure();

      expect(cb.canExecute()).toBe(false);
    });

    it('should reset failures on success', () => {
      cb.recordFailure();
      cb.recordFailure();
      cb.recordSuccess();

      // Need 3 more failures to open
      cb.recordFailure();
      cb.recordFailure();
      expect(cb.getState()).toBe('CLOSED');
    });
  });

  describe('Half-Open State', () => {
    beforeEach(() => {
      // Open the circuit
      cb.recordFailure();
      cb.recordFailure();
      cb.recordFailure();
    });

    it('should transition to HALF_OPEN after reset timeout', (done) => {
      expect(cb.getState()).toBe('OPEN');

      setTimeout(() => {
        expect(cb.canExecute()).toBe(true);
        expect(cb.getState()).toBe('HALF_OPEN');
        done();
      }, 1100);
    }, 2000);

    it('should limit calls in HALF_OPEN', () => {
      // Force to HALF_OPEN
      jest.useFakeTimers();
      jest.advanceTimersByTime(1100);

      expect(cb.canExecute()).toBe(true); // First call
      cb.recordSuccess();

      expect(cb.canExecute()).toBe(true); // Second call
      cb.recordSuccess();

      expect(cb.getState()).toBe('CLOSED');
      jest.useRealTimers();
    });

    it('should return to OPEN on failure in HALF_OPEN', () => {
      jest.useFakeTimers();
      jest.advanceTimersByTime(1100);

      cb.canExecute();
      cb.recordFailure();

      expect(cb.getState()).toBe('OPEN');
      jest.useRealTimers();
    });
  });

  describe('Retry After', () => {
    it('should calculate retry after time', () => {
      const beforeOpen = Date.now();
      cb.recordFailure();
      cb.recordFailure();
      cb.recordFailure();

      const retryAfter = cb.getRetryAfter();
      expect(retryAfter).toBeDefined();
      expect(retryAfter!.getTime()).toBeGreaterThanOrEqual(beforeOpen + 1000);
    });

    it('should return undefined when closed', () => {
      expect(cb.getRetryAfter()).toBeUndefined();
    });
  });
});

describe('CircuitBreakerRegistry', () => {
  let registry: CircuitBreakerRegistry;

  beforeEach(() => {
    registry = new CircuitBreakerRegistry();
  });

  afterEach(() => {
    registry.reset('test-provider');
  });

  describe('Registration', () => {
    it('should create new circuit breaker', () => {
      const config = {
        failureThreshold: 3,
        resetTimeoutMs: 5000,
        halfOpenMaxCalls: 1,
      };

      const cb = registry.get('test-provider', config);

      expect(cb).toBeInstanceOf(CircuitBreaker);
      expect(cb.getState()).toBe('CLOSED');
    });

    it('should return existing circuit breaker', () => {
      const config = {
        failureThreshold: 3,
        resetTimeoutMs: 5000,
        halfOpenMaxCalls: 1,
      };

      const cb1 = registry.get('test-provider', config);
      const cb2 = registry.get('test-provider', config);

      expect(cb1).toBe(cb2);
    });
  });

  describe('Reset', () => {
    it('should remove circuit breaker', () => {
      const config = {
        failureThreshold: 3,
        resetTimeoutMs: 5000,
        halfOpenMaxCalls: 1,
      };

      const cb1 = registry.get('test-provider', config);
      registry.reset('test-provider');
      const cb2 = registry.get('test-provider', config);

      expect(cb1).not.toBe(cb2);
    });
  });

  describe('Health Check', () => {
    it('should report health of all breakers', () => {
      const config = {
        failureThreshold: 3,
        resetTimeoutMs: 5000,
        halfOpenMaxCalls: 1,
      };

      registry.get('provider-a', config);
      registry.get('provider-b', config);

      const health = registry.health();

      expect(health).toHaveProperty('provider-a', 'CLOSED');
      expect(health).toHaveProperty('provider-b', 'CLOSED');
    });
  });
});

describe('Global Circuit Registry', () => {
  it('should be a singleton registry', () => {
    expect(circuitRegistry).toBeInstanceOf(CircuitBreakerRegistry);
  });
});
