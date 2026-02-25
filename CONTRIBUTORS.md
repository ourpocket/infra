# Contributors Guide

This guide defines the coding pattern to follow in this repository.

## Core Rules

- Keep controllers thin and move business logic into services.
- Validate input with DTOs using `class-validator`.
- Use explicit Nest exceptions (`BadRequestException`, `NotFoundException`, `UnauthorizedException`, `ConflictException`, `ForbiddenException`).
- Keep module boundaries clear: each domain has its own module, service, controller, DTOs.
- Reuse existing constants/enums instead of duplicating literals.

## Folder and Naming Pattern

- File naming: kebab-case (`project-api-key.service.ts`).
- Class naming: PascalCase (`ProjectApiKeyService`).
- DTO naming:
  - request DTOs: `CreateXxxDto`, `UpdateXxxDto`
  - response DTOs: `XxxResponseDto`
- Keep domain files in domain folders:
  - `src/auth/*`
  - `src/project/*`
  - `src/wallets/*`
  - `src/wallet-provider/*`

## Controller Pattern

- Route definitions and decorators stay in controllers.
- Avoid heavy logic, loops, or data orchestration in controllers.
- Use guards for protected routes.
- Add Swagger decorators (`@ApiTags`, `@ApiOperation`, `@ApiResponse`) for new endpoints.

## Service Pattern

- Business rules, orchestration, persistence, and external API calls stay in services.
- Keep service methods small and predictable.
- Prefer single-responsibility methods and private helper methods for repeated logic.

## DTO and Validation Pattern

- Every write endpoint (`POST`, `PUT`, `PATCH`) must use a DTO.
- Add validation decorators for all required fields.
- Add `@IsOptional()` for optional fields.
- Use enums for constrained inputs.

## Entity Pattern

- Use TypeORM entities under `src/entities`.
- Add explicit column types and lengths where needed.
- Keep sensitive fields hidden from responses at service/controller level.

## Error Handling Pattern

- Do not throw raw `Error` for user-facing API flows.
- Throw typed Nest exceptions with clear messages.
- Preserve consistent status codes across similar failures.

## Auth and Security Pattern

- JWT-protected routes must use auth guards.
- Project API key endpoints must validate incoming key before wallet/provider actions.
- Never log secrets, tokens, or API keys.
- Never return raw secret values after creation except one-time key return flows.

## Response Pattern

- The global interceptor wraps responses as:
  - `message`
  - `status`
  - `data`
- Keep endpoint returns consistent with this pattern.

## Database and Migrations

- Keep entity changes backward-compatible where possible.
- If schema changes are introduced, include migration strategy.
- Avoid destructive schema changes without rollout plan.

## Testing Pattern

- Add or update tests with every behavior change.
- Prefer service unit tests for business logic.
- Add e2e tests for route-level behavior and auth flows.
- Minimum check before merge:
  - `pnpm run lint`
  - `pnpm run test`
  - `pnpm run test:e2e` (for endpoint changes)

## Pull Request Pattern

- Keep PR scope focused to one logical change.
- Include:
  - short problem statement
  - approach summary
  - test evidence
  - API/contract impact
- Reference related issue IDs.

## Commit Pattern

- Follow conventional commit style where possible:
  - `feat: ...`
  - `fix: ...`
  - `refactor: ...`
  - `test: ...`
  - `docs: ...`

## Definition of Done

A contribution is complete when:

- Code follows module/controller/service/DTO patterns above.
- Validation and error handling are in place.
- Swagger docs are updated for new endpoints.
- Tests are updated and passing for the changed behavior.
