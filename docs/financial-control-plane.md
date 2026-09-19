# Financial control plane rollout

This release extends the environment-scoped financial API into a provider control plane. Sandbox adapters remain deterministic and credential-free. Production payments use Paystack or Flutterwave, while production wallet creation uses Turnkey or Privy.

## Migration order

Run migrations in timestamp order before releasing the frontend:

1. `20260918000000-ProviderCatalog`
2. `20260919000000-FinancialInfrastructure`
3. `20260920000000-FinancialControlPlane`

The final migration adds routing policies, provider health snapshots, reconciliation runs, recoverable webhook delivery leases, truthful payment capabilities, Flutterwave webhook credentials, and the Turnkey and Privy catalog entries. Existing financial records remain unchanged.

## Required configuration

- `PROVIDER_CONFIG_ENCRYPTION_KEY`: stable secret used to encrypt customer provider credentials. Changing it makes existing connections unreadable.
- `REDIS_HOST`, `REDIS_PORT`, and optionally `REDIS_PASSWORD`: BullMQ connection for outbound webhook delivery.
- `FINANCIAL_WEBHOOK_WORKER=true`: enables the delivery worker in the worker process.
- `FINANCIAL_WEBHOOK_WORKER=false`: recommended for API-only processes.

Production provider credentials are supplied through encrypted project connections:

- Paystack: `apiKey`
- Flutterwave: `apiKey`, `webhookSecret`
- Turnkey: `organizationId`, `apiPublicKey`, `apiPrivateKey`
- Privy: `appId`, `appSecret`

## Routing and reconciliation

When a request names a payment provider, the control plane validates that connection and records an explicit decision. A sole eligible connection is selected automatically. Multiple eligible connections require a saved routing policy or an explicit provider.

Routing policies support verified success rate, configured fees, observed latency, and explicit provider priority. The selected provider, eligible candidates, health snapshot, policy, and reason are persisted on the payment.

Failover is limited to selection before a provider write. Timeouts and server errors produce the first-class `unknown` status and are never retried against another provider. A production reconciliation run verifies pending and unknown operations against their original provider.

## Rollout

1. Back up PostgreSQL and apply the three migrations.
2. Release the backend API and webhook worker.
3. Confirm `/v1/providers`, `/v1/routing-policy`, `/v1/provider-health`, and `/v1/reconciliation` with sandbox and production keys.
4. Release the frontend after the backend is healthy.
5. Connect production providers again if a legacy connection is not environment-scoped or encrypted.

The frontend and backend can be rolled back independently after the migration. The new tables and catalog rows are additive, and compatibility sandbox wallet routes remain available.
