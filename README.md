# OurPocket Infra API

OurPocket Infra is a NestJS backend for authentication, platform/project management, API key management, and wallet operations.

## Base URL

- Local: `http://localhost:3000`
- Swagger: `http://localhost:3000/api-doc`
- Versioned routes: `http://localhost:3000/v1/...`

## Response Shape

Most endpoints are wrapped by the global response interceptor:

```json
{
  "message": "Request successful",
  "status": "success",
  "data": {}
}
```

## Auth Headers

### JWT-protected endpoints

```http
Authorization: Bearer <jwt_token>
```

### Project API key endpoints (wallet actions)

Use one of:

```http
Authorization: Bearer <project_api_key>
```

or

```http
x-api-key: <project_api_key>
```

## Endpoints

## 1) Auth Endpoints

Base path: `/v1/auth`

| Method | Path                    | Auth | Description                         |
| ------ | ----------------------- | ---- | ----------------------------------- |
| POST   | `/register`             | No   | Create account (local or provider)  |
| POST   | `/login`                | No   | Sign in with email/password         |
| POST   | `/verify-email`         | No   | Verify email with token             |
| POST   | `/request-verify-email` | No   | Send a new email verification token |
| POST   | `/forgotten-password`   | No   | Start password reset flow           |
| POST   | `/reset-password`       | No   | Reset password using token          |

### POST `/v1/auth/register`

Request (local):

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "provider": "local",
  "password": "securePassword123!",
  "country": "Nigeria",
  "companyName": "Pocket Labs",
  "role": "developer",
  "acceptTerms": true
}
```

Request (google):

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "provider": "google",
  "companyName": "Pocket Labs",
  "role": "developer",
  "acceptTerms": true
}
```

### POST `/v1/auth/login`

```json
{
  "email": "jane@example.com",
  "password": "securePassword123!"
}
```

### POST `/v1/auth/verify-email`

```json
{
  "email": "jane@example.com",
  "token": "verification_token"
}
```

### POST `/v1/auth/request-verify-email`

```json
{
  "email": "jane@example.com"
}
```

### POST `/v1/auth/forgotten-password`

```json
{
  "email": "jane@example.com"
}
```

### POST `/v1/auth/reset-password`

```json
{
  "email": "jane@example.com",
  "token": "reset_token",
  "newPassword": "NewSecurePassword123!"
}
```

## 2) Platform Account Endpoints

Base path: `/v1/platform-accounts`

| Method | Path                                | Auth | Description                                  |
| ------ | ----------------------------------- | ---- | -------------------------------------------- |
| POST   | `/v1/platform-accounts`             | JWT  | Create platform account                      |
| GET    | `/v1/platform-accounts/me`          | JWT  | Get current user's platform account          |
| GET    | `/v1/platform-accounts/me/projects` | JWT  | List projects under current platform account |

### POST `/v1/platform-accounts`

```json
{
  "name": "Acme Inc",
  "companyName": "Acme Financial Technologies",
  "metadata": {
    "plan": "pro",
    "region": "eu-west-1"
  }
}
```

## 3) Project Endpoints

Base path: `/v1/projects`

| Method | Path               | Auth | Description         |
| ------ | ------------------ | ---- | ------------------- |
| POST   | `/v1/projects`     | JWT  | Create project      |
| GET    | `/v1/projects`     | JWT  | List projects       |
| GET    | `/v1/projects/:id` | JWT  | Get project details |

### POST `/v1/projects`

```json
{
  "name": "Production Wallets",
  "slug": "production-wallets",
  "description": "Main production environment",
  "metadata": {
    "environment": "production"
  }
}
```

## 4) Project Provider Endpoints

Base path: `/v1/projects/:projectId/providers`

| Method | Path                                | Auth | Description                                 |
| ------ | ----------------------------------- | ---- | ------------------------------------------- |
| POST   | `/v1/projects/:projectId/providers` | JWT  | Create/update provider config for a project |
| GET    | `/v1/projects/:projectId/providers` | JWT  | List provider configs for a project         |

### POST `/v1/projects/:projectId/providers`

```json
{
  "type": "paystack",
  "config": {
    "apiKey": "sk_test_xxx"
  },
  "isActive": true
}
```

Supported `type`: `paystack`, `flutterwave`, `paga`, `fingra`.

## 5) Project API Key Endpoints

Base path: `/v1/projects/:projectId/api-keys`

| Method | Path                                   | Auth | Description              |
| ------ | -------------------------------------- | ---- | ------------------------ |
| POST   | `/v1/projects/:projectId/api-keys`     | JWT  | Create a project API key |
| GET    | `/v1/projects/:projectId/api-keys`     | JWT  | List project API keys    |
| DELETE | `/v1/projects/:projectId/api-keys/:id` | JWT  | Revoke project API key   |

### POST `/v1/projects/:projectId/api-keys`

```json
{
  "scope": "test",
  "description": "Test key",
  "quota": 1000,
  "expiresAt": "2026-12-31T23:59:59Z"
}
```

Returned once on creation:

```json
{
  "rawKey": "qp_xxxxxxxxx",
  "scope": "test"
}
```

## 6) User API Key Endpoints

Base path: `/api-key`

| Method | Path           | Auth | Description          |
| ------ | -------------- | ---- | -------------------- |
| POST   | `/api-key`     | JWT  | Create user API key  |
| GET    | `/api-key`     | JWT  | List user API keys   |
| GET    | `/api-key/:id` | JWT  | Get one user API key |
| DELETE | `/api-key/:id` | JWT  | Revoke user API key  |

### POST `/api-key`

```json
{
  "scope": "test",
  "description": "Development API key",
  "quota": 1000,
  "expiresAt": "2026-12-31T23:59:59Z"
}
```

## 7) Wallet Endpoints

Base path: `/v1/wallets`

| Method | Path                   | Auth            | Description                                 |
| ------ | ---------------------- | --------------- | ------------------------------------------- |
| POST   | `/v1/wallets`          | Project API Key | Create wallet                               |
| GET    | `/v1/wallets/:id`      | Project API Key | Get wallet + ledger balance                 |
| POST   | `/v1/wallets/transfer` | Project API Key | Transfer between project wallets            |
| POST   | `/v1/wallets/credit`   | Project API Key | Credit wallet (ledger or provider + ledger) |
| POST   | `/v1/wallets/debit`    | Project API Key | Debit wallet (ledger or provider + ledger)  |

### POST `/v1/wallets`

```json
{
  "currency": "NGN",
  "accountId": "optional-project-account-uuid"
}
```

### POST `/v1/wallets/transfer`

```json
{
  "fromWalletId": "uuid",
  "toWalletId": "uuid",
  "amount": "1000",
  "currency": "NGN",
  "reference": "trf_2026_001",
  "metadata": {
    "reason": "internal transfer"
  }
}
```

### POST `/v1/wallets/credit`

```json
{
  "walletId": "uuid",
  "amount": "1000",
  "currency": "NGN",
  "reference": "cr_2026_001",
  "provider": "paystack",
  "providerPayload": {
    "email": "customer@example.com"
  },
  "metadata": {
    "source": "topup"
  }
}
```

### POST `/v1/wallets/debit`

```json
{
  "walletId": "uuid",
  "amount": "500",
  "currency": "NGN",
  "reference": "db_2026_001",
  "provider": "flutterwave",
  "providerPayload": {
    "account_bank": "000",
    "account_number": "0123456789"
  },
  "metadata": {
    "reason": "withdrawal"
  }
}
```

If `provider` is omitted in `credit`/`debit`, the operation is posted directly to ledger only.

## 8) Wallet Provider Endpoints

Base path: `/wallet-providers`

| Method | Path                              | Auth            | Description                            |
| ------ | --------------------------------- | --------------- | -------------------------------------- |
| GET    | `/wallet-providers`               | No              | List active providers                  |
| POST   | `/wallet-providers/add`           | No              | Add/activate provider config in-memory |
| DELETE | `/wallet-providers/:type`         | No              | Deactivate provider                    |
| POST   | `/wallet-providers/create-wallet` | Project API Key | Create provider wallet                 |
| POST   | `/wallet-providers/actions`       | Project API Key | Generic provider action router         |

### POST `/wallet-providers/actions`

```json
{
  "provider": "paystack",
  "action": "deposit",
  "payload": {
    "email": "customer@example.com",
    "amount": "1000"
  }
}
```

Supported `action` values:

- `create_wallet`
- `fetch_wallet`
- `list_wallets`
- `deposit`
- `withdraw`

## Setup

### Install

```bash
pnpm install
```

### Run

```bash
pnpm run start:dev
```

### Tests

```bash
pnpm run test
pnpm run test:e2e
```

## Note

Open implementation work is tracked in `OPEN_ISSUES.md`.
