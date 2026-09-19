# Financial infrastructure MVP operations

## Shipped scope

The normalized `/v1` APIs implement customers, the provider catalog and environment integrations, hosted payments, verification, full/partial refunds, transactions, events, API logs, and signed outbound webhooks. Production execution is limited to connected Paystack and Flutterwave payment/refund capabilities. An operation names a provider, or the backend uses the only eligible active connection; it rejects ambiguous selection and does not fail over.

Sandbox keys execute in PostgreSQL only. They support simulated payments/refunds, fiat wallets, exact integer-minor-unit balances, funding, debits, internal transfers, and the `success`, `failure`, `pending`, `insufficient_funds`, `timeout`, and `provider_outage` scenarios. Complete a pending sandbox record through `POST /v1/sandbox/operations/:id/complete`. Sandbox never calls payment providers or the legacy external ledger. Production rejects simulated funding, wallets, and scenarios. Existing wallet/transaction reads remain on compatibility routes; their writes now return an explicit error rather than create records without valid settlement.

Every financial creation takes `Idempotency-Key`. A project/environment lock atomically stores the fingerprint, pending operation, event, outbox and log before any provider write. An identical replay returns the record. A changed body returns 409. Provider writes run once. A transport/server uncertainty remains pending for explicit verification. Payment and refund verification matches the reference, parent transaction, integer amount, currency and normalized status before settlement. Failed refunds release their reservation; concurrent refund requests cannot exceed the unrefunded payment.

## Production configuration

Set these on the backend before migrations or traffic:

- `PROVIDER_CONFIG_ENCRYPTION_KEY`: independent random secret of at least 32 characters. This is required in `NODE_ENV=production`. Keep previous values available during credential migration; changing it makes existing encrypted connections unreadable.
- `REDIS_HOST`, `REDIS_PORT`, and optionally `REDIS_PASSWORD`: persistent Redis used by BullMQ. Set `FINANCIAL_WEBHOOK_WORKER=true` on one or more backend instances that should dispatch and deliver webhooks. All instances use the `financial-webhooks` queue; BullMQ and PostgreSQL row locks permit multiple workers.
- Existing PostgreSQL and JWT variables remain required. Provider credentials are connected per project and Production environment through the dashboard. Financial operation bodies never accept credentials. Flutterwave also requires the account's webhook secret hash.

Outbound payloads are HMAC-SHA256 signed as `timestamp.rawBody` in `OurPocket-Signature: t=...,v1=...`. Retry delays are 1 minute, 5 minutes, 30 minutes, 2 hours, and 12 hours. Receivers must verify the raw body and a recent timestamp, then deduplicate by event ID. Delivery IDs change on replay; event IDs do not. Redirects are not followed. Destination creation and every attempt resolve DNS, reject any private/reserved answer, and connect to a validated public IP with the original TLS hostname. Delivery responses are bounded and redact credential patterns. API/provider logs expire after seven days; financial records, events and delivery metadata are retained.

Paystack sends `X-Paystack-Signature` HMAC-SHA512. Current Flutterwave webhooks send `flutterwave-signature` HMAC-SHA256/base64. The compatibility `verif-hash` header is also accepted when no modern Flutterwave signature is present. Both paths store the authenticated receipt before provider verification. Webhook bodies never settle directly; the adapter reads and validates the provider object.

## Migration and rollout

1. Back up PostgreSQL and confirm the current branch includes `20260101000000-InitialSchema` and `20260918000000-ProviderCatalog`.
2. Configure `PROVIDER_CONFIG_ENCRYPTION_KEY` and Redis variables. On a release image, run `bun run migration:show`, then `bun run migration:run`. The additive `20260919000000-FinancialInfrastructure` migration must run after the catalog migration.
3. The migration adds environment columns without guessing historical state. Existing connections/webhooks remain `environment = NULL`; compatibility reads can see them, while normalized financial queries exclude them. Reconnect credentials into an explicit environment. It creates the resource/idempotency/event/outbox/delivery/receipt/log tables and updates only the two implemented catalog capabilities.
4. Deploy the backend/API code, then enable `FINANCIAL_WEBHOOK_WORKER=true` with persistent Redis. Confirm `/docs`, a sandbox test event, a failed delivery retry, and replay before proceeding.
5. Deploy the frontend after the backend and migration are healthy. The environment selector defaults to Sandbox and every dashboard request carries `X-Environment`.
6. The migration `down` drops normalized financial history. Do not roll it back after accepting financial traffic. Roll forward instead.

No package or app needs publishing for this rollout. `@ourpocket/sdk` is a private source workspace in the frontend repository. The subsequent control-plane release adds Turnkey and Privy chain wallet creation, explicit routing, and reconciliation; see [financial-control-plane.md](financial-control-plane.md). Stablecoins, production wallet ledgers, bank payouts, executable billing, and enterprise controls remain unimplemented.

## Verification

Use a disposable database name beginning `ourpocket_mvp_test_`, start a disposable Redis, and run:

```sh
TEST_DATABASE_NAME=ourpocket_mvp_test_local TEST_REDIS_PORT=6398 bunx jest test/financial/financial.integration.spec.ts --runInBand
bunx jest --runInBand
bun run build
bunx tsc --noEmit
```

The financial suite seeds a populated pre-MVP database before applying the additive migration. It checks legacy environment quarantine, signup → project → one-time sandbox key → operation → event → dashboard inspection, project/environment isolation, revoked/rotated keys, encrypted credentials and redaction, exact provider fixtures, ambiguous/unavailable provider behavior, write uncertainty, concurrent idempotency/refunds/transfers, insufficient balances, event ordering, signed/deduplicated inbound webhooks, outbox recovery, real Redis scheduling, HMAC delivery, filters, bounded/redacted response history, replay, destination validation, and retention. Provider HTTP is intercepted and real financial transactions are disabled.
