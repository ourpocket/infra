# E2E Test Setup

## Quick Start

```bash
# 1. Start test infrastructure (PostgreSQL + Redis)
docker compose -f docker-compose.test.yml up -d

# 2. Copy environment template
cp .env.payment.example .env

# 3. Run E2E tests
yarn run test:e2e

# 4. Cleanup
docker compose -f docker-compose.test.yml down
```

## Infrastructure

The `docker-compose.test.yml` provides:

| Service    | Port | Purpose                          |
| ---------- | ---- | -------------------------------- |
| PostgreSQL | 5432 | Database for TypeORM tests       |
| Redis      | 6379 | Queue for webhook callback tests |

## Environment Variables

Copy `.env.payment.example` to `.env` and fill in:

### Required for Payment E2E

```bash
# Flutterwave Sandbox (get from dashboard.flutterwave.com)
FLW_TEST_SECRET=FLWSECK_TEST-xxx
FLW_PUBLIC_KEY=FLWPUBK_TEST-xxx
```

### Optional (for full provider coverage)

```bash
# Paystack
PAYSTACK_SECRET_KEY=sk_test_xxx

# MTN MoMo
MTN_PRIMARY_KEY=xxx
MTN_SECONDARY_KEY=xxx

# Airtel Money
AIRTEL_CLIENT_ID=xxx
AIRTEL_CLIENT_SECRET=xxx

# Orange Money
ORANGE_API_KEY=xxx
ORANGE_MERCHANT_CODE=xxx
```

## Running Specific Tests

```bash
# Payment webhook tests only (no DB required)
yarn test -- test/payment --testPathIgnorePatterns=e2e

# Full E2E suite (requires DB + Redis)
yarn run test:e2e

# Single test file
yarn test -- test/payment/controllers/webhook.controller.spec.ts
```

## Troubleshooting

### "database 'ourpocket' does not exist"

```bash
docker compose -f docker-compose.test.yml up -d postgres
```

### "Redis connection refused"

```bash
docker compose -f docker-compose.test.yml up -d redis
```

### Flutterwave tests skipped

Add your sandbox keys to `.env`:

```bash
FLW_SECRET_KEY=FLWSECK_TEST-xxx
```

### Tests hanging

```bash
# Check for leaked handles
yarn test --detectOpenHandles

# Force exit after tests
jest --forceExit
```

## Test Results

### Unit Tests (Always Run)

```
✅ 107/107 passing - Payment module
✅ 15/15 passing - Rust webhook service
```

### E2E Tests (Requires Infrastructure)

- Payment E2E - Needs Flutterwave sandbox keys
- App E2E - Needs PostgreSQL
- Wallet Provider E2E - Needs PostgreSQL

## CI/CD Notes

For CI environments:

1. Start Docker services before tests
2. Use test-specific API keys from CI secrets
3. Run unit tests first (faster, no infra needed)
4. Run E2E tests only on main branch or PRs

```yaml
# Example GitHub Actions
- name: Start test infrastructure
  run: docker compose -f docker-compose.test.yml up -d

- name: Run unit tests
  run: yarn test -- test/payment --testPathIgnorePatterns=e2e

- name: Run E2E tests
  run: yarn run test:e2e
  env:
    FLW_SECRET_KEY: ${{ secrets.FLW_TEST_SECRET }}
```
