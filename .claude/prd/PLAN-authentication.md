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
- [ ] INF-01: Add `bcryptjs`, `cookie-parser`, and `nodemailer` (+ their `@types/*`) to `backend/package.json` — these are npm dependency changes, not infra changes, but must be confirmed present before backend tests run.
- [ ] INF-02: Verify `SESSION_SECRET` env var is documented in `.env.example` and the `docker-compose.yml` API service already has it set (it does — `local-dev-session-secret-change-in-prod`).
- [ ] INF-03: Confirm `SQS_QUEUE_URL` is wired in `docker-compose.yml` (it is — set to `""` locally, triggering SMTP fallback). Document the SMTP-fallback behaviour in `.env.example`.
- [ ] INF-04: Update `backend/infra/local/seed.ts` to add hashed passwords for the two existing seed users (`volunteer@example.com / TestPassword123!` and `admin@gatherlydemohq.com / TestPassword123!`) and their USEREMAIL sentinels, so integration tests and E2E tests can use known credentials.

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
- [ ] BE-TEST-01: Write failing unit tests for `backend/src/lib/auth.ts` (to be created):
  - `hashPassword(plain)` returns a bcrypt hash (cost 12)
  - `verifyPassword(plain, hash)` returns true for matching, false for mismatch
  - `generateSessionId()` returns a UUID v4 string
  - `computeExpiresAt(role)` returns correct epoch seconds: now + 7 days for VOLUNTEER/ORG_ADMIN, now + 8 hours for SUPER_ADMIN

#### Session service unit tests
- [ ] BE-TEST-02: Write failing unit tests for `backend/src/lib/session.ts` (to be created):
  - `createSession(userId, role, orgId?)` calls `putItem` with correct `PK=SESSION#<id>`, `SK=PROFILE`, TTL fields, GSI6 keys
  - `getSession(sessionId)` calls `getItem` and returns undefined when not found
  - `deleteSession(sessionId)` calls `deleteItem` with correct key
  - `isSessionExpired(session)` correctly compares `expiresAt` epoch against current time

#### Rate limiter unit tests
- [ ] BE-TEST-03: Write failing unit tests for `backend/src/lib/rateLimiter.ts` (to be created):
  - First 5 attempts are allowed
  - 6th attempt within 15 minutes returns `false` (blocked)
  - After 15-minute window elapses, counter resets and attempt is allowed again

#### Auth handler integration tests (via supertest)
- [ ] BE-TEST-04: Write failing integration tests for `POST /auth/register`:
  - Valid payload → 201, user profile body (no `passwordHash`), `sid` cookie set
  - Duplicate email → 409 `{"error":"An account with this email already exists."}`
  - Missing required fields → 400 validation error
  - Password too weak (no uppercase, < 8 chars, no number) → 400

- [ ] BE-TEST-05: Write failing integration tests for `POST /auth/login`:
  - Valid credentials → 200, profile body, `sid` cookie set
  - Wrong password → 401 `{"error":"Invalid email or password."}`
  - Unknown email → 401 same message (no enumeration)
  - 6th failed attempt from same IP → 429 `{"error":"Too many login attempts. Try again in 15 minutes."}`

- [ ] BE-TEST-06: Write failing integration tests for `POST /auth/org/login`:
  - Valid org admin credentials → 200, profile includes `orgId`
  - Invalid credentials → 401

- [ ] BE-TEST-07: Write failing integration tests for `POST /auth/admin/login`:
  - Valid super admin credentials → 200
  - Invalid credentials → 401

- [ ] BE-TEST-08: Write failing integration tests for `POST /auth/logout`:
  - With valid `sid` cookie → 204, cookie cleared
  - Without cookie → 204 (idempotent)

- [ ] BE-TEST-09: Write failing integration tests for `GET /auth/me`:
  - With valid `sid` cookie → 200, profile body
  - Without cookie → 401 `{"error":"Authentication required."}`
  - With expired/invalid session → 401

- [ ] BE-TEST-10: Write failing integration tests for password reset:
  - `POST /auth/password-reset/request` with known email → 200
  - `POST /auth/password-reset/request` with unknown email → 200 (no enumeration)
  - `POST /auth/password-reset/confirm` with valid token + strong password → 200
  - `POST /auth/password-reset/confirm` with expired/invalid token → 400 `{"error":"Invalid or expired reset token."}`

#### Auth middleware unit tests
- [ ] BE-TEST-11: Write failing unit tests for `requireAuth`, `requireRole`, `requireApprovedOrg` middleware:
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

- [ ] BE-01: Install dependencies — add `bcryptjs`, `@types/bcryptjs`, `cookie-parser`, `@types/cookie-parser`, `nodemailer`, `@types/nodemailer` to `backend/package.json`.
- [ ] BE-02: Create `backend/src/lib/auth.ts` — `hashPassword`, `verifyPassword`, `generateSessionId`, `computeExpiresAt`. Make BE-TEST-01 green.
- [ ] BE-03: Create `backend/src/lib/session.ts` — `createSession`, `getSession`, `deleteSession`, `isSessionExpired`. Make BE-TEST-02 green.
- [ ] BE-04: Create `backend/src/lib/rateLimiter.ts` — in-memory IP-keyed counter with 15-minute sliding window. Make BE-TEST-03 green.
- [ ] BE-05: Create `backend/src/lib/mailer.ts` — send reset email; uses `nodemailer` with `SMTP_HOST`/`SMTP_PORT`/`SMTP_SECURE`/`EMAIL_FROM`; falls back gracefully when `SQS_QUEUE_URL` is set (enqueue SQS message instead of direct SMTP).
- [ ] BE-06: Create `backend/src/middleware/auth.middleware.ts` — `requireAuth`, `requireRole`, `requireApprovedOrg`. Make BE-TEST-11 green.
- [ ] BE-07: Create `backend/src/handlers/auth.ts` — implement all 8 endpoints:
  - `POST /auth/register` — validate body, TransactWrite USER + USEREMAIL, bcrypt hash, create session, set cookie (make BE-TEST-04 green)
  - `POST /auth/login` — rate-limit check, USEREMAIL lookup, USER fetch, bcrypt compare, create session, set cookie (make BE-TEST-05 green)
  - `POST /auth/org/login` — same flow, verify role=ORG_ADMIN (make BE-TEST-06 green)
  - `POST /auth/admin/login` — same flow, verify role=SUPER_ADMIN (make BE-TEST-07 green)
  - `POST /auth/logout` — deleteSession, clearCookie (make BE-TEST-08 green)
  - `GET /auth/me` — requireAuth, return req.session user profile (make BE-TEST-09 green)
  - `POST /auth/password-reset/request` — always 200, conditionally write RESET item + dispatch email (make BE-TEST-10 green)
  - `POST /auth/password-reset/confirm` — validate/consume RESET token, updateItem password hash (make BE-TEST-10 green)
- [ ] BE-08: Mount `/auth` router in `backend/src/app.ts`; add `cookie-parser` middleware.
- [ ] BE-09: Create `backend/scripts/provision-super-admin.ts` — CLI script; accepts `--email`, `--firstName`, `--lastName`; TransactWrite USER + USEREMAIL with `role=SUPER_ADMIN`; prints temp password.
- [ ] BE-10: Extend `req` type declaration to include `session?: { userId: string; role: string; orgId?: string }` in `backend/src/types/express.d.ts`.
- [ ] BE-11: Refactor — clean up duplication between three login handlers (extract shared `loginHandler` factory). Re-run all tests to confirm still green.

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

- [ ] FE-TEST-01: Write failing component tests for `<LoginForm>` (`frontend/src/components/auth/LoginForm.tsx`):
  - Renders email and password inputs with accessible labels
  - Renders a "Sign in" submit button
  - Renders "Forgot your password?" link pointing to `/forgot-password`
  - Renders "Register" link pointing to `/register`
  - On submit with valid input, calls `apiClient.post('/auth/login', ...)` with credentials
  - Displays inline error message on 401 response
  - Displays rate-limit message on 429 response
  - All inputs are keyboard-navigable (tab order correct)

- [ ] FE-TEST-02: Write failing component tests for `<RegisterForm>` (`frontend/src/components/auth/RegisterForm.tsx`):
  - Renders firstName, lastName, email, password inputs with accessible labels
  - Renders "Create account" submit button
  - Renders "Sign in" link
  - Displays password hint text ("Min 8 chars, 1 uppercase, 1 number")
  - On submit with valid input, calls `apiClient.post('/auth/register', ...)`
  - Displays 409 duplicate-email error as a field-level error
  - Client-side validates password strength before submitting

- [ ] FE-TEST-03: Write failing component tests for `<OrgLoginForm>` (same shape as LoginForm, different endpoint `/auth/org/login`).

- [ ] FE-TEST-04: Write failing component tests for `<ForgotPasswordForm>` (`frontend/src/components/auth/ForgotPasswordForm.tsx`):
  - Renders email input with label
  - On submit, calls `apiClient.post('/auth/password-reset/request', ...)`
  - Always shows success message regardless of whether email exists (no enumeration in UI)

- [ ] FE-TEST-05: Write failing unit tests for `AuthContext` (`frontend/src/context/AuthContext.tsx`):
  - `useAuth()` initially returns `{ user: null, loading: true }`
  - After mount, calls `GET /auth/me`; on success sets `user` and `loading: false`
  - On 401 from `/auth/me`, sets `user: null` and `loading: false`
  - `login(credentials)` calls `POST /auth/login`, updates `user` state on success
  - `logout()` calls `POST /auth/logout`, clears `user` state

- [ ] FE-TEST-06: Write failing unit tests for `<ProtectedRoute>` component:
  - When `loading: true`, renders a loading indicator
  - When `user: null` (unauthenticated), redirects to `/login`
  - When authenticated with wrong role, redirects to `/login` (or `/403`)
  - When authenticated with correct role, renders children

- [ ] FE-TEST-07: Write failing tests for `apiClient` credential inclusion:
  - All `apiClient` calls must include `credentials: 'include'` so the `sid` cookie is sent cross-origin

**Outputs**: Failing test suite in `frontend/src/components/auth/__tests__/` and `frontend/src/context/__tests__/`
**Depends on**: Layer 1b (API contracts must be known: endpoints, error shapes, cookie name)
**TDD note**: Run `cd frontend && npm test`. Every new test MUST fail. Do not proceed to Layer 2b until all tests are red.

---

### Layer 2b: Frontend Implementation (Green → Refactor)

**Agent**: frontend-developer
**Tasks**:

- [ ] FE-01: Update `frontend/src/lib/api.ts` to include `credentials: 'include'` on all requests (make FE-TEST-07 green). Add a new `handleApiError(response)` helper that throws a typed error including the parsed JSON body, so forms can display backend error messages.

- [ ] FE-02: Create `frontend/src/context/AuthContext.tsx` — `AuthProvider` wraps the app; exposes `{ user, loading, login, logout }` via `useAuth()` hook. Calls `GET /auth/me` on mount. (Make FE-TEST-05 green.)

- [ ] FE-03: Create `frontend/src/components/auth/LoginForm.tsx` — form matching the PRD wireframe. Tailwind styling consistent with the existing design system. (Make FE-TEST-01 green.)

- [ ] FE-04: Create `frontend/src/components/auth/RegisterForm.tsx` — two-column first/last name row, password hint. Client-side password-strength validation before submit. (Make FE-TEST-02 green.)

- [ ] FE-05: Create `frontend/src/components/auth/OrgLoginForm.tsx` — reuses LoginForm internals, targets `/auth/org/login`. (Make FE-TEST-03 green.)

- [ ] FE-06: Create `frontend/src/components/auth/ForgotPasswordForm.tsx` — always shows success message on submit regardless of response. (Make FE-TEST-04 green.)

- [ ] FE-07: Create `frontend/src/components/auth/ProtectedRoute.tsx` — wraps routes; redirects unauthenticated users. (Make FE-TEST-06 green.)

- [ ] FE-08: Add routes to `frontend/src/App.tsx`:
  - `/login` → `<LoginForm>` (public)
  - `/register` → `<RegisterForm>` (public)
  - `/org/login` → `<OrgLoginForm>` (public)
  - `/admin/login` → `<AdminLoginForm>` (public, minimal, same shape as OrgLoginForm targeting `/auth/admin/login`)
  - `/forgot-password` → `<ForgotPasswordForm>` (public)
  - `/dashboard` → placeholder `<Dashboard>` page behind `<ProtectedRoute role="VOLUNTEER">`
  - Wrap entire app in `<AuthProvider>`

- [ ] FE-09: Refactor — extract shared `<AuthFormWrapper>` layout (logo, card, heading) to avoid duplication across the four auth forms. Re-run all tests to confirm still green.

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

- [ ] TST-01: Volunteer registration happy path (AC-01, AC-02):
  - Navigate to `/register`; fill form with unique email; submit
  - Assert redirect to `/dashboard`
  - Assert `sid` cookie is present
  - Assert `GET /auth/me` API returns correct profile
  - Attempt registration with same email → assert 409 field error shown in UI

- [ ] TST-02: Volunteer login / logout cycle (AC-03, AC-06):
  - Navigate to `/login`; log in as `volunteer@example.com / TestPassword123!`
  - Assert `sid` cookie is set
  - Assert `GET /auth/me` returns correct role=VOLUNTEER profile
  - Click logout
  - Assert `sid` cookie is absent
  - Assert `GET /auth/me` returns 401

- [ ] TST-03: Org Admin login (AC-04):
  - Navigate to `/org/login`; log in as `admin@gatherlydemohq.com / TestPassword123!`
  - Assert response includes `orgId`
  - Assert `sid` cookie is set

- [ ] TST-04: Protected route enforcement (AC-07, AC-08):
  - Navigate directly to `/dashboard` without logging in → assert redirect to `/login`
  - Log in as volunteer; attempt API call to an org-admin endpoint → assert 403

- [ ] TST-05: Password reset flow (AC-09, AC-10):
  - Navigate to `/forgot-password`; submit known email → assert success message shown
  - Submit unknown email → assert same success message (no enumeration)
  - Directly call `POST /auth/password-reset/confirm` with invalid token → assert 400 error

- [ ] TST-06: Rate limiting (AC-11):
  - Send 5 failed `POST /auth/login` requests from the same context
  - 6th request → assert 429 with rate-limit error message

- [ ] TST-07: Accessibility checks (AC-13):
  - Navigate to `/login`, `/register` — assert all inputs have visible labels
  - Tab through `/login` form — assert focus order: email → password → submit
  - Assert no ARIA violations using Playwright accessibility snapshot

- [ ] TST-08: Session TTL validation (AC-12):
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
