# Payment Webhook Architecture

Complete payment webhook abstraction layer supporting Flutterwave, Paystack, and MNOs (MTN MoMo, Airtel Money, Orange Money).

## Architecture Flow

![Payment Webhook Architecture](docs/payment-webhook-architecture.png)

### Step-by-Step Flow

1. **Client → Our Infra**: Client initiates payment via our SDK/API
2. **Our Infra → Payment Gateway**: We call the payment provider (Flutterwave, Paystack, MNO)
3. **Gateway → Rust Webhook**: Provider sends webhook to our Rust webhook server
4. **Rust Webhook → Redis**: Normalized payload queued to Redis
5. **Worker → Our Infra**: Rust worker consumes from Redis, sends to Node.js `/webhooks/payment`
6. **Our Infra → BullMQ Queue**: Webhook queued for fault-tolerant delivery
7. **BullMQ → Client's API**: Persistent webhook delivery with retry
8. **Our Infra → SDK**: Real-time notification to connected SDK clients (WebSocket/Push)

## Components

### Node.js Infra (`infra/`)

#### Services

| Service                  | Purpose                                                                    |
| ------------------------ | -------------------------------------------------------------------------- |
| `PaymentService`         | Orchestrates payment operations across all providers                       |
| `ProviderFactory`        | Creates provider instances with O(1) lookup                                |
| `WebhookCallbackQueue`   | BullMQ queue for client webhook delivery (10 retries, exponential backoff) |
| `WebhookCallbackService` | Direct webhook delivery (fallback)                                         |
| `SdkNotificationService` | Real-time notifications to SDK clients (WebSocket/push)                    |

#### Controllers

| Endpoint            | Method | Purpose                                       |
| ------------------- | ------ | --------------------------------------------- |
| `/webhooks/payment` | POST   | Receives normalized webhooks from Rust worker |
| `/webhooks/health`  | POST   | Health check                                  |
| `/webhooks/status`  | GET    | Queue statistics                              |
| `/webhooks/failed`  | GET    | Failed jobs for inspection                    |

#### Providers

- **Flutterwave** - Virtual accounts, card charges, transfers
- **Paystack** - Similar operations
- **MTN MoMo** - Mobile money (Africa)
- **Airtel Money** - Mobile money (Africa)
- **Orange Money** - Mobile money (Africa)

#### Infrastructure

- **Circuit Breaker** - Prevents cascading failures (CLOSED/OPEN/HALF_OPEN)
- **Retry Policy** - Exponential backoff with jitter
- **HTTP Client** - Connection pooling, timeout handling
- **Idempotency** - X-Idempotency-Key support

### Rust Webhook Service (`webhook/`)

#### Crates

| Crate            | Purpose                                             |
| ---------------- | --------------------------------------------------- |
| `webhook-server` | Axum server receiving provider webhooks             |
| `worker`         | Redis consumer, sends to Node.js backend            |
| `domain`         | Payload normalization (Flutterwave, Paystack, MNOs) |
| `queue`          | Redis queue abstraction                             |
| `rpc-client`     | HTTP client for Node.js backend                     |

#### Endpoints

- `POST /webhook/:provider` - Receives webhooks from payment providers
- `GET /health` - Health check

#### Features

- **Signature Verification** - HMAC-SHA256 for all providers
- **MNO Normalizers** - MTN MoMo, Airtel Money, Orange Money
- **Worker Resilience** - Continues on errors, never crashes
- **Retry with Backoff** - 5 attempts, up to 5 minutes

## Fault Tolerance

### Circuit Breaker Pattern

```
CLOSED → OPEN (after threshold failures) → HALF_OPEN (after reset) → CLOSED (if success)
```

- **Threshold**: 5 failures
- **Reset**: 60 seconds
- **Half-Open**: Test with single request

### Retry Strategy

| Component    | Attempts | Backoff               | Max Delay   |
| ------------ | -------- | --------------------- | ----------- |
| Rust Worker  | 5        | Exponential           | 5 minutes   |
| BullMQ Queue | 10       | Exponential (2s base) | ~17 minutes |

### Dead Letter Queue

Failed webhooks after all retries are available via:

```bash
GET /webhooks/failed
```

## API Reference

### Incoming Webhook (from Rust Worker)

```typescript
POST /webhooks/payment
Headers:
  x-provider: flutterwave | paystack | mtn-momo | airtel-money | orange-money

Body:
{
  provider: "flutterwave",
  transaction_ref: "ref-123",
  user_id: "user-123",
  application_id: "app-1",
  status: "success",
  amount: 1000,
  currency: "NGN",
  category: "wallet-fund",
  metadata: { callback_url: "https://client.example.com/webhook" }
}

Response:
{
  status: "accepted",
  transactionRef: "ref-123"
}
```

### Queue Status

```typescript
GET /webhooks/status

Response:
{
  waiting: 5,
  active: 2,
  completed: 100,
  failed: 3,
  delayed: 1,
  timestamp: "2026-04-22T20:00:00Z"
}
```

### Failed Jobs

```typescript
GET /webhooks/failed

Response:
{
  count: 3,
  jobs: [
    {
      id: "job-1",
      ref: "ref-123",
      url: "https://client.example.com/webhook",
      attempts: 10,
      failedReason: "Connection timeout"
    }
  ]
}
```

## Environment Variables

```bash
# Redis
REDIS_URL=redis://127.0.0.1:6379
REDIS_QUEUE_KEY=ourpocket:transactions

# Webhook Signing
WEBHOOK_SIGNING_SECRET=your-secret-key

# Flutterwave
FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST-xxx
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_TEST-xxx
FLUTTERWAVE_WEBHOOK_SECRET=whsec-xxx

# Paystack
PAYSTACK_SECRET_KEY=sk_test_xxx
PAYSTACK_PUBLIC_KEY=pk_test_xxx
PAYSTACK_WEBHOOK_SECRET=whsec-xxx

# MTN MoMo
MTN_PRIMARY_KEY=xxx
MTN_SECONDARY_KEY=xxx

# Airtel Money
AIRTEL_CLIENT_ID=xxx
AIRTEL_CLIENT_SECRET=xxx

# Orange Money
ORANGE_API_KEY=xxx
ORANGE_MERCHANT_CODE=xxx

# Defaults
DEFAULT_CLIENT_WEBHOOK_URL=https://client.example.com/webhook
```

## Testing

### Node.js Tests

```bash
cd infra
npm test -- test/payment --testPathIgnorePatterns=integration
```

**107 tests passing** covering:

- Provider operations (create, fund, withdraw, verify)
- Circuit breaker behavior
- Retry policy
- Webhook controller (acceptance, rejection, queue callbacks)
- DTO validation
- Queue operations

### Rust Tests

```bash
cd webhook
cargo test --workspace
```

**15 tests passing** covering:

- Domain normalization (Flutterwave, Paystack, MNOs)
- Queue operations
- Worker loop (success, error handling)
- RPC client configuration
- Webhook signature verification

## Type Safety

All types are defined in separate files:

- `webhook.dto.ts` - Webhook request/response types
- `payment.types.ts` - Core domain types with `Result<T, E>` pattern
- `provider.interface.ts` - Provider contracts

No unused imports or variables. TypeScript strict mode enabled.

## Monitoring

### Queue Health

```bash
# Check queue status
curl http://localhost:3000/webhooks/status

# Check failed jobs
curl http://localhost:3000/webhooks/failed
```

### Logs

Key log messages:

- `Webhook queued for {ref} to {url}` - Successfully queued
- `Webhook delivered: {ref}` - Successfully delivered
- `Webhook failed after {n} attempts: {ref}` - All retries exhausted
- `No client webhook URL found for {ref}` - Missing callback URL

## Security

1. **HMAC Signatures** - All client webhooks signed with SHA256
2. **Provider Verification** - We verify with provider API before forwarding
3. **Idempotency** - X-Idempotency-Key prevents duplicate processing
4. **Credential Validation** - Providers validated before use

## Production Checklist

- [ ] Set `WEBHOOK_SIGNING_SECRET` to strong random value
- [ ] Configure all provider credentials
- [ ] Set up Redis cluster for high availability
- [ ] Monitor queue metrics (`/webhooks/status`)
- [ ] Alert on failed jobs (`/webhooks/failed`)
- [ ] Implement WebSocket/SSE for SDK notifications
- [ ] Set up dead-letter queue monitoring
- [ ] Configure provider webhook URLs in production

## License

UNLICENSED - OurPocket internal
