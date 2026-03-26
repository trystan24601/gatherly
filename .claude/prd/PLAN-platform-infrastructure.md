# Implementation Plan: Platform Infrastructure

> PRD: `.claude/prd/PRD-platform-infrastructure.md`
> 🔗 GitHub Issue: [#1 Platform Infrastructure](https://github.com/trystan24601/gatherly/issues/1)
> Generated: 2026-03-26

---

## Architecture Overview

Gatherly's platform infrastructure is a fully serverless, AWS-native system deployed in `eu-west-2`. The backend runs as a single Node.js 20 TypeScript Lambda function (catch-all routing) behind an API Gateway HTTP API, bundled with esbuild into a single zip. All operational data is stored in a single DynamoDB table using a composite key design and 6 GSIs covering every access pattern required by the MVP. The frontend is a React + Vite + Tailwind SPA hosted on S3 and served globally through CloudFront with OAC, using the custom domain `gatherlywork.com`. Async domain events flow through a standard SQS queue backed by a DLQ, and transactional email is delivered via SES with domain identity automated via Terraform Route 53 records. Two environments (`staging`, `prod`) are provisioned from the same Terraform modules with environment-specific variable overrides; Terraform remote state is stored in S3 bucket `gatherly-terraform-state-299311846579`. Locally, a `docker-compose.yml` mirrors the full cloud topology — DynamoDB Local, Mailhog, and a Node.js Express API that reuses the same Lambda handler code — so every developer can work entirely offline. The monorepo uses npm workspaces with `workspaces: ["backend", "frontend", "e2e"]`. CI/CD runs on GitHub Actions: a `ci.yml` workflow validates every pull request (lint, type-check, unit tests, build, Playwright E2E), and merge-triggered workflows handle automated staging deploys and manual-approval production releases.

---

## Domain Model

The following entities are defined by the single-table schema. All live in one DynamoDB table; entity type is encoded in key prefixes.

| Entity | PK | SK | Notes |
|---|---|---|---|
| User | `USER#<userId>` | `PROFILE` | Volunteers and org admins |
| Session | `SESSION#<sessionId>` | `PROFILE` | Auth sessions; TTL-managed; indexed by GSI6 |
| Organisation | `ORG#<orgId>` | `PROFILE` | A sports club or charity |
| OrgEmail sentinel | `ORGEMAIL#<email>` | `LOCK` | Prevents duplicate org contact emails |
| Event | `EVENT#<eventId>` | `PROFILE` | A volunteering event |
| Role | `EVENT#<eventId>` | `ROLE#<roleId>` | A volunteer role within an event |
| Registration | `REG#<regId>` | `META` | A volunteer's registration for a role |
| Skill | `SKILL#<skillId>` | `PROFILE` | A skill tag |
| VolunteerSkill | `USER#<userId>` | `SKILL#<skillId>` | Many-to-many: user owns a skill |

GSI access patterns:

| GSI | PK | SK | Query Use Case |
|---|---|---|---|
| GSI1 | `GSI1PK` | `GSI1SK` | Org approval queue ordered by status then createdAt (oldest-first) |
| GSI2 | `GSI2PK` | `GSI2SK` | All members of a given organisation |
| GSI3 | `GSI3PK` | `GSI3SK` | Events by status (powers public discovery feed) |
| GSI4 | `GSI4PK` | `GSI4SK` | Registrations for a given event (event roster) |
| GSI5 | `GSI5PK` | `GSI5SK` | Registrations belonging to a given volunteer |
| GSI6 | `GSI6PK` | `GSI6SK` | Sessions belonging to a given userId |

---

## Layers

### Layer 0: Infrastructure
**Agent**: `infrastructure-engineer`

**Tasks**:
- [ ] INF-01: Scaffold Terraform workspace structure — `infra/terraform/` with `modules/` and `environments/staging`, `environments/prod` variable files; shared `backend.tf` pointing at S3 state bucket `gatherly-terraform-state-299311846579` + DynamoDB lock table
- [ ] INF-02: Terraform module — DynamoDB single-table (`gatherly-<env>`), on-demand billing, PITR enabled, deletion protection on prod, encryption at rest, all 6 GSIs (ALL projection, PAY_PER_REQUEST), all entity key patterns documented in comments; `DYNAMODB_TABLE_NAME` output exported
- [ ] INF-03: Terraform module — Lambda + API Gateway HTTP API; single catch-all Lambda function (placeholder esbuild zip); IAM execution role with least-privilege inline policies (DynamoDB, SQS, Secrets Manager, X-Ray, CloudWatch Logs); CORS configured for frontend origin env var; `API_GATEWAY_URL` output exported
- [ ] INF-04: Terraform module — S3 bucket for file storage (private, server-side encryption, versioning on prod); S3 bucket for frontend assets (private); CloudFront distribution with OAC, HTTPS-only, custom domain `gatherlywork.com`, ACM certificate (`us-east-1` provider for ACM), Route 53 A record alias to CloudFront, `CLOUDFRONT_DISTRIBUTION_ID` output exported
- [ ] INF-05: Terraform module — SQS standard queue + DLQ (`maxReceiveCount=3`), encryption enabled; SES domain identity for `gatherlywork.com` with Route 53 DKIM/verification records automated via Terraform; `SQS_QUEUE_URL` and `SQS_DLQ_URL` outputs exported
- [ ] INF-06: Terraform module — WAF Web ACL attached to API Gateway; AWS managed rule group `AWSManagedRulesCommonRuleSet`; rate-based rule (configurable threshold, default 2000 req/5min); association to API Gateway stage
- [ ] INF-07: Terraform module — observability: CloudWatch Log Groups for Lambda (30-day retention staging, 90-day prod), X-Ray tracing enabled on Lambda and API Gateway, CloudWatch dashboard (request count, p50/p95/p99 latency, error rate, DynamoDB RCU/WCU, SQS queue depth), CloudWatch Alarm (Lambda error rate > 1% over 5 min) → SNS topic → email subscription, AWS Budgets at 80% of £50/month (staging) and £200/month (prod); Lambda concurrency limit set per environment to cap runaway costs
- [ ] INF-08: Terraform module — Secrets Manager secrets for `SESSION_SECRET` and `SES_SMTP_PASSWORD`; IAM policy grants Lambda read access to these secrets only
- [ ] INF-09: Run `terraform validate` and `tflint` against all modules; resolve all warnings and errors; run Checkov policy scan and document any accepted findings in `infra/terraform/CHECKOV-EXCEPTIONS.md`
- [ ] INF-10: Provide `docker-compose.yml` at project root with services: `api` (local Node build, port 3001), `frontend` (Vite dev server, port 5173), `dynamodb-local` (`amazon/dynamodb-local`, port 8000), `dynamodb-admin` (`aaronshaf/dynamodb-admin`, port 8001), `mailhog` (`mailhog/mailhog`, SMTP 1025, UI 8025); health checks on all services; `.env.local.example` with all required variables documented
- [ ] INF-11: GitHub Actions `ci.yml` — triggers on pull request; jobs: lint+typecheck (frontend and backend in parallel), unit tests (Vitest, frontend and backend in parallel), production build (frontend Vite + backend tsc), Playwright E2E (waits for DynamoDB Local readiness with curl poll max 30 attempts, waits for API health max 30 attempts, uploads HTML report artifact on failure)
- [ ] INF-12: GitHub Actions `deploy-staging.yml` — triggers on merge to `main`; runs all CI steps then: `terraform apply` staging, Lambda zip + `update-function-code`, frontend S3 sync + CloudFront invalidation, smoke test `GET /health` returns 200
- [ ] INF-13: GitHub Actions `deploy-prod.yml` — manual trigger or tagged release; GitHub environment protection (manual approval gate); same deploy steps as staging

**Outputs**:
- `DYNAMODB_TABLE_NAME` — consumed by backend as env var
- `API_GATEWAY_URL` — consumed by frontend and smoke tests
- `SQS_QUEUE_URL`, `SQS_DLQ_URL` — consumed by backend
- `CLOUDFRONT_DISTRIBUTION_ID` — consumed by deploy workflows
- `S3_ASSETS_BUCKET`, `S3_FILES_BUCKET` — consumed by backend and deploy workflows
- `docker-compose.yml` with all local services
- `.env.local.example` with every required variable
- GitHub Actions workflow files

**Depends on**: none

**TDD note**: Infrastructure does not follow Red/Green/Refactor. Completeness gates are: `terraform validate` passes, `tflint` passes with zero warnings, Checkov scan passes (or findings documented), `docker compose up` starts all services, `docker compose ps` shows all containers healthy.

---

### Layer 1a: Backend Tests (Red)
**Agent**: `backend-developer`

**Tasks**:
- [ ] BE-TEST-01: Scaffold the backend package — `backend/` directory, `package.json` (workspace member), TypeScript config, Vitest config, ESLint config; install `@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb`, `express`, `vitest`, `@types/express`
- [ ] BE-TEST-02: Write failing unit tests for the DynamoDB client module (`backend/src/lib/dynamodb.ts`) — tests must assert: client is constructed with `DYNAMODB_ENDPOINT` env var when set (local), uses default endpoint resolution when not set (AWS); `getItem`, `putItem`, `updateItem`, `deleteItem`, `queryItems` helpers are exported; `updateItem` helper accepts exactly 5 parameters including optional `expressionAttributeNames`
- [ ] BE-TEST-03: Write failing unit tests for `updateItem` reserved-word handling — tests must assert that when `expressionAttributeNames` is provided as the 5th argument, it is merged into the DynamoDB `UpdateCommand` `ExpressionAttributeNames`; passing `status`, `name`, `type` as aliased keys does not throw
- [ ] BE-TEST-04: Write failing unit tests for the `bootstrap.ts` script — tests must assert: calling `bootstrapTable` creates a table named from `DYNAMODB_TABLE_NAME` env var with composite PK (`PK` string hash key) + SK (`SK` string range key); all 6 GSIs are created with correct key names (`GSI1PK`/`GSI1SK` ... `GSI6PK`/`GSI6SK`); calling `bootstrapTable` a second time on an existing table does not throw (idempotent)
- [ ] BE-TEST-05: Write failing unit tests for `seed.ts` — tests must assert: `seedData` creates exactly 1 Organisation item, 1 User item, 1 OrgEmail sentinel item, 1 Event item, 2 Role items in the table; calling `seedData` twice produces the same item count (idempotent via conditional put or upsert)
- [ ] BE-TEST-06: Write failing unit tests for the `/health` handler — tests must assert: `GET /health` returns HTTP 200; response body is `{"status":"ok","timestamp":"<ISO string>"}` where `timestamp` is a valid ISO 8601 string; no authentication required
- [ ] BE-TEST-07: Write failing unit tests for the structured logger module (`backend/src/lib/logger.ts`) — tests must assert: logger emits JSON to stdout; emitted object contains fields `requestId`, `userId`, `orgId`, `action`, `durationMs`, `statusCode`; missing optional fields are omitted not null

**Outputs**: Failing Vitest test suite in `backend/src/` covering DynamoDB client, bootstrap script, seed script, health handler, and logger. All tests must fail (Red) before Layer 1b begins.

**Depends on**: Layer 0 — `DYNAMODB_TABLE_NAME` env var name and all 6 GSI key names must be confirmed from INF-02 before tests reference them

**TDD note**: After writing tests, run `npx vitest run` from `backend/`. Every test listed above must appear in output as FAILED. If any test passes without implementation code existing, that test is not testing real behaviour and must be rewritten. Do not proceed to Layer 1b until all tests are confirmed failing.

---

### Layer 1b: Backend Implementation (Green → Refactor)
**Agent**: `backend-developer`

**Tasks**:
- [ ] BE-01: Implement `backend/src/lib/dynamodb.ts` — DynamoDB DocumentClient factory that reads `DYNAMODB_ENDPOINT` from env; export `getItem`, `putItem`, `updateItem` (5-param signature), `deleteItem`, `queryItems` helpers; ensure `updateItem` merges `expressionAttributeNames` into `ExpressionAttributeNames` on the `UpdateCommand`; pass BE-TEST-02 and BE-TEST-03
- [ ] BE-02: Implement `backend/src/lib/logger.ts` — structured JSON logger using `console.log`; accepts context object with `requestId`, `userId`, `orgId`, `action`, `durationMs`, `statusCode`; omits undefined fields from output; pass BE-TEST-07
- [ ] BE-03: Implement `infra/local/bootstrap.ts` — creates the DynamoDB table with PK/SK composite key and all 6 GSIs using DynamoDB Local endpoint; idempotent (catch `ResourceInUseException`); pass BE-TEST-04
- [ ] BE-04: Implement `infra/local/seed.ts` — inserts 1 approved org (`ORG#<id>` / `PROFILE`), 1 org email sentinel (`ORGEMAIL#<email>` / `LOCK`), 1 volunteer user (`USER#<id>` / `PROFILE`), 1 published event (`EVENT#<id>` / `PROFILE`), 2 roles (`EVENT#<id>` / `ROLE#<id>`); uses conditional put (`attribute_not_exists(PK)`) for idempotency; pass BE-TEST-05
- [ ] BE-05: Implement `backend/src/handlers/health.ts` Express handler and wire it into `backend/src/app.ts` — `GET /health` returns `{"status":"ok","timestamp":"<ISO>"}` with HTTP 200; pass BE-TEST-06
- [ ] BE-06: Add `package.json` scripts: `db:bootstrap` (runs `infra/local/bootstrap.ts` via `ts-node`), `db:seed` (runs `infra/local/seed.ts`), `dev` (starts Express on port 3001 with nodemon), `build` (tsc compile), `test` (vitest run), `lint` (eslint), `typecheck` (tsc --noEmit)
- [ ] BE-07: Refactor pass — remove any duplication introduced during Green phase; ensure no hardcoded table names, endpoint URLs, or credentials; re-run `npx vitest run` to confirm all tests remain green; run `npm run lint` and `npm run typecheck` with zero errors

**Outputs**:
- `backend/src/lib/dynamodb.ts` — DynamoDB client and helper utilities
- `backend/src/lib/logger.ts` — structured JSON logger
- `backend/src/handlers/health.ts` + `backend/src/app.ts` — Express application
- `infra/local/bootstrap.ts` — table + GSI creation script
- `infra/local/seed.ts` — demo data seeder
- `backend/package.json` with all required scripts
- Fully passing Vitest suite (all BE-TEST-* green)
- API contract: `GET /health` → `200 {"status":"ok","timestamp":"<ISO>"}`

**Depends on**: Layer 1a (failing tests must exist); Layer 0 (DynamoDB endpoint env var name, table name env var, GSI key names)

**TDD note**: Implement only enough to pass each failing test. Do not add code beyond what the tests require. After all tests are green, run the Refactor pass (BE-07). Re-run tests after refactor; they must remain green.

---

### Layer 2a: Frontend Tests (Red)
**Agent**: `frontend-developer`

**Tasks**:
- [ ] FE-TEST-01: Scaffold the frontend package — `frontend/` directory, `package.json` (workspace member), Vite config, TypeScript config, Vitest config with `@testing-library/react`, Tailwind CSS (reuse existing `tailwind.config.js` at repo root), ESLint config
- [ ] FE-TEST-02: Write failing unit tests for a `HealthBanner` component (or equivalent app shell) — tests must assert: component renders without crashing; renders expected heading text (e.g., "Gatherly"); component does not display an error state on initial mount
- [ ] FE-TEST-03: Write failing unit tests for a `apiClient` utility (`frontend/src/lib/api.ts`) — tests must assert: `apiClient` reads base URL from `VITE_API_BASE_URL` env var; `apiClient.get('/health')` makes a fetch to `<VITE_API_BASE_URL>/health`; on non-2xx response, rejects with an error containing the status code

**Outputs**: Failing Vitest component test suite in `frontend/src/`. All tests must fail (Red) before Layer 2b begins.

**Depends on**: Layer 1b — `VITE_API_BASE_URL` target and the `/health` endpoint contract must be confirmed

**TDD note**: Run `npx vitest run` from `frontend/`. Every test listed above must appear as FAILED. Do not proceed to Layer 2b until all tests are confirmed failing.

---

### Layer 2b: Frontend Implementation (Green → Refactor)
**Agent**: `frontend-developer`

**Tasks**:
- [ ] FE-01: Implement React + Vite app scaffold — `frontend/src/main.tsx`, `frontend/src/App.tsx` with basic routing shell (React Router v6); Tailwind CSS wired via PostCSS; pass FE-TEST-02
- [ ] FE-02: Implement `frontend/src/lib/api.ts` — thin fetch wrapper that reads `VITE_API_BASE_URL` from `import.meta.env`; exports typed `get`, `post`, `put`, `delete` helpers; rejects on non-2xx; pass FE-TEST-03
- [ ] FE-03: Add `package.json` scripts: `dev` (Vite dev server on port 5173), `build` (Vite production build), `preview`, `test` (vitest run), `lint` (eslint), `typecheck` (tsc --noEmit)
- [ ] FE-04: Refactor pass — ensure no hardcoded API URLs; verify `VITE_API_BASE_URL` is the only env var reference for the API origin; re-run `npx vitest run` with all tests green; run `npm run lint` and `npm run typecheck` with zero errors

**Outputs**:
- `frontend/src/main.tsx`, `frontend/src/App.tsx` — React application entry point
- `frontend/src/lib/api.ts` — typed fetch wrapper
- `frontend/package.json` with all required scripts
- Fully passing Vitest component suite (all FE-TEST-* green)
- Frontend accessible at `http://localhost:5173` when running via `docker compose up`

**Depends on**: Layer 2a (failing tests must exist); Layer 1b (API base URL env var pattern)

**TDD note**: Implement only enough to pass each failing test. After all tests are green run the Refactor pass (FE-04). Re-run tests after refactor; they must remain green.

---

### Layer 3: End-to-End Tests
**Agent**: `playwright-tester`

**Tasks**:
- [ ] TST-01: Scaffold Playwright — `e2e/` directory, `playwright.config.ts`, `package.json`; configure base URL from `E2E_BASE_URL` env var (default `http://localhost:5173`); configure API base URL from `E2E_API_URL` env var (default `http://localhost:3001`)
- [ ] TST-02: E2E test — local stack smoke test: `docker compose up -d` is assumed running; assert `http://localhost:5173` responds with HTTP 200 and page title contains "Gatherly"; assert `http://localhost:8001` (DynamoDB Admin) responds with HTTP 200; assert `http://localhost:8025` (Mailhog) responds with HTTP 200
- [ ] TST-03: API contract test — `GET http://localhost:3001/health` returns status 200; response body JSON contains `status: "ok"` and `timestamp` that is a valid ISO 8601 string
- [ ] TST-04: E2E test — frontend loads and renders: navigate to `http://localhost:5173`; assert page loads without JavaScript console errors; assert no visible error state is present; assert page contains the application heading
- [ ] TST-05: Database bootstrap acceptance test — after running `npm run db:bootstrap`, query DynamoDB Local via the Admin UI or AWS CLI; assert table `gatherly-local` exists; assert all 6 GSIs are present (`GSI1` through `GSI6`)
- [ ] TST-06: Seed data acceptance test — after running `npm run db:seed` twice (to verify idempotency), assert exactly 1 Organisation item, 1 User item, 1 OrgEmail sentinel, 1 Event item, 2 Role items exist in the table (no duplicates); assert org has `status: "APPROVED"`, event has `status: "PUBLISHED"`
- [ ] TST-07: CI configuration — ensure Playwright is wired into the `ci.yml` workflow correctly; verify HTML report artifact upload on failure (`if: always()`); verify DynamoDB Local and API readiness poll steps precede the Playwright run step

**Outputs**: Playwright E2E test suite in `e2e/`; all tests passing against local stack; CI workflow validated

**Depends on**: Layers 1b + 2b (fully implemented running system); Layer 0 (docker-compose.yml and CI workflow files)

**TDD note**: E2E tests are written against the running system. All tests must pass before the plan is marked complete. If a test fails, the failure indicates either an infrastructure gap (fix in Layer 0) or an implementation gap (fix in Layer 1b or 2b) — do not work around it in the test.

---

## Integration Checkpoints

| After Layer | Check |
|---|---|
| Layer 0 | `docker compose up` starts all 5 services healthy; `terraform validate` and `tflint` pass; env var names in `.env.local.example` match all names referenced in backend and frontend code |
| Layer 1a | Run `npx vitest run` from `backend/` — confirm every BE-TEST-* appears as FAILED; if any test passes without implementation, reject and rewrite; blocked if no failures |
| Layer 1b | Run `npx vitest run` from `backend/` — confirm all BE-TEST-* are PASSED; run `npm run typecheck` and `npm run lint` with zero errors; API contract for `GET /health` documented and matches what Layer 2a tests will call |
| Layer 2a | Run `npx vitest run` from `frontend/` — confirm every FE-TEST-* appears as FAILED; blocked if no failures |
| Layer 2b | Run `npx vitest run` from `frontend/` — confirm all FE-TEST-* are PASSED; run `npm run typecheck` and `npm run lint` with zero errors; `VITE_API_BASE_URL` env var usage consistent with `.env.local.example` |
| Layer 3 | All Playwright tests pass against the local stack; CI workflow (`ci.yml`) runs end-to-end on a test PR without failures; all 12 acceptance criteria (AC-01 through AC-12) are met |

---

## Resolved Decisions

All open questions have been resolved. The following decisions are authoritative for the build.

| # | Question | Decision |
|---|---|---|
| OQ-01 | Monorepo tooling | **npm workspaces** — `workspaces: ["backend", "frontend", "e2e"]` in root `package.json` |
| OQ-02 | Terraform remote state | **S3 bucket `gatherly-terraform-state-299311846579`** — already created, versioning + encryption + public access block enabled |
| OQ-03 | Custom domain | **`gatherlywork.com`** — registered in Route 53 (account 299311846579), hosted zone created automatically |
| OQ-04 | SES domain identity | **Automated via Terraform** — Route 53 DKIM/verification records created by Terraform; no manual DNS steps |
| OQ-05 | Lambda packaging | **esbuild bundle** — all dependencies bundled into a single zip per deploy; no Lambda layers |
| OQ-06 | Lambda route granularity | **Single catch-all Lambda** — one function handles all routes in MVP; split by domain in a future PRD |
| OQ-07 | `dynamodb-admin` env var | Use `DYNAMO_ENDPOINT=http://dynamodb-local:8000` and `AWS_REGION=eu-west-2`; verify at build time |
| OQ-08 | Table name pattern | **`gatherly-<env>`** — e.g. `gatherly-staging`, `gatherly-prod`; `gatherly-local` for local dev |
| OQ-09 | WAF rate limit threshold | **2000 requests per 5 minutes per IP** — Terraform variable, adjustable post-launch |
| OQ-10 | Seed user password | **`TestPassword123!`** — documented in `.env.local.example`; local dev only, never used in production |

**Environments**: `staging` and `prod` only — no `dev` environment. AWS account ID: `299311846579`.
