# PRD: Platform Infrastructure

> 🔗 GitHub Issue: [#1 Platform Infrastructure](https://github.com/trystan24601/gatherly/issues/1)

## 1. Background

Before any product features can be built, the platform requires a foundational infrastructure layer. This covers the AWS cloud infrastructure (Terraform), a local development environment (Docker Compose), a CI/CD pipeline (GitHub Actions), observability tooling, and the DynamoDB single-table schema design with all 6 GSIs. All subsequent features depend on this foundation. The stack: Node.js 20 + TypeScript backend (Express locally, Lambda in prod), React + Vite + Tailwind frontend served via CloudFront/S3, DynamoDB on-demand single-table with 7 GSIs. All AWS resources in `eu-west-2` (London).

## 2. User Roles

| Role | Description |
|---|---|
| **Developer** | Runs the local dev environment; pushes code through CI/CD |
| **Super Admin** | Only human who interacts with production infrastructure directly (AWS Console / CLI for emergency ops) |

## 3. Functional Requirements

### FR-01 — AWS Infrastructure (Terraform)

All AWS resources defined in Terraform under `infra/terraform/`:

**Compute & API**
- AWS Lambda (Node.js 20.x) — one function per route group
- API Gateway HTTP API — routes all requests to Lambda; CORS configured for frontend origin

**Data**
- DynamoDB single-table — on-demand billing (PAY_PER_REQUEST), PITR enabled, deletion protection on prod
- S3 — file storage (event images, briefing PDFs)

**Frontend**
- S3 — static frontend assets
- CloudFront — serves frontend; custom domain with ACM certificate; HTTPS only; OAC

**Messaging & Email**
- SQS standard queue — async domain events (confirmations, notifications)
- SQS DLQ — captures failed messages (maxReceiveCount=3)
- SES — transactional email; verified domain identity

**Security**
- IAM roles/policies — least-privilege per Lambda; no wildcard resource ARNs
- AWS Secrets Manager — session secret, SES credentials
- WAF — rate limiting on API Gateway; OWASP managed rule groups

**Three environments** from the same Terraform modules: `dev`, `staging`, `prod`

### FR-02 — DynamoDB Single-Table Schema

One table, composite primary key (`PK` + `SK`), 7 GSIs:

| GSI | PK | SK | Purpose |
|---|---|---|---|
| GSI1 | `GSI1PK` | `GSI1SK` | Org approval queue (by status, oldest-first) |
| GSI2 | `GSI2PK` | `GSI2SK` | Org members (by orgId) |
| GSI3 | `GSI3PK` | `GSI3SK` | Events by status (discovery feed) |
| GSI4 | `GSI4PK` | `GSI4SK` | Registrations by event (event roster) |
| GSI5 | `GSI5PK` | `GSI5SK` | Registrations by volunteer |
| GSI6 | `GSI6PK` | `GSI6SK` | Sessions by userId |
| GSI7 | `GSI7PK` | `GSI7SK` | Slots by event (fetch all slots for a role/event) |

All GSIs: PAY_PER_REQUEST billing, ALL attribute projection.

Entity key patterns:

| Entity | PK | SK |
|---|---|---|
| User | `USER#<userId>` | `PROFILE` |
| Session | `SESSION#<sessionId>` | `PROFILE` |
| Organisation | `ORG#<orgId>` | `PROFILE` |
| OrgEmail sentinel | `ORGEMAIL#<email>` | `LOCK` |
| Event | `EVENT#<eventId>` | `PROFILE` |
| Role | `EVENT#<eventId>` | `ROLE#<roleId>` |
| Slot | `ROLE#<roleId>` | `SLOT#<slotId>` |
| Registration | `REG#<regId>` | `META` |
| Skill | `SKILL#<skillId>` | `PROFILE` |
| VolunteerSkill | `USER#<userId>` | `SKILL#<skillId>` |

SLOT item attributes: `slotId`, `roleId`, `eventId`, `location`, `shiftStart`, `shiftEnd`, `headcount`, `filledCount`, `status`. GSI7PK = `SLOT#<slotId>` for direct lookup by slotId (used by the registration endpoint).

**Critical rules (lessons from events-dog):**
- `status`, `name`, `type` are DynamoDB reserved words — ALL UpdateExpressions touching these fields MUST use `ExpressionAttributeNames` aliases
- `updateItem` helper signature must accept optional `expressionAttributeNames` 5th parameter
- OrgItem stores org name in `name` field (not `orgName`) — never drift from this
- TransactWrite uses DocumentClient (`@aws-sdk/lib-dynamodb`) — never mix with raw client

### FR-03 — Local Development Stack (Docker Compose)

Single `docker compose up` starts:

| Service | Image | Port | Purpose |
|---|---|---|---|
| `api` | Local build (Node.js 20) | 3001 | Express API (mirrors Lambda handlers) |
| `frontend` | Vite dev server | 5173 | React frontend with HMR |
| `dynamodb-local` | `amazon/dynamodb-local` | 8000 | Local DynamoDB |
| `dynamodb-admin` | `aaronshaf/dynamodb-admin` | 8001 | DynamoDB web UI |
| `mailhog` | `mailhog/mailhog` | 8025 | SMTP capture + web UI |

Scripts:
- `infra/local/bootstrap.ts` — creates table + all 7 GSIs (idempotent)
- `infra/local/seed.ts` — populates demo data (idempotent — safe to run twice)

Seed data: 1 APPROVED org (Gatherly Demo Runners), 1 volunteer user, 1 PUBLISHED event with 2 roles (each role has at least one slot).

`.env.local.example` committed; `.env.local` gitignored.

### FR-04 — CI/CD Pipeline (GitHub Actions)

**`ci.yml`** — every pull request:
1. Lint (ESLint) + type check (tsc) — frontend and backend
2. Unit tests (Vitest) — frontend and backend, in parallel
3. Build (frontend production + backend tsc compile)
4. E2E tests — single Playwright runner (no sharding until stability proven)

**`deploy-staging.yml`** — merge to `main`:
1. All CI steps
2. `terraform apply` staging
3. Lambda zip + update-function-code
4. Frontend build → S3 sync → CloudFront invalidation
5. Smoke test: `GET /health` returns 200

**`deploy-prod.yml`** — manual trigger / tagged release:
1. GitHub environment protection (manual approval required)
2. Same as staging

**Critical CI lessons:**
- Wait for DynamoDB Local readiness before bootstrap (poll curl, max 30 attempts)
- Wait for API health before E2E (poll curl, max 30 attempts)
- Upload Playwright HTML report as artifact on failure (`if: always()`)
- Single E2E runner is intentional — sharding causes flakiness in early stages

### FR-05 — Observability Baseline

- **Structured logging**: JSON to CloudWatch with `requestId`, `userId`, `orgId`, `action`, `durationMs`, `statusCode`
- **Distributed tracing**: X-Ray on Lambda + API Gateway
- **Error alerting**: CloudWatch Alarm on Lambda error rate > 1% over 5min → SNS → email
- **Dashboard**: request count, p50/p95/p99 latency, error rate, DynamoDB RCU/WCU, SQS depth
- **Budget alert**: AWS Budgets at 80% of £50/month (dev) and £200/month (prod)

---

## 4. Non-Functional Requirements

- **Security**: No AWS credentials in repo. Secrets via AWS Secrets Manager / GitHub Actions secrets. IAM least-privilege. S3 private; public access via CloudFront OAC only. DynamoDB encryption at rest.
- **Performance**: Lambda cold start < 800ms p99. DynamoDB on-demand handles 100 concurrent writes.
- **Scalability**: All on-demand/serverless. DynamoDB auto-scales.
- **Resilience**: SQS DLQ captures failures. CloudWatch alarms before user impact.
- **Cost**: Zero cost at zero traffic (Lambda + DynamoDB on-demand).
- **Data residency**: All resources in `eu-west-2`. No cross-region in MVP.

---

## 5. API Changes

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | None | Returns `{"status":"ok","timestamp":"<ISO>"}` |

---

## 6. UI Screens

### Local Dev Verification (not a UI screen — developer checklist)
```
Terminal:
$ docker compose up -d
$ npm run db:bootstrap --workspace=backend
$ npm run db:seed --workspace=backend

Browser checks:
  http://localhost:5173      → Gatherly app loads
  http://localhost:8001      → DynamoDB Admin UI
  http://localhost:8025      → Mailhog UI
  http://localhost:3001/health → {"status":"ok"}
```

---

## 7. Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-01 | `docker compose up` starts all services; frontend accessible at `http://localhost:5173` within 60 seconds |
| AC-02 | `npm run db:bootstrap` creates the DynamoDB table with all 7 GSIs without errors |
| AC-03 | `npm run db:seed` populates demo org, volunteer, and event; safe to run twice (idempotent) |
| AC-04 | `GET /health` returns `{"status":"ok"}` in under 500ms |
| AC-05 | `terraform plan` runs without errors against dev environment from a clean checkout |
| AC-06 | `terraform apply` provisions all resources in `eu-west-2`; all tagged `environment=dev,project=gatherly` |
| AC-07 | CI pipeline runs on a PR: lint, type-check, Vitest tests, build, and Playwright E2E all pass |
| AC-08 | Merge to `main` triggers staging deploy; Lambda updated, CloudFront invalidated, smoke test passes |
| AC-09 | A Lambda invocation produces a structured JSON log in CloudWatch with all required fields |
| AC-10 | No secrets or `.env.local` appear in any committed file |
| AC-11 | `updateItem` helper accepts optional 5th `expressionAttributeNames` parameter and passes it to DynamoDB |
| AC-12 | Running `npm run db:seed` twice does not create duplicate items or throw errors |

---

## 8. Out of Scope

- Multi-region deployment or disaster recovery
- VPC / private networking (Lambda default VPC only in MVP)
- ElastiCache or any additional caching layer
- Container-based deployment (ECS/Fargate) — Lambda only
- Automated DynamoDB migrations (bootstrap script handles table/GSI creation)
- Advanced WAF rules beyond basic rate limiting
