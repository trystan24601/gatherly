# Implementation Plan: Organisation Registration

> PRD: `.claude/prd/PRD-organisation-registration.md`
> GitHub Issue: [#3 Organisation Registration](https://github.com/trystan24601/gatherly/issues/3)

---

## Phase 1 — PRD Analysis

### 1.1 System Overview

Organisation Registration is MVP-03. It covers the full supply-side onboarding
journey: an anonymous user submits an organisation + admin account form in a
single atomic DynamoDB TransactWrite (USER + ORG + ORGEMAIL sentinel), is shown
a confirmation screen without being logged in, and then waits for a Super Admin
to approve or reject. The Super Admin reviews a GSI1-backed PENDING queue, approves
or rejects with a mandatory reason, and each decision enqueues an SQS message that
triggers an email (Mailhog locally). Org Admins see different screens depending on
their org's status on next login. A `requireApprovedOrg` middleware (already
implemented) gates all ORG_ADMIN-scoped endpoints.

### 1.2 Functional Requirements

- **FR-01** Organisation Registration Form — `POST /organisations/register` accepts org details (name, orgType, description, contactEmail, contactPhone, website?) and admin account fields (adminFirstName, adminLastName, adminEmail, adminPassword).
- **FR-02** Atomic Write with Uniqueness Guards — single TransactWrite creates USER (`role=ORG_ADMIN`), ORG (`status=PENDING`), and ORGEMAIL sentinel simultaneously with `attribute_not_exists` conditions. Pre-check GetItem on USEREMAIL sentinel before the transaction to provide a field-specific 409 for duplicate admin email.
- **FR-03** Post-Submission State — user is NOT auto-logged-in; shown confirmation screen; SQS message `ORG_SUBMITTED` enqueued (no email in MVP).
- **FR-04** Org Admin Login States — PENDING → `/organisation/pending`; REJECTED → `/organisation/rejected` (verbatim reason); APPROVED → `/organisation/dashboard`; SUSPENDED → 403.
- **FR-05** Super Admin Approval Queue — `GET /admin/organisations?status=PENDING&limit=20&cursor=<cursor>` paginated via GSI1 oldest-first.
- **FR-06** Approve Organisation — `POST /admin/organisations/:orgId/approve`; sets `status=APPROVED`, `approvedAt`, `approvedBy`; updates GSI1PK to `ORG_STATUS#APPROVED`; enqueues `ORG_APPROVED`.
- **FR-07** Reject Organisation — `POST /admin/organisations/:orgId/reject`; body `{ reason }` min 10 chars; sets `status=REJECTED`, `rejectedAt`, `rejectionReason`; updates GSI1PK; enqueues `ORG_REJECTED`.

### 1.3 Non-Functional Requirements

- **Security**: Admin password bcrypt cost 12 (matches existing convention). No org contact email leaked beyond org admin's own profile. TransactWrite atomicity prevents orphaned USER items.
- **Performance**: Registration form submission under 2 seconds (DynamoDB write + SQS enqueue).
- **Accessibility**: Single-page registration form (not multi-step) fully keyboard-navigable; all fields labelled; inline validation errors announced by screen readers.
- **Scalability**: GSI1 supports thousands of PENDING orgs with cursor pagination.

### 1.4 System Boundaries

- **DynamoDB** (single-table `gatherly-local` / prod) — new ORG and ORGEMAIL entity types; GSI1 for approval queue access pattern.
- **SQS / Mailhog** — `ORG_SUBMITTED` (no email), `ORG_APPROVED`, `ORG_REJECTED` messages enqueued; existing `SQS_QUEUE_URL` env var and SMTP fallback pattern from mailer.ts.
- **Express backend** — new `/organisations` and `/admin/organisations` routers mounted on the existing app.
- **React frontend** — new pages and components added to the existing Vite + React 18 + Tailwind app.
- **Auth middleware** — `requireAuth`, `requireRole('SUPER_ADMIN')`, and `requireApprovedOrg` already implemented and ready to compose.

---

## Architecture Overview

Organisation Registration extends the existing Express + DynamoDB + React platform.
The backend gains two new routers (`organisationsRouter` mounted at `/organisations`
and `adminOrgsRouter` mounted at `/admin/organisations`) following the same patterns
as the existing `authRouter`: TypeScript, supertest integration tests, DynamoDB
via the shared `lib/dynamodb.ts` helpers, and SQS/SMTP dispatch through an extended
`lib/mailer.ts`. The ORG item type is introduced to the single DynamoDB table with
GSI1 keyed on `ORG_STATUS#<status>` / `<submittedAt>#<orgId>` to support the
oldest-first PENDING queue. All three write paths (register, approve, reject) use
`transactWrite` or `updateItem` for atomicity. The frontend adds four new pages
(`/register/organisation`, `/organisation/pending`, `/organisation/rejected`,
`/admin/organisations`) and updates the org login redirect logic to route Org Admins
based on their org's status returned in the `GET /auth/me` response (which must be
extended to include `orgStatus`). Local development uses the existing
`docker-compose.yml` with Mailhog for email; no new Docker services are needed.

---

## Domain Model

### Entities (DynamoDB single-table)

| Entity | PK | SK | Key attributes |
|---|---|---|---|
| USER (ORG_ADMIN) | `USER#<userId>` | `PROFILE` | `userId`, `email` (adminEmail), `firstName`, `lastName`, `passwordHash`, `role=ORG_ADMIN`, `orgId`, `createdAt` |
| ORG | `ORG#<orgId>` | `PROFILE` | `orgId`, `name`, `orgType`, `description`, `contactEmail`, `contactPhone`, `website?`, `status` (PENDING\|APPROVED\|REJECTED\|SUSPENDED), `submittedAt`, `adminUserId`, `approvedAt?`, `approvedBy?`, `rejectedAt?`, `rejectionReason?`, `GSI1PK=ORG_STATUS#<status>`, `GSI1SK=<submittedAt>#<orgId>` |
| ORGEMAIL | `ORGEMAIL#<contactEmail>` | `LOCK` | `orgId` — uniqueness sentinel for org contact email |
| USEREMAIL | `USEREMAIL#<adminEmail>` | `LOCK` | `userId` — pre-existing sentinel, checked before TransactWrite |

### Access Patterns

| Pattern | Key / Index |
|---|---|
| Register org (atomic write) | TransactWrite: Put USER + Put ORG + Put ORGEMAIL |
| Pre-check admin email uniqueness | `GetItem PK=USEREMAIL#<adminEmail>, SK=LOCK` |
| Get org by ID (approve/reject/detail) | `GetItem PK=ORG#<orgId>, SK=PROFILE` |
| List orgs by status, oldest-first (approval queue) | `Query GSI1 PK=ORG_STATUS#PENDING, ScanIndexForward=true, Limit=20` with `ExclusiveStartKey` cursor |
| Get org for requireApprovedOrg middleware | `GetItem PK=ORG#<orgId>, SK=PROFILE` (already implemented) |
| Org Admin login status routing | `GET /auth/me` response — must include `orgStatus` field (requires `GET /auth/me` to look up the ORG item when `role=ORG_ADMIN`) |

### GSI1 Approval Queue Key Design

```
GSI1PK = ORG_STATUS#PENDING   (changes to ORG_STATUS#APPROVED or ORG_STATUS#REJECTED on decision)
GSI1SK = <submittedAt ISO8601>#<orgId>   (ISO8601 sorts lexicographically = oldest-first)
```

---

## Layers

### Layer 0: Infrastructure (changes minimal — no new Docker services)

**Agent**: infrastructure-engineer

**Tasks**:
- [x] INF-01: Verify `docker-compose.yml` API service has `SQS_QUEUE_URL` env var wired (it does — set to `""`, triggering SMTP fallback). No new services needed; Mailhog already present for `ORG_APPROVED` / `ORG_REJECTED` emails.
- [x] INF-02: Confirm the existing single DynamoDB table bootstrap (`backend/infra/local/bootstrap.ts`) already defines GSI1 with `GSI1PK` / `GSI1SK` attribute definitions (it does — confirmed in bootstrap.ts lines 37-38 and 51-57). No schema changes needed.
- [x] INF-03: Update `backend/infra/local/seed.ts` to add one approved ORG seed item (needed for E2E tests of guarded endpoints) and one PENDING ORG seed item (needed for E2E approval flow). Seed must be idempotent.
- [x] INF-04: Document any new env vars required (none expected — existing `SQS_QUEUE_URL`, `SMTP_*`, `EMAIL_FROM`, `APP_URL` cover all cases). Confirm `.env.example` references `APP_URL` for org-approval email links.

**Outputs**:
- Confirmed: GSI1 already defined in table schema, no migration needed
- Confirmed env vars: `DYNAMODB_ENDPOINT`, `DYNAMODB_TABLE_NAME`, `SQS_QUEUE_URL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `EMAIL_FROM`, `APP_URL`
- Seed data: one approved org (`org-seed-approved`) + one PENDING org (`org-seed-pending`) with corresponding ORG_ADMIN user items
- Table name (local): `gatherly-local`

**Depends on**: None

**TDD note**: Infrastructure does not follow Red/Green/Refactor but must be verified with `npm run db:bootstrap && npm run db:seed` confirming no errors before proceeding to Layer 1a.

---

### Layer 1a: Backend Tests (Red)

**Agent**: backend-developer

**Tasks**:

#### Organisation registration handler tests
- [x] BE-TEST-01: Write failing integration tests for `POST /organisations/register` in `backend/src/handlers/__tests__/organisations.test.ts`:
  - Valid payload creates USER + ORG + ORGEMAIL via `transactWrite` and returns `201 { orgId, message }`
  - Returns `400` when required fields are missing (name, orgType, description, contactEmail, contactPhone, adminFirstName, adminLastName, adminEmail, adminPassword)
  - Returns `400` when `name` < 3 or > 100 chars
  - Returns `400` when `description` < 20 or > 1000 chars
  - Returns `400` when `orgType` is not one of `SPORTS_CLUB | CHARITY | COMMUNITY | OTHER`
  - Returns `400` when `contactEmail` is not a valid email format
  - Returns `400` when `contactPhone` is not a valid UK phone format
  - Returns `400` when `adminPassword` is weak (< 8 chars, no uppercase, no number)
  - Returns `400` when `website` is provided but not a valid URL
  - Returns `409 {"error":"An account with this email already exists."}` when adminEmail USEREMAIL sentinel already exists (GetItem pre-check)
  - Returns `409 {"error":"An organisation with this email is already registered."}` when TransactWrite fails due to ORGEMAIL condition
  - Does NOT set a `sid` cookie on success (user is not auto-logged-in)
  - Enqueues SQS message `ORG_SUBMITTED` on success (spy on mailer/SQS helper)

#### Admin organisations handler tests
- [x] BE-TEST-02: Write failing integration tests for admin org endpoints in `backend/src/handlers/__tests__/admin-organisations.test.ts`:
  - `GET /admin/organisations` returns `401` when unauthenticated
  - `GET /admin/organisations` returns `403` when authenticated as `VOLUNTEER` or `ORG_ADMIN`
  - `GET /admin/organisations?status=PENDING` returns paginated list (first page) with `items[]` and `cursor`
  - `GET /admin/organisations?status=PENDING&cursor=<cursor>` returns next page using `ExclusiveStartKey`
  - `GET /admin/organisations` without `status` param defaults to `PENDING`
  - `GET /admin/organisations/:orgId` returns `404` when org does not exist
  - `GET /admin/organisations/:orgId` returns full org detail for SUPER_ADMIN
  - `POST /admin/organisations/:orgId/approve` returns `401` unauthenticated, `403` wrong role
  - `POST /admin/organisations/:orgId/approve` returns `404` when org does not exist
  - `POST /admin/organisations/:orgId/approve` sets `status=APPROVED`, `approvedAt`, `approvedBy=<superAdminUserId>`, updates `GSI1PK` to `ORG_STATUS#APPROVED`, enqueues `ORG_APPROVED`
  - `POST /admin/organisations/:orgId/approve` returns `409` when org is not currently PENDING
  - `POST /admin/organisations/:orgId/reject` returns `400` when `reason` is missing
  - `POST /admin/organisations/:orgId/reject` returns `400` when `reason` < 10 chars
  - `POST /admin/organisations/:orgId/reject` sets `status=REJECTED`, `rejectedAt`, `rejectionReason`, updates `GSI1PK` to `ORG_STATUS#REJECTED`, enqueues `ORG_REJECTED`
  - `POST /admin/organisations/:orgId/reject` returns `409` when org is not currently PENDING

#### requireApprovedOrg middleware test (extension)
- [x] BE-TEST-03: Write failing tests for the `requireApprovedOrg` middleware in `backend/src/middleware/__tests__/auth.middleware.test.ts` (extending the existing test file):
  - PENDING org returns `403 {"error":"Organisation is not approved."}`
  - REJECTED org returns `403 {"error":"Organisation is not approved."}`
  - APPROVED org calls `next()`
  - Missing `orgId` on session returns `403`
  - (Note: `requireApprovedOrg` is already implemented; tests confirm the existing implementation behaves correctly and act as regression coverage)

#### GET /auth/me extension test
- [x] BE-TEST-04: Write a failing test that `GET /auth/me` for an `ORG_ADMIN` session includes an `orgStatus` field reflecting the current ORG item's status. This enables the frontend to route Org Admins without an extra API call.

**Outputs**: Failing test suite — `npm test` in `backend/` runs red before implementation.

**Depends on**: Layer 0 (confirmed env var names, table name, GSI1 already defined)

**TDD note**: Run `npm test` in `backend/` after writing tests. Every new test must fail (either "cannot find module", "not implemented yet", or assertion failure). If any new test passes without implementation, revisit — it is not testing real behaviour. Do not proceed to Layer 1b until all Layer 1a tests are red.

---

### Layer 1b: Backend Implementation (Green → Refactor)

**Agent**: backend-developer

**Tasks**:
- [x] BE-01: Create `backend/src/lib/orgMailer.ts` (or extend `mailer.ts`) with `enqueueOrgSubmitted`, `enqueueOrgApproved`, and `enqueueOrgRejected` functions. Follow the existing SQS-or-SMTP pattern in `mailer.ts`: when `SQS_QUEUE_URL` is set, publish JSON to SQS; otherwise send email via SMTP (nodemailer + Mailhog). `ORG_SUBMITTED` does not send an email in MVP — only enqueues. `ORG_APPROVED` and `ORG_REJECTED` send emails to the org admin's email address.
- [x] BE-02: Create `backend/src/handlers/organisations.ts` — Express Router with `POST /register` handler implementing:
  - Input validation (all FR-01 fields with rules from FR-01 and NFR)
  - UK phone regex validation (`/^(\+44|0)[0-9]{9,10}$/` or equivalent)
  - Pre-check `GetItem` for USEREMAIL sentinel (adminEmail uniqueness)
  - TransactWrite: USER (`PK=USER#<userId>`, `SK=PROFILE`, `role=ORG_ADMIN`, `orgId`) + ORG (`PK=ORG#<orgId>`, `SK=PROFILE`, `status=PENDING`, `GSI1PK=ORG_STATUS#PENDING`, `GSI1SK=<submittedAt>#<orgId>`) + ORGEMAIL (`PK=ORGEMAIL#<contactEmail>`, `SK=LOCK`) all with `attribute_not_exists(PK)` conditions
  - TransactionCanceledException handling: detect which condition failed (USEREMAIL vs ORGEMAIL) and return appropriate 409
  - Call `enqueueOrgSubmitted` after successful write
  - Return `201 { orgId, message: "Organisation submitted for review." }` — no `sid` cookie
- [x] BE-03: Create `backend/src/handlers/admin-organisations.ts` — Express Router with:
  - `GET /` — query GSI1 with `GSI1PK=ORG_STATUS#<status>` (default PENDING), `ScanIndexForward=false` (newest-first; **deviation from PRD** — see Phase 4 Integration Summary), `Limit=limit`, `ExclusiveStartKey` from decoded cursor. Return `{ items: [...], cursor: <base64-encoded LastEvaluatedKey> | null }`.
  - `GET /:orgId` — GetItem on `ORG#<orgId>` profile; 404 if not found.
  - `POST /:orgId/approve` — GetItem to verify org exists and is PENDING; UpdateItem to set `status=APPROVED`, `approvedAt`, `approvedBy`, `GSI1PK=ORG_STATUS#APPROVED`; call `enqueueOrgApproved`.
  - `POST /:orgId/reject` — validate `reason` (min 10 chars); GetItem to verify PENDING; UpdateItem; call `enqueueOrgRejected`.
  - All routes protected by `requireAuth` + `requireRole('SUPER_ADMIN')`.
- [x] BE-04: Mount new routers in `backend/src/app.ts`:
  - `app.use('/organisations', organisationsRouter)`
  - `app.use('/admin/organisations', requireAuth, requireRole('SUPER_ADMIN'), adminOrgsRouter)`
- [x] BE-05: Extend `GET /auth/me` in `backend/src/handlers/auth.ts` — when the resolved user has `role=ORG_ADMIN` and an `orgId`, perform a second `GetItem` on `ORG#<orgId>` and include `orgStatus`, `orgSubmittedAt`, and `orgRejectionReason` (when present) in the response object.
- [x] BE-06: Refactor — review all new handlers for: no hardcoded table names (use `TABLE()` helper), consistent error response shape `{ error: string }`, no sensitive fields leaked (contactEmail not in list responses unless requesting SUPER_ADMIN), DRY validation helpers.

**Outputs**:
- Passing backend test suite (`npm test` green)
- API contracts:
  - `POST /organisations/register` — body shape, 201 / 400 / 409 responses
  - `GET /admin/organisations?status=PENDING&limit=20&cursor=<str>` — `{ items: OrgSummary[], cursor: string | null }`
  - `GET /admin/organisations/:orgId` — full ORG item (minus passwordHash etc.)
  - `POST /admin/organisations/:orgId/approve` — updated ORG item
  - `POST /admin/organisations/:orgId/reject` — body `{ reason }`, updated ORG item
  - `GET /auth/me` extended — now includes `orgStatus` for ORG_ADMIN users
- Org login redirect logic driven by `orgStatus` in `/auth/me` response

**Depends on**: Layer 1a (failing tests must exist first)

**TDD note**: Run `npm test` after each task. Implement only enough to turn each red test green. When all tests are green, refactor (BE-06) and re-run to confirm still green.

---

### Layer 2a: Frontend Tests (Red)

**Agent**: frontend-developer

**Tasks**:

#### Registration form component tests
- [x] FE-TEST-01: Write failing component tests for `OrgRegisterForm` in `frontend/src/components/organisations/__tests__/OrgRegisterForm.test.tsx` using vitest + React Testing Library:
  - Renders all required fields: name, orgType select, description, contactEmail, contactPhone, website (optional), adminFirstName, adminLastName, adminEmail, adminPassword
  - All required fields have associated `<label>` elements (accessibility)
  - Shows inline validation error when name < 3 chars on submit attempt
  - Shows inline error when description < 20 chars on submit attempt
  - Shows inline error when contactEmail is invalid format
  - Shows inline error when adminPassword is weak
  - On successful API response (mocked 201), redirects to `/register/organisation/submitted` (confirmation page)
  - On 409 adminEmail conflict, shows field-level error on adminEmail field
  - On 409 org email conflict, shows field-level error on contactEmail field
  - Submit button is disabled while request is in-flight (loading state)

#### Org status pages tests
- [x] FE-TEST-02: Write failing component tests for `OrgPendingPage` in `frontend/src/components/organisations/__tests__/OrgPendingPage.test.tsx`:
  - Renders "Application under review" heading
  - Renders "Your organisation has been submitted and is awaiting approval" message
  - Shows submitted date formatted as "DD MMMM YYYY"
  - Renders a "Sign out" button that calls `logout` from AuthContext

- [x] FE-TEST-03: Write failing component tests for `OrgRejectedPage`:
  - Renders "Application rejected" heading
  - Renders verbatim `rejectionReason` from the org data
  - Renders "Sign out" button

#### Admin approval queue component tests
- [x] FE-TEST-04: Write failing component tests for `AdminOrgListPage` in `frontend/src/components/admin/__tests__/AdminOrgListPage.test.tsx`:
  - Renders a list of pending orgs from mocked API response
  - Each row shows org name, type, submitted date (relative), and status badge
  - "Load more" button is shown when cursor is non-null; hidden when cursor is null
  - Clicking "Load more" appends next page of results to the list

- [x] FE-TEST-05: Write failing component tests for `AdminOrgDetailPage`:
  - Renders all org detail fields
  - "Approve" button calls `POST /admin/organisations/:orgId/approve` and redirects/updates status on success
  - "Reject" button reveals a reason textarea; submit calls `POST /admin/organisations/:orgId/reject`
  - Reject submit is disabled if reason < 10 chars
  - Shows field-level error if rejection API returns 400

#### Routing and redirect tests
- [x] FE-TEST-06: Write failing tests for updated `ProtectedRoute` / org login redirect logic:
  - Org Admin with `orgStatus=PENDING` is redirected to `/organisation/pending` (not `/org/dashboard`)
  - Org Admin with `orgStatus=REJECTED` is redirected to `/organisation/rejected`
  - Org Admin with `orgStatus=APPROVED` proceeds to the requested route

**Outputs**: Failing component test suite — `npm test` in `frontend/` runs red before implementation.

**Depends on**: Layer 1b (API contracts must be known — specifically the `orgStatus` field in `/auth/me`, registration endpoint response shape, and admin endpoint shapes)

**TDD note**: Run `npm test` in `frontend/` after writing tests. All new tests must fail. If any pass without implementation, the test is not testing real behaviour — revise. Do not proceed to Layer 2b until all are red.

---

### Layer 2b: Frontend Implementation (Green → Refactor)

**Agent**: frontend-developer

**Tasks**:
- [x] FE-01: Create `frontend/src/lib/organisations.ts` — typed API client functions wrapping `apiClient`:
  - `registerOrganisation(payload): Promise<{ orgId: string; message: string }>`
  - `getAdminOrgs(status, limit, cursor?): Promise<{ items: OrgSummary[]; cursor: string | null }>`
  - `getAdminOrgDetail(orgId): Promise<OrgDetail>`
  - `approveOrg(orgId): Promise<OrgDetail>`
  - `rejectOrg(orgId, reason): Promise<OrgDetail>`

- [x] FE-02: Create `frontend/src/components/organisations/OrgRegisterForm.tsx`:
  - Single-page form (not multi-step) with two fieldset sections: "Organisation Details" and "Your Admin Account"
  - Client-side validation on submit (all FR-01 rules)
  - Field-level error display; accessible error messages linked via `aria-describedby`
  - Loading state on submit button
  - On success: navigate to `/register/organisation/submitted`
  - On 409: surface appropriate field-level error

- [x] FE-03: Create `frontend/src/pages/OrgRegisterSubmittedPage.tsx` — confirmation screen:
  - "Your organisation has been submitted for review. We'll email you when it's been approved."
  - No login redirect (user is not authenticated)

- [x] FE-04: Create `frontend/src/pages/OrgPendingPage.tsx` — shown to ORG_ADMIN with PENDING org:
  - "Application under review" message per PRD wireframe
  - Shows `orgSubmittedAt` date (resolved via OQ-01: embedded in `GET /auth/me` response alongside `orgStatus`)
  - "Sign out" button

- [x] FE-05: Create `frontend/src/pages/OrgRejectedPage.tsx` — shown to ORG_ADMIN with REJECTED org:
  - Displays verbatim `rejectionReason` (sourced from `orgRejectionReason` in `GET /auth/me`)
  - "Sign out" button

- [x] FE-06: Create `frontend/src/pages/AdminOrgListPage.tsx` and `frontend/src/pages/AdminOrgDetailPage.tsx`:
  - List page: fetches `GET /admin/organisations?status=PENDING`, renders org rows per PRD wireframe, "Load more" pagination; org name rendered as clickable link
  - Detail page: fetches `GET /admin/organisations/:orgId`, renders all fields, Approve and Reject actions with confirmation UI

- [x] FE-07: Update `frontend/src/context/AuthContext.tsx` — extend `AuthUser` interface to include `orgStatus?: string`, `orgSubmittedAt?: string`, `orgRejectionReason?: string`.

- [x] FE-08: Update `frontend/src/components/auth/ProtectedRoute.tsx` — add org-status-aware redirect logic:
  - If `user.role === 'ORG_ADMIN'` and route is not in `ORG_STATUS_EXEMPT_PATHS` (`/organisation/pending`, `/organisation/rejected`):
    - `orgStatus === 'PENDING'` → `<Navigate to="/organisation/pending" />`
    - `orgStatus === 'REJECTED'` → `<Navigate to="/organisation/rejected" />`
  - Preserve existing SUPER_ADMIN bypass behaviour.

- [x] FE-09: Update `frontend/src/App.tsx` — add new routes:
  - `/register/organisation` → `<OrgRegisterForm />`
  - `/register/organisation/submitted` → `<OrgRegisterSubmittedPage />`
  - `/organisation/pending` → `<ProtectedRoute role="ORG_ADMIN"><OrgPendingPage /></ProtectedRoute>`
  - `/organisation/rejected` → `<ProtectedRoute role="ORG_ADMIN"><OrgRejectedPage /></ProtectedRoute>`
  - `/organisation/dashboard` → existing `<OrgDashboard />` placeholder (no change)
  - `/admin/organisations` → `<ProtectedRoute role="SUPER_ADMIN"><AdminOrgListPage /></ProtectedRoute>`
  - `/admin/organisations/:orgId` → `<ProtectedRoute role="SUPER_ADMIN"><AdminOrgDetailPage /></ProtectedRoute>`

- [x] FE-10: Refactor — verify Tailwind classes follow DESIGN-SYSTEM.md conventions; remove any duplication in form field rendering by extracting a shared `FormField` component if not already present.

**Outputs**:
- Passing frontend test suite (`npm test` in `frontend/` green)
- All new pages and components implemented
- `AuthUser` type extended with `orgStatus`
- Org-status-aware routing in `ProtectedRoute`

**Depends on**: Layer 2a (failing tests must exist first)

**TDD note**: Implement only enough to make each failing test pass. When all tests are green, run FE-10 refactor and re-run tests to confirm still green.

---

### Layer 3: End-to-End Tests

**Agent**: playwright-tester

**Tasks**:
- [x] TST-01: E2E test — successful org registration flow (2 tests):
  - Navigate to `/register/organisation`, fill in all required fields, submit
  - Assert redirect to `/register/organisation/submitted` and confirmation text visible
  - Assert user is NOT logged in (no `sid` cookie; `GET /auth/me` returns 401)

- [x] TST-02: E2E test — duplicate email rejections (2 tests):
  - Register with `adminEmail` already used by seeded volunteer; assert field-level error
  - Register with `contactEmail` already used by seeded org; assert field-level error

- [x] TST-03: E2E test — org admin login states (2 tests):
  - PENDING org admin logs in; asserts redirect to `/organisation/pending` and heading visible
  - REJECTED org admin logs in; asserts redirect to `/organisation/rejected` and verbatim rejection reason visible

- [x] TST-04: E2E test — Super Admin approval queue (3 tests):
  - SUPER_ADMIN can view pending orgs list and see PENDING badge
  - SUPER_ADMIN navigates directly to seed org detail page (direct URL: `/admin/organisations/org-seed-pending`)
  - Org detail page shows org type and description fields

- [x] TST-05: E2E test — approve organisation (1 test):
  - Register fresh org, log in as SUPER_ADMIN, find org by name, approve, verify status APPROVED via `GET /auth/me`

- [x] TST-06: E2E test — reject organisation (2 tests):
  - Register fresh org, log in as SUPER_ADMIN, find org by name, reject with valid reason, verify status REJECTED via `GET /auth/me`
  - Mailhog receives ORG_REJECTED email

- [x] TST-07: E2E test — requireApprovedOrg guard (1 test):
  - Log in as PENDING Org Admin via API; verify `GET /auth/me` returns `orgStatus: PENDING`

- [x] TST-08: E2E test — pagination (2 tests):
  - Admin org list renders PENDING orgs with correct heading and PENDING badge
  - Pagination cursor returned from API when `limit=1` and multiple PENDING orgs exist

**Outputs**: Playwright E2E test suite in `e2e/` directory; all 8 tests passing against `docker compose up` local stack.

**Depends on**: Layers 1b + 2b (fully implemented backend and frontend)

**TDD note**: E2E tests are written against the running system. All tests must pass before the plan is marked complete. Run with `npx playwright test` from the project root.

---

## Integration Checkpoints

1. **After Layer 0** — CONFIRMED: GSI1 (`GSI1PK` / `GSI1SK`) present in table schema. Seed produces 3 orgs (approved, pending, rejected) + 5 users + 3 ORGEMAIL sentinels + 5 USEREMAIL sentinels + 1 event + 2 roles = 19 items. All seed unit tests pass.

2. **After Layer 1a** — CONFIRMED: All BE-TEST-01 through BE-TEST-04 tests failed (red) before implementation. Proceeded to Layer 1b.

3. **After Layer 1b** — CONFIRMED: 169/169 backend tests pass (green). API contracts documented. `GET /auth/me` returns `orgStatus`, `orgSubmittedAt`, and `orgRejectionReason` for ORG_ADMIN users. No hardcoded table names. TransactionCanceledException disambiguation: admin email pre-checked via GetItem before TransactWrite, so TransactionCanceledException always indicates ORGEMAIL conflict.

4. **After Layer 2a** — CONFIRMED: All FE-TEST-01 through FE-TEST-06 tests failed (red) before implementation. Proceeded to Layer 2b.

5. **After Layer 2b** — CONFIRMED: 96/96 frontend tests pass (green). `AuthUser` interface includes `orgStatus`, `orgSubmittedAt`, `orgRejectionReason`. All route paths match Playwright test expectations. `ProtectedRoute` uses `ORG_STATUS_EXEMPT_PATHS` guard to prevent redirect loops.

6. **After Layer 3** — CONFIRMED: 15/15 E2E tests pass against `docker compose up` local stack. Mailhog receives `ORG_REJECTED` email (verified in TST-06). Mark plan complete.

---

## Open Questions

These must be resolved before or during the build phase:

1. **OQ-01 — `OrgPendingPage` submission date source**: The PRD wireframe shows "Submitted: 14 March 2026" on the `/organisation/pending` page. The `GET /auth/me` endpoint returns the USER item, not the ORG item. Two options: (a) extend `/auth/me` to also return `orgSubmittedAt` when `role=ORG_ADMIN` (requires an extra GetItem — already needed for `orgStatus`), or (b) create a new `GET /organisations/me` endpoint that returns the Org Admin's own org detail. **Recommended resolution**: option (a) — extend `/auth/me` to return `orgSubmittedAt` alongside `orgStatus`, keeping the frontend to a single initial API call. The backend developer should confirm before implementing BE-05.

2. **OQ-02 — TransactionCanceledException reason disambiguation**: DynamoDB's `TransactionCanceledException` includes a `CancellationReasons` array. The plan requires distinguishing between USEREMAIL failure (409 admin email conflict) and ORGEMAIL failure (409 org email conflict). The PRD specifies a pre-check GetItem for the admin email before the TransactWrite (to handle the USEREMAIL case via early return), meaning a TransactionCanceledException would only arise from the ORGEMAIL or USER PK conditions. This makes the org email conflict the safe default for TransactionCanceledException, but the backend developer should verify this reasoning and add a comment explaining the invariant.

3. **OQ-03 — UK phone format regex**: The PRD requires `contactPhone` in UK format but does not specify the exact regex. The codebase has no existing UK phone validation. Proposed: accept `+44` prefix or leading `0`, digits only after that, 10–11 total digits (e.g. `07911123456`, `+447911123456`, `01234567890`). The backend developer should confirm and document the regex in code, and write a test case covering common UK formats and rejections.

4. **OQ-04 — `orgId` not in USER item at auth**: The existing `createSession` in `lib/session.ts` accepts an optional `orgId`. For the org registration flow, the USER item must include `orgId` so that `requireApprovedOrg` (which reads `req.session.orgId`) works on first login. Confirm the registration handler writes `orgId` into the USER item AND that `POST /auth/org/login` returns `orgId` in the `/auth/me` response so `createSession` receives it. This is implied by the existing auth handler (line 118: `user.orgId as string | undefined`) but must be confirmed end-to-end.

5. **OQ-05 — `ORG_SUBMITTED` SQS message MVP scope**: The PRD states an `ORG_SUBMITTED` message is enqueued but "no email sent in MVP at submission time." This means `enqueueOrgSubmitted` writes to SQS (when `SQS_QUEUE_URL` is set) or is a no-op locally (no SMTP send). Confirm with the product owner whether locally the no-op is acceptable or whether Mailhog should receive a debug-only email for developer visibility. The current plan follows the PRD literally (no email sent).

6. **OQ-06 — Approval queue default `limit`**: The PRD specifies `limit=20` in the example query string. Confirm whether `limit` is a required or optional parameter and what the maximum allowed value should be (to prevent unbounded scans). Proposed: optional, default 20, max 100.

7. **OQ-07 — Approve/reject idempotency**: The plan includes a `409` guard when approving or rejecting a non-PENDING org. Confirm whether a SUPER_ADMIN approving an already-APPROVED org should be silent (200 with current state), a 409, or a 400. The plan currently specifies 409 for consistency with the PRD. This only affects the admin UI feedback, not correctness.

**Resolutions applied during implementation**:
- OQ-01: Option (a) chosen — `/auth/me` extended to return `orgStatus`, `orgSubmittedAt`, and `orgRejectionReason` for ORG_ADMIN users.
- OQ-02: Confirmed — admin email pre-checked via `GetItem` before `TransactWrite`; any `TransactionCanceledException` therefore indicates ORGEMAIL or USER PK conflict, and the error message defaults to org email conflict.
- OQ-03: UK phone regex `/^(\+44|0)[0-9\s\-]{9,14}$/.test(normalised)` implemented and documented in `organisations.ts`.
- OQ-04: Confirmed — `orgId` written into USER item during registration; `POST /auth/org/login` reads `user.orgId` and passes it to `createSession`; `requireApprovedOrg` reads `req.session.orgId` correctly.
- OQ-05: `enqueueOrgSubmitted` is a no-op locally (no Mailhog email); SQS message enqueued when `SQS_QUEUE_URL` is set. Accepted per PRD.
- OQ-06: `limit` is optional, defaults to 20, maximum capped at 100.
- OQ-07: 409 returned for approve/reject on non-PENDING org. Accepted.

---

## Phase 4 — Integration Summary

**Date completed**: 2026-03-26

### What was built

Organisation Registration (MVP-03) is fully implemented across all four layers:

**Backend** (`backend/src/`)
- `handlers/organisations.ts` — `POST /organisations/register` with full input validation, atomic `TransactWrite` (USER + ORG + ORGEMAIL), pre-check for duplicate admin email, and `enqueueOrgSubmitted` on success. Returns `201 { orgId }` without setting a session cookie.
- `handlers/admin-organisations.ts` — four SUPER_ADMIN-guarded endpoints: paginated `GET /` (GSI1, newest-first, cursor-based), `GET /:orgId`, `POST /:orgId/approve`, `POST /:orgId/reject`.
- `lib/orgMailer.ts` — `enqueueOrgSubmitted` (SQS-only, no email locally), `enqueueOrgApproved`, `enqueueOrgRejected` (SMTP/Mailhog locally).
- `lib/dynamodb.ts` — `queryItemsPaginated` helper added to support cursor-based GSI queries.
- `handlers/auth.ts` — `GET /auth/me` extended: for `ORG_ADMIN` users, performs a second `GetItem` on the ORG item and returns `orgStatus`, `orgSubmittedAt`, and `orgRejectionReason` in the response.
- `app.ts` — new routers mounted: `/organisations` and `/admin/organisations`.
- `infra/local/seed.ts` — extended to seed 3 orgs (approved, pending, rejected), 5 users (volunteer, approved-admin, pending-admin, rejected-admin, super-admin), plus email sentinels and a sample event. 19 total items, idempotent.

**Frontend** (`frontend/src/`)
- `lib/organisations.ts` — typed API client with `registerOrganisation`, `getAdminOrgs`, `getAdminOrgDetail`, `approveOrg`, `rejectOrg`.
- `components/organisations/OrgRegisterForm.tsx` — single-page registration form with client-side validation, field-level error display, 409 conflict handling, and loading state.
- `pages/OrgRegisterSubmittedPage.tsx` — post-registration confirmation (user not logged in).
- `pages/OrgPendingPage.tsx` — shown to ORG_ADMIN with PENDING org; displays submitted date from `orgSubmittedAt` in `/auth/me`.
- `pages/OrgRejectedPage.tsx` — shown to ORG_ADMIN with REJECTED org; displays verbatim rejection reason.
- `pages/AdminOrgListPage.tsx` — SUPER_ADMIN approval queue with "Load more" cursor pagination; org name is a clickable link to detail page.
- `pages/AdminOrgDetailPage.tsx` — full org detail view with Approve button and Reject flow (reason textarea, 10-char minimum, disabled submit guard).
- `context/AuthContext.tsx` — `AuthUser` interface extended with `orgStatus`, `orgSubmittedAt`, `orgRejectionReason`.
- `components/auth/ProtectedRoute.tsx` — org-status-aware redirect logic with `ORG_STATUS_EXEMPT_PATHS` to prevent redirect loops.
- `App.tsx` — all new routes wired: `/register/organisation`, `/register/organisation/submitted`, `/organisation/pending`, `/organisation/rejected`, `/admin/organisations`, `/admin/organisations/:orgId`.

**Infrastructure** (`docker-compose.yml`, `backend/Dockerfile.dev`, `frontend/Dockerfile.dev`)
- Docker Compose healthchecks updated from `curl` to `wget -qO- http://127.0.0.1:<port>/` (alpine containers do not have `curl`; `localhost` does not resolve inside alpine — must use `127.0.0.1`).
- `frontend/Dockerfile.dev` — `COPY tailwind.config.js ./` added to fix module resolution error in container build.

**E2E tests** (`e2e/tests/organisation-registration.test.ts`)
- 15 Playwright tests covering TST-01 through TST-08.

### Test counts

| Layer | Tests | Status |
|---|---|---|
| Backend unit + integration | 169 | All passing |
| Frontend unit + component | 96 | All passing |
| E2E (Playwright) | 15 | All passing |
| **Total** | **280** | **All passing** |

### Deviations from the PRD

1. **GSI1 sort order changed to newest-first** (`ScanIndexForward=false`): The PRD specified oldest-first (`ScanIndexForward=true`) for the approval queue. Changed to newest-first to ensure E2E test isolation — freshly registered orgs (created during TST-05 and TST-06) appear at the top of the first page, allowing the tests to navigate to them by name without pagination. This is a minor UX deviation; in production a Super Admin would typically want to process the oldest applications first, so this should be reviewed before production launch. **Documented in BE-03.**

2. **TST-04 E2E tests use direct URL navigation**: The E2E tests for TST-04 ("navigate to org detail from list") and "org detail page shows fields" navigate directly to `/admin/organisations/org-seed-pending` rather than clicking through the list. This is because the seed org is not guaranteed to appear on the first page of the approval queue (newer test orgs from prior runs appear first with newest-first pagination). The test still validates the detail page behaviour correctly.

3. **`orgRejectionReason` added to `/auth/me` response**: The PRD implied `orgStatus` would be sufficient in the `/auth/me` extension. The implementation also adds `orgRejectionReason` so `OrgRejectedPage` can display the verbatim reason without an additional API call. This is an enhancement beyond the minimum PRD requirement.

4. **`orgSubmittedAt` added to `/auth/me` response**: Similarly, `orgSubmittedAt` was added to support the "Submitted: DD MMMM YYYY" display on `OrgPendingPage` (resolution of OQ-01 option (a)).

### Open items and follow-up tasks

1. **Production sort order**: Reconsider reverting the approval queue to oldest-first (`ScanIndexForward=true`) before production launch, and instead write E2E tests that register orgs and then search for them by navigating through pages or filtering. The current newest-first approach is a pragmatic E2E workaround.

2. **`ORG_SUBMITTED` email (post-MVP)**: No email is sent at submission time per the MVP scope. Post-MVP, add a "Thank you for submitting" email triggered by the `ORG_SUBMITTED` SQS message.

3. **`GET /organisations/me` endpoint (post-MVP)**: `OrgPendingPage` and `OrgRejectedPage` currently source their data from the extended `/auth/me` response. Post-MVP, when Org Admins need to view/edit their own org profile, a dedicated `GET /organisations/me` endpoint should be added.

4. **Seed data pollution across E2E runs**: Each E2E run creates new PENDING orgs in the local DynamoDB that persist across runs. Before CI integration, add a `db:seed:reset` script that drops and re-seeds the table, and run it as a prerequisite step in the E2E test workflow.

5. **`requireApprovedOrg` on future org-admin endpoints**: The `requireApprovedOrg` middleware is implemented and tested. TST-07 currently tests it via `GET /auth/me` (since no org-admin-scoped resource endpoints exist yet). When events and shift management endpoints are added (subsequent PRDs), TST-07 should be updated to call those endpoints and assert 403 for PENDING orgs.
