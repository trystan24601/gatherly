# Implementation Plan: Authentication

> PRD: `.claude/prd/PRD-authentication.md`
> 🔗 GitHub Issue: [#2 Authentication](https://github.com/trystan24601/gatherly/issues/2)

---

## Phase 1 — PRD Analysis

### 1.1 System Overview

Authentication is the second feature layer of the Gatherly platform. It provides
cookie-based session management for three distinct user roles (Volunteer, Org Admin,
Super Admin), using bcrypt password hashing and DynamoDB-backed session storage with
TTL-based expiry. The design deliberately avoids JWTs: sessions are revocable,
never leak in browser history, and are stored server-side. Super Admin accounts can
only be provisioned via a CLI script — there is no UI path.

### 1.2 Functional Requirements

- **FR-01** Volunteer Registration — `POST /auth/register` with atomic duplicate-email check via DynamoDB TransactWrite; immediately logs the user in.
- **FR-02** Login (three paths) — `POST /auth/login`, `POST /auth/org/login`, `POST /auth/admin/login`; bcrypt compare; upsert SESSION; set `sid` cookie; return profile + role + orgId.
- **FR-03** Session Management — SESSION items in DynamoDB with TTL (7 days volunteer/org-admin, 8 hours super-admin); GSI6 for list-sessions-by-user; `sid` cookie is httpOnly, Secure (prod), SameSite=Strict.
- **FR-04** Logout — `POST /auth/logout` deletes SESSION item, clears cookie; idempotent; 204.
- **FR-05** Auth Middleware — `requireAuth` (reads sid, validates SESSION, attaches context to req); `requireRole`; `requireApprovedOrg`.
- **FR-06** Password Reset — `POST /auth/password-reset/request` (always 200, no enumeration, writes RESET token, enqueues SQS message); `POST /auth/password-reset/confirm` (validates token, updates hash, deletes token).
- **FR-07** Rate Limiting — 5 failed login attempts per IP per 15 min → 429; in-memory store acceptable for MVP.
- **FR-08** Super Admin Provisioning — `backend/scripts/provision-super-admin.ts` CLI; creates USER + USEREMAIL items; prints temp password to stdout; no UI path.
- **FR-09** `GET /auth/me` — returns current session user profile; requires valid `sid` cookie.

### 1.3 Non-Functional Requirements

- **Security**: bcrypt cost 12; no plaintext passwords in logs; httpOnly + SameSite=Strict cookies; single-use TTL-bounded reset tokens; UUID session IDs; no user enumeration.
- **Performance**: DynamoDB GetItem session lookup < 10 ms p99.
- **Scalability**: Sessions in DynamoDB (auto-scale); no in-memory session store; stateless Express handlers.
- **Accessibility**: All login/register forms WCAG AA — labelled inputs, descriptive errors, keyboard navigable.

### 1.4 System Boundaries

- **DynamoDB** (single-table, existing `gatherly-local` / `gatherly-staging` / `gatherly-prod`) — USER, USEREMAIL, SESSION, RESET item types.
- **SQS** (or Mailhog locally via SMTP) — password-reset email dispatch; queue URL via env var `SQS_QUEUE_URL`; SMTP fallback when `SQS_QUEUE_URL` is empty.
- **Mailhog** — local SMTP sink (already in `docker-compose.yml`).
- **React Router** — frontend routing already present (`react-router-dom` v6).
- **No external auth provider** — entirely self-contained.

---

## Architecture Overview

Gatherly Authentication is built as a set of Express route handlers mounted under
`/auth` on the existing Node.js 20 + TypeScript + Express backend. Sessions are
stored as SESSION items in the pre-existing DynamoDB single table, using GetItem
for fast session validation and TransactWrite for atomic user registration. Cookies
(`sid`, httpOnly, SameSite=Strict) carry only a UUID session identifier — no JWTs.
The frontend is React 18 + Vite + Tailwind; it adds `/login`, `/register`,
`/org/login`, `/admin/login`, and `/forgot-password` routes using React Router v6,
with an `AuthContext` providing session state globally. Password reset emails are
dispatched via SQS (cloud) or directly over SMTP to Mailhog (local). Rate limiting
is an in-memory LRU map on the Express process — acceptable for the single-Lambda
MVP deployment. All new backend dependencies (`bcryptjs`, `cookie-parser`, and an
SQS/nodemailer client) are added to the backend workspace; the frontend gains no
new runtime dependencies.

---

## Domain Model

### Entities (DynamoDB single-table)

| Entity | PK | SK | Key attributes |
|---|---|---|---|
| USER | `USER#<userId>` | `PROFILE` | `userId`, `email`, `firstName`, `lastName`, `passwordHash`, `role` (VOLUNTEER \| ORG_ADMIN \| SUPER_ADMIN), `orgId` (ORG_ADMIN only), `createdAt` |
| USEREMAIL | `USEREMAIL#<email>` | `LOCK` | `userId` — uniqueness sentinel |
| SESSION | `SESSION#<sessionId>` | `PROFILE` | `sessionId`, `userId`, `role`, `orgId?`, `createdAt`, `expiresAt` (TTL), `GSI6PK=USER#<userId>`, `GSI6SK=SESSION#<sessionId>` |
| RESET | `RESET#<token>` | `PROFILE` | `token`, `userId`, `expiresAt` (TTL, 1 hour), `used` flag |

### Access Patterns

| Pattern | Key |
|---|---|
| Validate session by sid | `GetItem PK=SESSION#<sid>, SK=PROFILE` |
| Look up user by email (login) | `GetItem PK=USEREMAIL#<email>, SK=LOCK` → then `GetItem PK=USER#<userId>, SK=PROFILE` |
| List sessions by user (forced logout) | `Query GSI6 PK=USER#<userId>` |
| Validate/consume reset token | `GetItem PK=RESET#<token>, SK=PROFILE` |

---

## Layers

### Layer 0: Infrastructure (no changes required)

**Agent**: infrastructure-engineer
**Status**: ALREADY COMPLETE — the existing `docker-compose.yml` already provisions
DynamoDB Local, Mailhog, the API container, and the frontend container with all
required environment variables (`DYNAMODB_ENDPOINT`, `DYNAMODB_TABLE_NAME`,
`SESSION_SECRET`, `SMTP_HOST`, `SMTP_PORT`, `SQS_QUEUE_URL`). GSI6 is already
defined in `bootstrap.ts`.

**Tasks**:
- [x] INF-01: Add `bcryptjs`, `cookie-parser`, and `nodemailer` (+ their `@types/*`) to `backend/package.json` — these are npm dependency changes, not infra changes, but must be confirmed present before backend tests run.
- [x] INF-02: Verify `SESSION_SECRET` env var is documented in `.env.example` and the `docker-compose.yml` API service already has it set (it does — `local-dev-session-secret-change-in-prod`).
- [x] INF-03: Confirm `SQS_QUEUE_URL` is wired in `docker-compose.yml` (it is — set to `""` locally, triggering SMTP fallback). Document the SMTP-fallback behaviour in `.env.example`.
- [x] INF-04: Update `backend/infra/local/seed.ts` to add hashed passwords for the two existing seed users (`volunteer@example.com / TestPassword123!` and `admin@gatherlydemohq.com / TestPassword123!`) and their USEREMAIL sentinels, so integration tests and E2E tests can use known credentials.

**Outputs**:
- Confirmed env var names: `DYNAMODB_ENDPOINT`, `DYNAMODB_TABLE_NAME`, `SESSION_SECRET`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `EMAIL_FROM`, `SQS_QUEUE_URL`
- DynamoDB table name (local): `gatherly-local`; GSI6 already defined
- Seed credentials: `volunteer@example.com / TestPassword123!`, `admin@gatherlydemohq.com / TestPassword123!`
- Cookie name: `sid`

**Depends on**: None
**TDD note**: No Terraform in this project (local-only infra). Run `npm run db:bootstrap && npm run db:seed` to verify the table and seed data are healthy. Confirm `docker compose up` starts all services cleanly before proceeding.

---

### Layer 1a: Backend Tests (Red)

**Agent**: backend-developer
**Tasks**:

#### Auth Service unit tests
- [x] BE-TEST-01: Write failing unit tests for `backend/src/lib/auth.ts` (to be created):
  - `hashPassword(plain)` returns a bcrypt hash (cost 12)
  - `verifyPassword(plain, hash)` returns true for matching, false for mismatch
  - `generateSessionId()` returns a UUID v4 string
  - `computeExpiresAt(role)` returns correct epoch seconds: now + 7 days for VOLUNTEER/ORG_ADMIN, now + 8 hours for SUPER_ADMIN

#### Session service unit tests
- [x] BE-TEST-02: Write failing unit tests for `backend/src/lib/session.ts` (to be created):
  - `createSession(userId, role, orgId?)` calls `putItem` with correct `PK=SESSION#<id>`, `SK=PROFILE`, TTL fields, GSI6 keys
  - `getSession(sessionId)` calls `getItem` and returns undefined when not found
  - `deleteSession(sessionId)` calls `deleteItem` with correct key
  - `isSessionExpired(session)` correctly compares `expiresAt` epoch against current time

#### Rate limiter unit tests
- [x] BE-TEST-03: Write failing unit tests for `backend/src/lib/rateLimiter.ts` (to be created):
  - First 5 attempts are allowed
  - 6th attempt within 15 minutes returns `false` (blocked)
  - After 15-minute window elapses, counter resets and attempt is allowed again

#### Auth handler integration tests (via supertest)
- [x] BE-TEST-04: Write failing integration tests for `POST /auth/register`:
  - Valid payload → 201, user profile body (no `passwordHash`), `sid` cookie set
  - Duplicate email → 409 `{"error":"An account with this email already exists."}`
  - Missing required fields → 400 validation error
  - Password too weak (no uppercase, < 8 chars, no number) → 400

- [x] BE-TEST-05: Write failing integration tests for `POST /auth/login`:
  - Valid credentials → 200, profile body, `sid` cookie set
  - Wrong password → 401 `{"error":"Invalid email or password."}`
  - Unknown email → 401 same message (no enumeration)
  - 6th failed attempt from same IP → 429 `{"error":"Too many login attempts. Try again in 15 minutes."}`

- [x] BE-TEST-06: Write failing integration tests for `POST /auth/org/login`:
  - Valid org admin credentials → 200, profile includes `orgId`
  - Invalid credentials → 401

- [x] BE-TEST-07: Write failing integration tests for `POST /auth/admin/login`:
  - Valid super admin credentials → 200
  - Invalid credentials → 401

- [x] BE-TEST-08: Write failing integration tests for `POST /auth/logout`:
  - With valid `sid` cookie → 204, cookie cleared
  - Without cookie → 204 (idempotent)

- [x] BE-TEST-09: Write failing integration tests for `GET /auth/me`:
  - With valid `sid` cookie → 200, profile body
  - Without cookie → 401 `{"error":"Authentication required."}`
  - With expired/invalid session → 401

- [x] BE-TEST-10: Write failing integration tests for password reset:
  - `POST /auth/password-reset/request` with known email → 200
  - `POST /auth/password-reset/request` with unknown email → 200 (no enumeration)
  - `POST /auth/password-reset/confirm` with valid token + strong password → 200
  - `POST /auth/password-reset/confirm` with expired/invalid token → 400 `{"error":"Invalid or expired reset token."}`

#### Auth middleware unit tests
- [x] BE-TEST-11: Write failing unit tests for `requireAuth`, `requireRole`, `requireApprovedOrg` middleware:
  - `requireAuth`: missing cookie → 401; invalid session id → 401; expired session → 401; valid session → calls next() and attaches `req.session`
  - `requireRole('ORG_ADMIN')`: req.session.role === 'VOLUNTEER' → 403 `{"error":"Insufficient permissions."}`
  - `requireApprovedOrg`: org status PENDING → 403 `{"error":"Organisation is not approved."}`

**Outputs**: Failing test suite in `backend/src/handlers/__tests__/auth.test.ts`, `backend/src/lib/__tests__/auth.test.ts`, `backend/src/lib/__tests__/session.test.ts`, `backend/src/lib/__tests__/rateLimiter.test.ts`, `backend/src/middleware/__tests__/auth.middleware.test.ts`
**Depends on**: Layer 0 (env var names, table name, seed credentials confirmed)
**TDD note**: Run `cd backend && npm test`. Every new test MUST fail with "cannot find module" or equivalent — no implementation exists yet. Do not proceed to Layer 1b until all tests are red.

---

### Layer 1b: Backend Implementation (Green → Refactor)

**Agent**: backend-developer
**Tasks**:

- [x] BE-01: Install dependencies — add `bcryptjs`, `@types/bcryptjs`, `cookie-parser`, `@types/cookie-parser`, `nodemailer`, `@types/nodemailer` to `backend/package.json`.
- [x] BE-02: Create `backend/src/lib/auth.ts` — `hashPassword`, `verifyPassword`, `generateSessionId`, `computeExpiresAt`. Make BE-TEST-01 green.
- [x] BE-03: Create `backend/src/lib/session.ts` — `createSession`, `getSession`, `deleteSession`, `isSessionExpired`. Make BE-TEST-02 green.
- [x] BE-04: Create `backend/src/lib/rateLimiter.ts` — in-memory IP-keyed counter with 15-minute sliding window. Make BE-TEST-03 green.
- [x] BE-05: Create `backend/src/lib/mailer.ts` — send reset email; uses `nodemailer` with `SMTP_HOST`/`SMTP_PORT`/`SMTP_SECURE`/`EMAIL_FROM`; falls back gracefully when `SQS_QUEUE_URL` is set (enqueue SQS message instead of direct SMTP).
- [x] BE-06: Create `backend/src/middleware/auth.middleware.ts` — `requireAuth`, `requireRole`, `requireApprovedOrg`. Make BE-TEST-11 green.
- [x] BE-07: Create `backend/src/handlers/auth.ts` — implement all 8 endpoints:
  - `POST /auth/register` — validate body, TransactWrite USER + USEREMAIL, bcrypt hash, create session, set cookie (make BE-TEST-04 green)
  - `POST /auth/login` — rate-limit check, USEREMAIL lookup, USER fetch, bcrypt compare, create session, set cookie (make BE-TEST-05 green)
  - `POST /auth/org/login` — same flow, verify role=ORG_ADMIN (make BE-TEST-06 green)
  - `POST /auth/admin/login` — same flow, verify role=SUPER_ADMIN (make BE-TEST-07 green)
  - `POST /auth/logout` — deleteSession, clearCookie (make BE-TEST-08 green)
  - `GET /auth/me` — requireAuth, return req.session user profile (make BE-TEST-09 green)
  - `POST /auth/password-reset/request` — always 200, conditionally write RESET item + dispatch email (make BE-TEST-10 green)
  - `POST /auth/password-reset/confirm` — validate/consume RESET token, updateItem password hash (make BE-TEST-10 green)
- [x] BE-08: Mount `/auth` router in `backend/src/app.ts`; add `cookie-parser` middleware.
- [x] BE-09: Create `backend/scripts/provision-super-admin.ts` — CLI script; accepts `--email`, `--firstName`, `--lastName`; TransactWrite USER + USEREMAIL with `role=SUPER_ADMIN`; prints temp password.
- [x] BE-10: Extend `req` type declaration to include `session?: { userId: string; role: string; orgId?: string }` in `backend/src/types/express.d.ts`.
- [x] BE-11: Refactor — clean up duplication between three login handlers (extract shared `loginHandler` factory). Re-run all tests to confirm still green.

**Outputs**:
- All BE-TEST-* green
- API contract (for frontend consumption):
  - `POST /auth/register` → `201 { userId, email, firstName, lastName, role }` + `Set-Cookie: sid=<uuid>`
  - `POST /auth/login` | `/auth/org/login` | `/auth/admin/login` → `200 { userId, email, firstName, lastName, role, orgId? }` + `Set-Cookie: sid=<uuid>`
  - `POST /auth/logout` → `204` + clears `sid` cookie
  - `GET /auth/me` → `200 { userId, email, firstName, lastName, role, orgId? }`
  - Error shape: `{ "error": "<message>" }` with appropriate HTTP status
- Cookie name: `sid`; credentials flag: `include` required on all authenticated fetches
- Environment variables consumed: `DYNAMODB_ENDPOINT`, `DYNAMODB_TABLE_NAME`, `SESSION_SECRET`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `EMAIL_FROM`, `SQS_QUEUE_URL`

**Depends on**: Layer 1a (all tests must be failing/red before implementation starts)
**TDD note**: Implement the minimum to make each test green, then refactor. Run `npm test` after each handler. All tests must be green before Layer 2 starts.

---

### Layer 2a: Frontend Tests (Red)

**Agent**: frontend-developer
**Tasks**:

- [x] FE-TEST-01: Write failing component tests for `<LoginForm>` (`frontend/src/components/auth/LoginForm.tsx`):
  - Renders email and password inputs with accessible labels
  - Renders a "Sign in" submit button
  - Renders "Forgot your password?" link pointing to `/forgot-password`
  - Renders "Register" link pointing to `/register`
  - On submit with valid input, calls `apiClient.post('/auth/login', ...)` with credentials
  - Displays inline error message on 401 response
  - Displays rate-limit message on 429 response
  - All inputs are keyboard-navigable (tab order correct)

- [x] FE-TEST-02: Write failing component tests for `<RegisterForm>` (`frontend/src/components/auth/RegisterForm.tsx`):
  - Renders firstName, lastName, email, password inputs with accessible labels
  - Renders "Create account" submit button
  - Renders "Sign in" link
  - Displays password hint text ("Min 8 chars, 1 uppercase, 1 number")
  - On submit with valid input, calls `apiClient.post('/auth/register', ...)`
  - Displays 409 duplicate-email error as a field-level error
  - Client-side validates password strength before submitting

- [x] FE-TEST-03: Write failing component tests for `<OrgLoginForm>` (same shape as LoginForm, different endpoint `/auth/org/login`).

- [x] FE-TEST-04: Write failing component tests for `<ForgotPasswordForm>` (`frontend/src/components/auth/ForgotPasswordForm.tsx`):
  - Renders email input with label
  - On submit, calls `apiClient.post('/auth/password-reset/request', ...)`
  - Always shows success message regardless of whether email exists (no enumeration in UI)

- [x] FE-TEST-05: Write failing unit tests for `AuthContext` (`frontend/src/context/AuthContext.tsx`):
  - `useAuth()` initially returns `{ user: null, loading: true }`
  - After mount, calls `GET /auth/me`; on success sets `user` and `loading: false`
  - On 401 from `/auth/me`, sets `user: null` and `loading: false`
  - `login(credentials)` calls `POST /auth/login`, updates `user` state on success
  - `logout()` calls `POST /auth/logout`, clears `user` state

- [x] FE-TEST-06: Write failing unit tests for `<ProtectedRoute>` component:
  - When `loading: true`, renders a loading indicator
  - When `user: null` (unauthenticated), redirects to `/login`
  - When authenticated with wrong role, redirects to `/login` (or `/403`)
  - When authenticated with correct role, renders children

- [x] FE-TEST-07: Write failing tests for `apiClient` credential inclusion:
  - All `apiClient` calls must include `credentials: 'include'` so the `sid` cookie is sent cross-origin

**Outputs**: Failing test suite in `frontend/src/components/auth/__tests__/` and `frontend/src/context/__tests__/`
**Depends on**: Layer 1b (API contracts must be known: endpoints, error shapes, cookie name)
**TDD note**: Run `cd frontend && npm test`. Every new test MUST fail. Do not proceed to Layer 2b until all tests are red.

---

### Layer 2b: Frontend Implementation (Green → Refactor)

**Agent**: frontend-developer
**Tasks**:

- [x] FE-01: Update `frontend/src/lib/api.ts` to include `credentials: 'include'` on all requests (make FE-TEST-07 green). Add a new `handleApiError(response)` helper that throws a typed error including the parsed JSON body, so forms can display backend error messages.

- [x] FE-02: Create `frontend/src/context/AuthContext.tsx` — `AuthProvider` wraps the app; exposes `{ user, loading, login, logout }` via `useAuth()` hook. Calls `GET /auth/me` on mount. (Make FE-TEST-05 green.)

- [x] FE-03: Create `frontend/src/components/auth/LoginForm.tsx` — form matching the PRD wireframe. Tailwind styling consistent with the existing design system. (Make FE-TEST-01 green.)

- [x] FE-04: Create `frontend/src/components/auth/RegisterForm.tsx` — two-column first/last name row, password hint. Client-side password-strength validation before submit. (Make FE-TEST-02 green.)

- [x] FE-05: Create `frontend/src/components/auth/OrgLoginForm.tsx` — reuses LoginForm internals, targets `/auth/org/login`. (Make FE-TEST-03 green.)

- [x] FE-06: Create `frontend/src/components/auth/ForgotPasswordForm.tsx` — always shows success message on submit regardless of response. (Make FE-TEST-04 green.)

- [x] FE-07: Create `frontend/src/components/auth/ProtectedRoute.tsx` — wraps routes; redirects unauthenticated users. (Make FE-TEST-06 green.)

- [x] FE-08: Add routes to `frontend/src/App.tsx`:
  - `/login` → `<LoginForm>` (public)
  - `/register` → `<RegisterForm>` (public)
  - `/org/login` → `<OrgLoginForm>` (public)
  - `/admin/login` → `<AdminLoginForm>` (public, minimal, same shape as OrgLoginForm targeting `/auth/admin/login`)
  - `/forgot-password` → `<ForgotPasswordForm>` (public)
  - `/dashboard` → placeholder `<Dashboard>` page behind `<ProtectedRoute role="VOLUNTEER">`
  - Wrap entire app in `<AuthProvider>`

- [x] FE-09: Refactor — extract shared `<AuthFormWrapper>` layout (logo, card, heading) to avoid duplication across the four auth forms. Re-run all tests to confirm still green.

**Outputs**:
- All FE-TEST-* green
- Routes: `/login`, `/register`, `/org/login`, `/admin/login`, `/forgot-password`, `/dashboard`
- `AuthContext` available app-wide
- `apiClient` sends `credentials: 'include'`

**Depends on**: Layer 2a (all FE tests must be failing before implementation)
**TDD note**: Implement minimum to pass each test, then refactor. All tests must be green before Layer 3 starts.

---

### Layer 3: End-to-End Tests

**Agent**: playwright-tester
**Tasks**:

- [x] TST-01: Volunteer registration happy path (AC-01, AC-02):
  - Navigate to `/register`; fill form with unique email; submit
  - Assert redirect to `/dashboard`
  - Assert `sid` cookie is present
  - Assert `GET /auth/me` API returns correct profile
  - Attempt registration with same email → assert 409 field error shown in UI

- [x] TST-02: Volunteer login / logout cycle (AC-03, AC-06):
  - Navigate to `/login`; log in as `volunteer@example.com / TestPassword123!`
  - Assert `sid` cookie is set
  - Assert `GET /auth/me` returns correct role=VOLUNTEER profile
  - Click logout
  - Assert `sid` cookie is absent
  - Assert `GET /auth/me` returns 401

- [x] TST-03: Org Admin login (AC-04):
  - Navigate to `/org/login`; log in as `admin@gatherlydemohq.com / TestPassword123!`
  - Assert response includes `orgId`
  - Assert `sid` cookie is set

- [x] TST-04: Protected route enforcement (AC-07, AC-08):
  - Navigate directly to `/dashboard` without logging in → assert redirect to `/login`
  - Log in as volunteer; attempt API call to an org-admin endpoint → assert 403

- [x] TST-05: Password reset flow (AC-09, AC-10):
  - Navigate to `/forgot-password`; submit known email → assert success message shown
  - Submit unknown email → assert same success message (no enumeration)
  - Directly call `POST /auth/password-reset/confirm` with invalid token → assert 400 error

- [x] TST-06: Rate limiting (AC-11):
  - Send 5 failed `POST /auth/login` requests from the same context
  - 6th request → assert 429 with rate-limit error message

- [x] TST-07: Accessibility checks (AC-13):
  - Navigate to `/login`, `/register` — assert all inputs have visible labels
  - Tab through `/login` form — assert focus order: email → password → submit
  - Assert no ARIA violations using Playwright accessibility snapshot

- [x] TST-08: Session TTL validation (AC-12):
  - After login, query DynamoDB Admin UI or call `GET /auth/me` — assert session item has `expiresAt` set to approximately now + 7 days (within 60-second tolerance)

**Outputs**: Playwright test suite in `e2e/tests/auth.test.ts`; all tests pass against the running local stack (`docker compose up`)
**Depends on**: Layers 1b + 2b (both must be fully implemented and green)
**TDD note**: E2E tests are written against the running system. All tests must pass before the plan is marked complete. Run with `cd e2e && npx playwright test tests/auth.test.ts`.

---

## Integration Checkpoints

| After layer | What to verify |
|---|---|
| Layer 0 | `docker compose up` starts cleanly; `npm run db:bootstrap && npm run db:seed` succeeds; GSI6 present in table; seed users have `passwordHash` + `USEREMAIL` sentinels |
| Layer 1a | `cd backend && npm test` — all new auth tests FAIL (red); zero passing among the new tests; pre-existing health tests still green |
| Layer 1b | `cd backend && npm test` — 100% of auth tests pass (green); API contract matches the spec above; no hardcoded secrets; env vars consumed from `process.env` |
| Layer 2a | `cd frontend && npm test` — all new auth component/context tests FAIL (red); pre-existing `api.test.ts` still green |
| Layer 2b | `cd frontend && npm test` — 100% of auth tests pass; `apiClient` sends `credentials: 'include'`; routes accessible at `/login`, `/register`, `/org/login` |
| Layer 3 | `cd e2e && npx playwright test` — all tests in `auth.test.ts` pass; all pre-existing smoke tests still pass |

---

## Resolved Decisions

All open questions resolved. The following decisions are authoritative for the build.

| # | Question | Decision |
|---|---|---|
| OQ-01 | Cookie `secure` flag in dev | `secure: process.env.NODE_ENV === 'production'` — disabled in local dev so Playwright E2E works over HTTP |
| OQ-02 | Password reset email delivery | Direct SMTP via nodemailer when `SQS_QUEUE_URL` is empty; publish to SQS when set — no LocalStack needed locally |
| OQ-03 | `GET /auth/me` data source | Secondary `getItem` for USER item to return `firstName`/`lastName`/`email` — sessions stay lean |
| OQ-04 | Org Admin seed user | Add `admin@gatherlydemohq.com` + USEREMAIL sentinel to `seed.ts` with `orgId=org-demo-runners` and hashed `TestPassword123!` |
| OQ-05 | `requireApprovedOrg` middleware | Single `getItem` for ORG item per request — caching deferred to future optimisation |
| OQ-06 | Password reset token format | `crypto.randomBytes(32).toString('hex')` — 256-bit entropy, no external dependency |
| OQ-07 | Post-login redirects | Volunteer → `/dashboard`, Org Admin → `/org/dashboard`, Super Admin → `/admin/dashboard` (all placeholder routes for now) |
| OQ-08 | `transactWrite` helper | In scope — add to `backend/src/lib/dynamodb.ts` as part of this feature |

---

## Integration Summary

**Status: COMPLETE** — all layers delivered, all tests green.

### Test results

| Layer | Suite | Count | Result |
|---|---|---|---|
| Layer 0 | Seed tests | 11/11 | Green |
| Layer 1b | Backend unit + integration tests | 104/104 | Green |
| Layer 2b | Frontend component + context tests | 52/52 | Green |
| Layer 3 | Playwright E2E tests | 16/16 | Green |

### What was built

**Backend** (`/home/trystanm2/dev/gatherly/backend/`):

- `src/lib/auth.ts` — `hashPassword`, `verifyPassword`, `generateSessionId`, `computeExpiresAt`, `isStrongPassword` (bcrypt cost 12)
- `src/lib/session.ts` — DynamoDB-backed session create/get/delete with TTL; 7 days for VOLUNTEER/ORG_ADMIN, 8 hours for SUPER_ADMIN
- `src/lib/rateLimiter.ts` — in-memory IP-keyed counter; `isRateLimited` (check only) and `recordFailedAttempt` (record on failure only), 5 attempts per 15 minutes
- `src/lib/mailer.ts` — password-reset email via nodemailer SMTP (Mailhog locally); SQS when `SQS_QUEUE_URL` is set
- `src/middleware/auth.middleware.ts` — `requireAuth`, `requireRole`, `requireApprovedOrg`
- `src/handlers/auth.ts` — 8 endpoints mounted under `/auth`; shared `loginHandler` factory eliminates duplication across three login paths
- `src/app.ts` — CORS (`CORS_ORIGIN` env var, `credentials: true`), `cookie-parser`, and auth router added
- `src/types/express.d.ts` — `req.session` type declaration
- `scripts/provision-super-admin.ts` — CLI to create SUPER_ADMIN accounts
- `infra/local/seed.ts` — extended with two users (volunteer + org admin), hashed passwords, USEREMAIL sentinels; total 9 seed items
- `lib/dynamodb.ts` — `transactWrite` helper added

**Frontend** (`/home/trystanm2/dev/gatherly/frontend/`):

- `src/lib/api.ts` — `ApiError` class; all requests include `credentials: 'include'`
- `src/context/AuthContext.tsx` — `AuthProvider`, `useAuth()` hook, `refreshUser()` method
- `src/components/auth/LoginForm.tsx` — reusable with `endpoint` and `redirectTo` props
- `src/components/auth/RegisterForm.tsx` — client-side password validation; calls `refreshUser()` post-registration
- `src/components/auth/OrgLoginForm.tsx` — wraps `<LoginForm endpoint="/auth/org/login" redirectTo="/org/dashboard" />`
- `src/components/auth/AdminLoginForm.tsx` — wraps `<LoginForm endpoint="/auth/admin/login" redirectTo="/admin/dashboard" />`
- `src/components/auth/ForgotPasswordForm.tsx` — always shows success; no enumeration
- `src/components/auth/ProtectedRoute.tsx` — role-based guard; SUPER_ADMIN bypasses role check
- `src/components/auth/AuthFormWrapper.tsx` — shared card layout
- `src/App.tsx` — `<AuthProvider>` wrapping all routes; protected routes for `/dashboard`, `/org/dashboard`, `/admin/dashboard`

**E2E** (`/home/trystanm2/dev/gatherly/e2e/`):

- `tests/auth.test.ts` — 16 tests covering all 8 acceptance criteria groups (TST-01 through TST-08)

**Infrastructure** (`/home/trystanm2/dev/gatherly/`):

- `frontend/Dockerfile.dev` — created (was missing)
- `.env.example` — documents all required env vars

### Deviations from PRD

1. **Rate limiter refactored** — the original `isRateLimited` function incremented on every call, which would have rate-limited successful logins from the same IP. Refactored to `isRateLimited` (check-only) + `recordFailedAttempt` (records on auth failure only). This matches the PRD intent ("failed login attempts") more precisely.

2. **TST-08 login step replaced with registration-session reuse** — the E2E test originally registered a fresh user then immediately called `/auth/login`. Because TST-06 rate-limits the test IP, the login call in TST-08 would be blocked on a second run. Fixed by using the `sid` cookie set by the registration response directly, bypassing the need for a second login call. The unit tests (backend) verify the exact 7-day TTL.

3. **CORS middleware added** — not explicitly called out in the PRD but required for cross-origin cookie-based auth between the Vite dev server (port 5173) and the Express backend (port 3001/3080). Configured via `CORS_ORIGIN` env var.

4. **`refreshUser()` added to AuthContext** — the PRD did not specify this. Required because the registration flow calls `apiClient.post` directly (not the `AuthContext.login` method), so the context needs an explicit refresh after registration to populate `user` state and allow the `ProtectedRoute` to render `/dashboard`.

### Open follow-up items

- **Password reset UI** — the E2E test covers the API-level flow, but the `/reset-password?token=<token>` confirm page with a new-password form is not yet built. Currently only the API endpoint (`POST /auth/password-reset/confirm`) is implemented.
- **Rate limiter persistence** — the in-memory store is reset on every process restart and does not survive multi-instance deployments. Replace with a Redis-backed counter (e.g. ElastiCache) before horizontal scaling.
- **SUPER_ADMIN login UI** — `/admin/login` renders `<AdminLoginForm>` which works, but `/admin/dashboard` is a placeholder. The Super Admin management interface is a separate PRD item.
- **Session list endpoint** — `GET /auth/sessions` (list active sessions by user, using GSI6) was scaffolded in the domain model but not required by the auth PRD. Implement when the account settings page is built.
- **Email integration test** — the mailer is tested via unit mocks. A full integration test confirming Mailhog receives the email would add confidence. Can be added to the E2E suite when the reset-password confirm UI is built.
