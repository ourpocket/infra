# Railway release gate

Deploy the API only through `.github/workflows/release.yml`. Create a second Railway service from the same `infra` source with `SERVICE_ROLE=migrator` and restart policy set to **Never**. The API service uses `SERVICE_ROLE=api` and `/v1/health/ready` as its health check. Create a webhook-worker service from the same image with `SERVICE_ROLE=api` and `FINANCIAL_WEBHOOK_WORKER=true`; it shares the same migration-gated release.

Set `RAILWAY_TOKEN`, `RAILWAY_PROJECT_ID`, `RAILWAY_ENVIRONMENT_ID`, `RAILWAY_MIGRATOR_SERVICE_ID`, `RAILWAY_API_SERVICE_ID`, and `RAILWAY_WEBHOOK_WORKER_SERVICE_ID` as GitHub Actions secrets. Disable automatic GitHub deployments for both services in Railway so an API image cannot bypass the migration job.

The migration job uses a PostgreSQL advisory lock, runs compiled JavaScript migrations, then confirms no migration remains. It is safe to retry after a failed deployment. Never run migration reverts automatically in production.
