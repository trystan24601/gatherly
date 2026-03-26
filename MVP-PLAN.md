# Gatherly MVP Plan

> Living document. Last updated: 2026-03-26.
> This plan is based on the events-dog reference implementation and encodes all lessons learned from that build.

---

## 1. Product Scope

### 1.1 MVP Feature List

The goal of MVP is a platform that a single real UK sports club or community charity can use end-to-end: register their organisation, create events with named volunteer roles, publish those events, accept registrations from volunteers, manually approve or decline them, and give volunteers a dashboard showing their commitments.

Every feature below has a binary "done" definition. If any criterion is missing, the feature is not done.

---

#### MVP-01 — Platform Infrastructure & Local Dev Stack

**Rationale:** Zero features work without this. This is built first and never skipped.

**Done when:**
- `docker compose up` starts api, frontend, dynamodb-local, dynamodb-admin, ses-local (Mailhog), localstack (SQS, S3) within 60 seconds
- `npm run db:bootstrap` creates the single DynamoDB table with all GSIs in the local environment without errors
- `npm run db:seed` populates one approved org, one volunteer user, one published event with roles — idempotent (safe to run twice)
- `GET /health` returns `{"status":"ok"}` from the running API
- `.env.local.example` documents every required variable with safe placeholder values
- The CI pipeline (lint → typecheck → unit tests → build → E2E) runs green on a pull request

---

#### MVP-02 — Authentication (all user types)

**Rationale:** Nothing works without authenticated sessions. All three login paths (volunteer, org admin, super admin) are required for MVP because E2E tests depend on all three.

**Done when:**
- A visitor can register a Volunteer account; they are immediately logged in with an `httpOnly` `sid` cookie and redirected to `/dashboard`
- A Volunteer can log in at `/login` with email + password; an Org Admin at `/org/login`; a Super Admin at `/admin/login`
- All three logins create a DynamoDB SESSION item with the correct TTL and GSI6 index keys
- Logout deletes the SESSION item immediately and clears the cookie
- An unauthenticated request to any protected endpoint returns `401`
- A volunteer session calling an org-admin endpoint returns `403`
- Password reset flow: request sends a token (viewable in Mailhog locally); confirm with valid token updates password and deletes all sessions for that user
- Rate limiting: 5 failed logins from the same IP within 15 minutes blocks further attempts for 15 minutes
- Super Admin accounts are created only via the CLI provisioning script — there is no UI path

---

#### MVP-03 — Organisation Registration & Super Admin Approval

**Rationale:** Organisations are the supply side. Without at least one approved org, there are no events.

**Done when:**
- An anonymous user can complete the org registration form (org details + admin account fields) and submit
- Submission creates a USER (role=ORG_ADMIN) and ORG (status=PENDING) atomically via a 3-item TransactWrite (USER + ORG + ORGEMAIL sentinel). Partial writes are impossible.
- Duplicate org contact email or duplicate admin email returns `409` with a field-level error; no records are written
- After submission the user is NOT auto-logged-in; they are shown a confirmation screen
- An Org Admin who logs in while their org is PENDING is routed to `/organisation/pending`; an Org Admin with a REJECTED org is routed to `/organisation/rejected` showing the verbatim rejection reason
- A Super Admin can view the PENDING approval queue at `/admin/organisations`, open an org's detail, and approve or reject (rejection requires a reason of at least 10 characters)
- Approve action: sets status=APPROVED, enqueues ORG_APPROVED SQS message (org admin receives approval email); org admin's next login goes directly to `/organisation/dashboard`
- Reject action: sets status=REJECTED, enqueues ORG_REJECTED SQS message with verbatim reason; org admin's next login goes to `/organisation/rejected`
- All ORG_ADMIN-scoped API endpoints return `403 {"error":"Organisation is not approved."}` for PENDING/REJECTED orgs

---

#### MVP-04 — Event Creation & Organisation Dashboard

**Rationale:** An approved org with no way to create events has nothing to offer volunteers.

**Done when:**
- An approved Org Admin can create an event at `/organisation/events/new` with required fields (title, type, date, start/end time, venue, postcode)
- The event is created in DRAFT status; `orgId` is taken from the session — never from the request body
- Date validation: past dates return `400`; UK postcode regex enforced; endTime must be after startTime
- The Org Admin can edit any DRAFT event field at `/organisation/events/:eventId`; attempting to edit a non-DRAFT event returns `409`
- `GET /organisation/events` returns all events for the org sorted by date descending with fill rate (filledCount / headcount across roles)
- The org dashboard at `/organisation/dashboard` shows the events table with title, date, status badge, fill rate; an empty state when no events exist

---

#### MVP-05 — Event Roles (Role Management)

**Rationale:** Events without roles cannot accept volunteer registrations.

**Done when:**
- An Org Admin can add one or more roles to a DRAFT event: name, description (optional), headcount (1–500), shiftStart, shiftEnd (HH:MM), skillIds (optional array), locationNotes (optional)
- Roles are stored as `EVENT#<eventId>` / `ROLE#<roleId>` items (same partition as the event)
- An Org Admin can edit or delete roles on a DRAFT event
- Deleting a role with existing PENDING or CONFIRMED registrations is blocked with a `409`
- `GET /events/:eventId` (org view) returns the event plus its roles array in a single response

---

#### MVP-06 — Event Lifecycle (Publish & Cancel)

**Rationale:** A draft event is invisible to volunteers. Publish is the action that makes value real.

**Done when:**
- An Org Admin can publish a DRAFT event that has at least one role; publishing sets `status=PUBLISHED`, `publishedAt=now()`, and updates GSI3PK from `EVENT_STATUS#DRAFT` to `EVENT_STATUS#PUBLISHED`
- Attempting to publish an event with zero roles returns `400`
- An Org Admin can cancel a PUBLISHED event (not a COMPLETED event); cancellation sets `status=CANCELLED`, `cancelledAt=now()`, removes the event from the volunteer discovery feed
- A COMPLETED event cannot be edited, cancelled, or re-published

---

#### MVP-07 — Event Discovery (Volunteer Browse)

**Rationale:** Volunteers need a way to find events. Without discovery there is no demand side.

**Done when:**
- `GET /events` (VOLUNTEER only) returns all PUBLISHED and ACTIVE events with `eventDate >= today`, sorted by date ascending, with cursor-based pagination (20 per page)
- Response includes: eventId, title, orgName, eventTypeName, eventDate, startTime, endTime, city, status, totalRoles, totalHeadcount, totalFilledCount
- Filter parameters supported: `typeId`, `city` (case-insensitive substring, minimum 2 chars), `from` (date), `to` (date), `limit` (max 50), `cursor`
- An ORG_ADMIN session calling `GET /events` returns `403`
- The volunteer discovery page at `/events` renders event cards with skeleton loaders, empty states (no events / no matching filters), and a "Load more" button
- Filter bar: event type dropdown, city free-text, date range pickers; filters update URL query params; 300ms debounce on text inputs

---

#### MVP-08 — Volunteer Registration (submit, confirm, decline, cancel)

**Rationale:** Registration is the core transaction of the platform. Everything above exists to enable this.

**Done when:**
- `POST /events/:eventId/roles/:roleId/registrations` (VOLUNTEER only) runs pre-flight checks in this exact order:
  1. Event exists and is PUBLISHED or ACTIVE (404 if not)
  2. Role exists and is OPEN (404 if not)
  3. Duplicate check: volunteer has no PENDING/CONFIRMED registration for this role (409 "You already have a registration for this role.")
  4. Shift overlap check: volunteer has no PENDING/CONFIRMED registration with an overlapping shift on the same event (409 "You already have a registration for an overlapping shift on this event.")
  5. Capacity check: PENDING+CONFIRMED count for this role < headcount (409 "This role is full.")
- On success: creates REGISTRATION item (status=PENDING) using a conditional PutItem with `attribute_not_exists(PK)`; returns `201 Created`
- Capacity model: PENDING registrations count against headcount (conservative / correct for manual approval)
- `POST .../confirm` (ORG_ADMIN): uses TransactWrite to atomically set status=CONFIRMED and increment filledCount; condition `filledCount < headcount` prevents overflow; returns `409` if registration is not PENDING or if capacity would be exceeded
- `POST .../decline` (ORG_ADMIN): sets status=DECLINED, optional `declineReason`; no filledCount change; returns `409` if not PENDING
- `DELETE .../registrations/:registrationId` (VOLUNTEER): cancels PENDING → CANCELLED without filledCount change; cancels CONFIRMED → CANCELLED with TransactWrite decrementing filledCount; blocks cancellation on COMPLETED events (`409`)
- `GET /events/:eventId/registrations` (ORG_ADMIN): returns all registrations grouped by role; `volunteerEmail` is never included in any API response
- `GET /me/registrations` (VOLUNTEER): returns own registrations with enriched event/role/org fields

---

#### MVP-09 — Volunteer Profile & Skills

**Rationale:** Without a profile, volunteers are anonymous and organisations cannot vet them.

**Done when:**
- `PATCH /me/profile` allows a volunteer to update: firstName, lastName, bio (max 500 chars), phone, locationTown, locationPostcode (UK postcode regex), travelRadiusMiles (5/10/25/50/999), availabilityDays (string array), availabilityTimeOfDay (MORNING/AFTERNOON/EVENING/FLEXIBLE), isDiscoverable (boolean)
- Profile completeness score (0–100%) is computed client-side from 8 optional fields; never persisted to DynamoDB
- `PUT /me/skills` replaces the volunteer's full skill set with a diff reconcile: adds new VOLUNTEER_SKILL items, deletes removed ones, ignores unchanged; max 30 skills enforced server-side
- `GET /skills` returns all active skills grouped by category; eligible for a 5-minute in-memory cache
- `POST /admin/skills` and `PATCH /admin/skills/:skillId` (SUPER_ADMIN): manage the skill catalogue
- A deactivated skill held by a volunteer remains on their profile with a "No longer available" label; it is not selectable by new volunteers
- `PATCH /me/settings/password` and `PATCH /me/settings/email` (VOLUNTEER): change credential fields; password change requires current password; email change requires current password

---

### 1.2 Explicitly Out of Scope for MVP

The following are documented here so they are never accidentally picked up in sprint planning:

- Volunteer waitlist (join when role is full)
- On-day check-in (QR code / name search)
- 48-hour pre-event reminder emails
- Volunteer impact record (hours logged, certificates)
- Coordinator-side volunteer browse and search
- Organisation profile editing post-approval
- Inviting Org Members (multiple org users)
- Event templates / duplication
- Multi-day events
- Map-based venue selection or distance-based event filtering
- Profile photo / avatar upload
- Social login (Google / Apple)
- Multi-factor authentication
- Email verification on registration or email change
- Forced session invalidation on password change
- Background check / DBS status
- Bulk admin operations

---

### 1.3 Post-MVP Roadmap

Features confirmed for the backlog, in rough priority order. Each needs a PRD before sprint planning.

#### POST-01 — Shareable Event Link

**Why it matters:** This is the cold-start bypass. Organisers will have existing volunteer communities in WhatsApp groups and email lists before Occasion HQ has a volunteer pool of its own. A clean, shareable event URL lets them bring their own volunteers onto the platform on day one — each share is an organic acquisition event. This is how the volunteer pool grows before network effects kick in.

**What it is:** A persistent, human-readable public URL for each published event (e.g. `occasionhq.com/events/redhill-10k-2026`) that:
- Renders the full event detail (name, date, roles, spots remaining) without requiring login
- Prompts unauthenticated visitors to create a free account to apply for a role — with a single-field email entry that pre-fills the registration form
- Includes a copy-to-clipboard button and native mobile share sheet trigger (`navigator.share`) so organisers can share directly from the event dashboard
- Shows an Open Graph preview (event name, date, org name, a role count line) so the link unfurls correctly in WhatsApp, iMessage, Slack, and Twitter/X
- Works on the organiser side too — the event dashboard has a "Share this event" action that copies the URL and optionally opens the native share sheet

**Dependencies:** MVP-06 (event lifecycle), MVP-07 (event discovery). The public event URL is already part of the discovery feed — this feature adds the share action and Open Graph meta tags.

---

#### POST-02 — Lift-share Matching

**Why it matters:** The single most differentiating feature. No current volunteer platform addresses transport. A confirmed volunteer who can't get to the event is a no-show — the fill rate the organiser sees is a lie. Lift-share matching uses data the platform already has (confirmed volunteer postcodes, event location, shift start time) to propose travel groups. See the Occasion Report for the full algorithm design, privacy model, and data schema.

**What it is:** Opt-in per-event. Confirmed volunteers can register as a driver (with seats) or passenger. The platform matches on: same event, departure window overlap, route compatibility (bearing from origin to venue), and detour cost. Matches are proposed — both parties must accept before contact details are revealed. Full privacy model: origin town shown, full postcode never shared.

**Dependencies:** MVP-08 (volunteer registration — confirmed status required for matching), GSI9, new LIFTSHARE item types. See OCCASION-REPORT.md for full technical spec.

---

#### POST-03 — Volunteer Impact Record & Hour Certificates

**Why it matters:** Highest-performing monetisation add-on. Volunteers increasingly need documented evidence of service hours (university applications, citizenship, employer CSR). Charities need grant-ready impact reports. Neither is served by any current platform. This is the Professional tier gate.

**What it is:** Automatic hour logging when an event transitions to COMPLETED. Per-volunteer PDF certificate ("Jane Smith contributed 34 hours across 5 events"). Per-organisation impact report PDF for grant applications and board reporting.

---

#### POST-04 — Skill-based Volunteer Matching Notifications

**Why it matters:** Moves the platform from pull (volunteer browses) to push (platform notifies). When an event is published, the matching worker queries volunteers whose skills align with the event's roles and notifies them. Requires GSI7 (volunteer-by-skill reverse index). See OCCASION-REPORT.md for the full matching algorithm.

---

#### POST-05 — Supplier Matching

**Why it matters:** Extends the orchestration model beyond volunteers. When an event is published with supplier needs (timing chips, first aid, catering), the platform surfaces matched local suppliers. Requires new SUPPLIER item type, GSI8, and the supplier registration flow.

---

#### POST-06 — Event Templates & AI-Assisted Setup

**Why it matters:** Reduces the activation barrier for new organisers. "I'm running a 10K" → pre-populated role structure in 60 seconds. Dramatically reduces time-to-first-published-event.

---

#### POST-07 — Sponsor Placement

**Why it matters:** Third revenue layer (after subscriptions and supplier listings). Local businesses with regional activation budgets want to reach event audiences. Requires sponsor profile type, event sponsor slot items, and a two-sided confirmation flow.

### 1.3 Success Metric for MVP

"We are ready for a real organisation to use this" means:
1. A real UK sports club or charity can self-register, get approved, create a published event with roles, and share the events URL with their volunteer community
2. At least 5 volunteers can register for roles, receive PENDING status, and be confirmed or declined by the org admin
3. All 9 MVP features pass their E2E tests in CI with zero flakes over 3 consecutive runs
4. No critical accessibility failures (axe-core clean on all main pages)
5. The platform handles a burst of 50 concurrent volunteer registrations without DynamoDB conditional check failures or 5xx errors

---

## 2. Tech Stack & Architecture

### 2.1 Monorepo Structure

```
gatherly/
├── frontend/                React + Vite + TypeScript + Tailwind CSS v3 + shadcn/ui
│   ├── src/
│   │   ├── components/      Reusable UI components (shadcn base + custom)
│   │   ├── pages/           Route-level page components
│   │   ├── hooks/           Custom React hooks (useAuth, useEvents, etc.)
│   │   ├── context/         React context providers (SessionContext)
│   │   ├── lib/             Utility functions, API client, constants
│   │   └── __tests__/       Vitest + Testing Library unit tests
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
├── backend/                 Node.js 20 + TypeScript (Express locally, Lambda in prod)
│   ├── src/
│   │   ├── handlers/        Lambda handler entry points (one per route group)
│   │   ├── domain/          Business logic — pure functions, no I/O
│   │   ├── services/        Orchestration layer (calls domain + db)
│   │   ├── db/              DynamoDB access layer
│   │   │   ├── client.ts    DynamoDBDocumentClient singleton
│   │   │   ├── index.ts     Shared helpers: getItem, putItem, updateItem, transactWrite, queryByGSI
│   │   │   ├── auth/        userRepository, sessionRepository
│   │   │   ├── org/         orgRepository
│   │   │   ├── events/      eventRepository, roleRepository
│   │   │   └── registrations/ registrationRepository
│   │   ├── lib/             config, logger, httpError, sqs, ses
│   │   └── __tests__/       Vitest unit tests
│   ├── scripts/             provision-super-admin.ts, etc.
│   └── package.json
├── infra/
│   ├── terraform/
│   │   ├── bootstrap/       One-time state backend (S3 + DynamoDB lock table)
│   │   ├── modules/         api-gateway, cloudfront, dynamodb, lambda, observability,
│   │   │                    oidc, s3, secrets, ses, sqs, waf
│   │   └── environments/    dev/, staging/, prod/
│   └── local/               bootstrap.ts (table + GSIs), seed.ts (demo data)
├── e2e/
│   ├── tests/               Playwright test files, one per feature area
│   └── utils/               db.ts (putTestItem, getTestItem, queryTestByGSI)
├── .github/workflows/       ci.yml, deploy-staging.yml, deploy-prod.yml
├── docker-compose.yml
├── package.json             Root npm workspaces config
├── .env.local.example
├── .gitignore
└── MVP-PLAN.md              (this file)
```

### 2.2 Frontend Stack

| Decision | Choice | Rationale |
|---|---|---|
| Framework | React 18 + Vite + TypeScript | Fast HMR, excellent TypeScript support, industry standard |
| Styling | Tailwind CSS v3 | Utility-first; avoids CSS-in-JS overhead; consistent with design decisions from events-dog |
| Component library | shadcn/ui | Radix UI primitives, accessible by default, copy-paste ownership model |
| Routing | React Router v6 | Declarative routes, protected route wrappers, loader pattern |
| State management | React Context (session) + React Query (server state) | React Query eliminates manual loading/error/cache state; Context is sufficient for auth |
| API client | Typed fetch wrapper in `lib/api.ts` | No external library needed; explicit type contracts catch drift early |
| Unit testing | Vitest + Testing Library | Fast, Jest-compatible API, native Vite integration |
| E2E testing | Playwright | See Section 5 |
| Design principle | Mobile-first | All layouts start at 320px; filter bars collapse to drawers on mobile |

### 2.3 Backend Stack

| Decision | Choice | Rationale |
|---|---|---|
| Runtime | Node.js 20.x TypeScript | Lambda supports it natively; ts-node for local dev |
| Local server | Express (wraps Lambda handlers) | Identical handler code runs locally and in Lambda; no code branching |
| DB SDK | `@aws-sdk/lib-dynamodb` (DocumentClient) | **Never use `@aws-sdk/client-dynamodb` directly** — see Lessons Learned |
| Password hashing | bcryptjs, cost factor 12 | Defensive against GPU cracking; 12 is the minimum acceptable |
| Session store | DynamoDB (no Redis) | Single data store; revocable; TTL-based cleanup; no additional infra |
| Validation | Zod (schema-first) | Runtime validation + TypeScript types from the same definition; catches contract drift |
| Logging | Structured JSON to stdout | Lambda pipes stdout to CloudWatch; requestId, userId, action, durationMs, statusCode |
| Error handling | `HttpError` class (status + message) | Express error middleware maps to HTTP response; Lambda handler wraps in try/catch |

### 2.4 DynamoDB Single-Table Design

#### Table definition
- Table name: `gatherly-<environment>` (e.g., `gatherly-local`, `gatherly-prod`)
- Billing mode: PAY_PER_REQUEST (on-demand)
- Point-in-time recovery: enabled on staging and prod
- Deletion protection: enabled on prod only
- TTL attribute: `expiresAt` (epoch seconds — used for sessions, password reset tokens, rate limit counters)

#### Key conventions
All keys use entity-type prefixes separated by `#`. This makes `PK` / `SK` values self-documenting and prevents accidental key collisions between entity types.

| Entity | PK | SK |
|---|---|---|
| User | `USER#<userId>` | `PROFILE` |
| Session | `SESSION#<sessionId>` | `PROFILE` |
| Password reset token | `PWRESET#<token>` | `PROFILE` |
| Login attempt counter | `LOGINATTEMPT#<ip>` | `PROFILE` |
| Organisation | `ORG#<orgId>` | `PROFILE` |
| Org email sentinel | `ORGEMAIL#<email>` | `LOCK` |
| Event | `EVENT#<eventId>` | `PROFILE` |
| Event role | `EVENT#<eventId>` | `ROLE#<roleId>` |
| Registration | `REG#<registrationId>` | `META` |
| Skill catalogue | `SKILL#<skillId>` | `PROFILE` |
| Volunteer skill | `USER#<userId>` | `SKILL#<skillId>` |
| Event types | `EVENT_TYPES` | `TYPE#<typeId>` |

#### GSI allocation (9 GSIs, all project ALL attributes)

| GSI | PK | SK | Purpose |
|---|---|---|---|
| GSI1 | `GSI1PK` | `GSI1SK` | Organisation approval queue by status (`ORG_STATUS#<status>` / `<createdAt>`) |
| GSI2 | `GSI2PK` | `GSI2SK` | Events by org (`ORG#<orgId>` / `<eventDate>#<eventId>`) |
| GSI3 | `GSI3PK` | `GSI3SK` | Event discovery by status (`EVENT_STATUS#<status>` / `<eventDate>#<eventId>`) |
| GSI4 | `GSI4PK` | `GSI4SK` | Event discovery by type (`EVENT_TYPE#<typeId>` / `<eventDate>#<eventId>`) |
| GSI5 | `GSI5PK` | `GSI5SK` | Volunteer registrations by user (`USER#<userId>` / `<eventDate>#<eventId>#<roleId>`) |
| GSI6 | `GSI6PK` | `GSI6SK` | Sessions by user (`USER#<userId>` / `SESSION#<sessionId>`) — used for bulk delete on password reset |
| GSI7 | `GSI7PK` | `GSI7SK` | Registrations by event (`EVENT#<eventId>` / `REG#<registrationId>`) |
| GSI8 | `GSI8PK` | `GSI8SK` | Skill catalogue by category (`SKILL_CATEGORY#<category>` / `<name>`) |
| GSI9 | `GSI9PK` | `GSI9SK` | Email lookup for users (`EMAIL#<email>` / `USER#<userId>`) — used for login and email uniqueness |

> Note: The events-dog implementation used GSI1 for registration event roster and GSI5 for volunteer registrations. The assignment above is the cleaned-up, non-conflicting version. Before writing any repository code, confirm the GSI number against this table.

#### Critical DynamoDB rules (from hard-won experience — do not deviate)

1. **Always use `ExpressionAttributeNames` for reserved words.** `status`, `name`, `type`, `value`, `count` are all DynamoDB reserved words. Never write `SET status = :status` — always write `SET #status = :status` with `ExpressionAttributeNames: { '#status': 'status' }`. Omitting this causes a silent validation error that is extremely hard to debug.

2. **Only pass `ExpressionAttributeNames` when it is non-empty.** If you pass an empty `ExpressionAttributeNames: {}` object to the SDK it throws a `ValidationException`. The `updateItem` helper in `db/index.ts` must guard against this: spread the field only when `Object.keys(expressionAttributeNames).length > 0`.

3. **Never pass an empty string to a `begins_with` GSI SK condition.** If `gsiSKPrefix` is an empty string, the `queryByGSI` helper must omit the `begins_with` clause entirely. An empty string `begins_with` throws a DynamoDB validation error at runtime.

4. **Always use `@aws-sdk/lib-dynamodb`** (`DynamoDBDocumentClient`, `GetCommand`, `PutCommand`, `UpdateCommand`, `TransactWriteCommand`). Never import from `@aws-sdk/client-dynamodb` for application data writes — the raw client requires manual type marshalling (`{ S: 'value' }` syntax) and silently writes the wrong format when mixed with the DocumentClient.

5. **Store org name as `name`, not `orgName`.** The ORG item attribute is `name`. Any seed data, repository code, or API response that uses `orgName` for the ORG item itself is wrong. (The registration item denormalises `orgName` from the ORG item — that field name on the registration item is `orgName`. The source is `org.name`.)

6. **Seed data field names must exactly match the TypeScript interface.** If `OrgItem` has `name: string`, the seed must write `name`, not `orgName`. Mismatches produce `undefined` values that pass TypeScript type checking but fail at runtime.

7. **filledCount is incremented on CONFIRM, not on submit.** PENDING registrations count against capacity (for the duplicate/overlap/capacity pre-flight checks) but do not increment `filledCount`. `filledCount` only changes on confirm (increment) and on confirmed-cancel (decrement). All TransactWrite operations on filledCount must include a capacity condition: `filledCount < headcount` on increment, `filledCount > 0` on decrement.

### 2.5 Infrastructure (Terraform, AWS)

All resources in `eu-west-2` (London). Three environments: dev, staging, prod — each from the same modules with per-environment variable overrides.

**AWS services:**
- Lambda (Node.js 20.x) — stateless handlers; no local state
- API Gateway HTTP API — CORS configured for frontend origin; routes to Lambda
- DynamoDB — single table, on-demand billing
- S3 — frontend static assets (one bucket) + file storage (one bucket, private)
- CloudFront — serves frontend from S3; HTTPS only; custom domain + ACM certificate
- SQS standard queue + DLQ — async email dispatch; max receive count 3 before DLQ
- SES — transactional email; verified domain; sending identity
- Secrets Manager — session signing key, SES credentials
- WAF (basic) — rate limiting on API Gateway; common attack pattern blocking (prod only)
- IAM — least-privilege roles per Lambda function; OIDC federation for GitHub Actions (no long-lived credentials)
- CloudWatch — structured logs, Lambda error rate alarm (>1% over 5 minutes), dashboard per environment
- AWS Budgets — alert at 80% of monthly threshold (£50/month dev, £200/month prod)

**Terraform layout:**
```
infra/terraform/
├── bootstrap/          One-time S3 state bucket + DynamoDB lock table
├── modules/
│   ├── api-gateway/
│   ├── cloudfront/
│   ├── dynamodb/       Table + GSIs + PITR + TTL + deletion protection flag
│   ├── lambda/         Function + IAM role + log group
│   ├── observability/  CloudWatch dashboard + alarms + budget
│   ├── oidc/           GitHub Actions OIDC provider + role
│   ├── s3/             Frontend bucket + file storage bucket
│   ├── secrets/        Secrets Manager secrets
│   ├── ses/            SES domain identity + DKIM
│   ├── sqs/            Standard queue + DLQ
│   └── waf/            Web ACL + rate limit rule
└── environments/
    ├── dev/            main.tf, variables.tf, terraform.tfvars
    ├── staging/        main.tf, variables.tf, terraform.tfvars
    └── prod/           main.tf, variables.tf, terraform.tfvars
```

### 2.6 Local Dev Stack

`docker-compose.yml` at the project root starts all local dependencies with `docker compose up`:

| Service | Image | Port | Purpose |
|---|---|---|---|
| `api` | Local build (Node.js 20) | 3001 | Express backend with HMR via `tsx watch` |
| `frontend` | Local build (Vite) | 5173 | React app with Vite HMR |
| `dynamodb-local` | `amazon/dynamodb-local:latest` | 8000 | Local DynamoDB (`-sharedDb -inMemory`) |
| `dynamodb-admin` | `aaronshaf/dynamodb-admin:latest` | 8001 | Web UI to inspect table data |
| `ses-local` | `mailhog/mailhog:latest` | 1025/8025 | SMTP capture + web UI |
| `localstack` | `localstack/localstack:latest` | 4566 | SQS + S3 (SERVICES: sqs,s3) |

The `api` service reads `DYNAMODB_ENDPOINT=http://dynamodb-local:8000` from the compose environment. In production this variable is unset — the SDK uses the default AWS endpoint. This single environment variable is the only difference between local and cloud database access.

---

## 3. Key Lessons from events-dog

These are specific, verified bugs and patterns discovered during the events-dog build. Each one caused at least one broken test or broken feature. Apply all of them from day one.

### 3.1 DynamoDB

**ExpressionAttributeNames for reserved words (most impactful bug)**
`status`, `name`, `type`, `count`, `value`, `key`, `size` are DynamoDB reserved words. Every `UpdateExpression` that touches any of these fields must use `#alias` and declare it in `ExpressionAttributeNames`. Forgetting this produces a `ValidationException` at runtime that is initially opaque. The fix: create a company convention that *all* UpdateExpressions use `#` aliases for all attribute names, not just known reserved words.

**Never pass empty `ExpressionAttributeNames`**
The SDK throws `ValidationException: ExpressionAttributeNames must not be empty` if you pass `{}`. The `updateItem` helper must guard: only include the field in the SDK call if `Object.keys(names).length > 0`. See `backend/src/db/index.ts` for the working pattern.

**Never pass empty string to `begins_with`**
If the GSI SK prefix is an empty string, omit the `begins_with` condition entirely. An empty string passed to `begins_with` throws a DynamoDB error at runtime that Playwright retries can mask (the retry gets a different error, making the root cause invisible).

**`@aws-sdk/lib-dynamodb` only**
Using `@aws-sdk/client-dynamodb` and `DynamoDBDocumentClient` in the same codebase creates silent type marshalling bugs. The rule is simple: import only from `@aws-sdk/lib-dynamodb`. The `DocumentClient` wrapper handles all type marshalling automatically.

**Org item field: `name` not `orgName`**
The ORG DynamoDB item stores the org name in an attribute called `name`. The registration item denormalises this as `orgName` (the field on the REGISTRATION item). These are different: `org.name` → copied into `registration.orgName`. Getting this backwards causes `orgName: undefined` in registration responses.

**Seed data must match the TypeScript interface exactly**
`infra/local/seed.ts` items must use the same field names as the TypeScript interfaces in `src/db/`. If `OrgItem` has `name: string`, the seed must write `name`, not `orgName`. Type errors in seed files are not caught by tsc because the seed uses raw `putItem` calls. Write a runtime validation step or use the typed interface constructors.

**TransactWrite capacity conditions**
`confirmRegistrationTransact` must include `filledCount < headcount` as a condition on the role update, otherwise concurrent approvals can drive filledCount above headcount. `cancelRegistrationTransact` (for CONFIRMED cancellations) must include `filledCount > :zero` to prevent negative counts.

### 3.2 Registration service pre-flight check order

The correct order in `submitRegistration` is:
1. Event exists and is PUBLISHED/ACTIVE
2. Role exists and is OPEN
3. Duplicate check (volunteer already registered for this role)
4. Shift overlap check (volunteer has a conflicting shift on the same event)
5. Capacity check (PENDING+CONFIRMED >= headcount)

This order matters for test acceptance criteria. In events-dog the overlap check (3b) ran before the capacity check (4). Test AC-04 (full role) requires that capacity is checked, but if overlap check runs first and the volunteer has no overlapping registrations, the capacity check must still fire. Tests written expecting a specific error message for a specific check will fail silently if the check order is wrong.

### 3.3 E2E testing

**Each test that submits must use a unique volunteer session**
Never reuse the same volunteer across sequential tests that accumulate state. If test A signs volunteer up for a role, and test B tries to sign the same volunteer up for another role with an overlapping shift, test B gets a 409 for the wrong reason. Use one volunteer per independent test scenario; create fresh users in `beforeAll` or inline.

**Never share mutable roles across tests in the same file**
A role seeded with `headcount: 1` that gets a PENDING registration in test A is "full" for test B. Each test that requires a fresh role state (especially capacity tests) must either seed its own role inline or use a role with sufficient headcount.

**Seed data `name` not `orgName`**
E2E tests that seed ORG items directly to DynamoDB must use `name: 'Org Name'`, not `orgName: 'Org Name'`. The `orgName` field does not exist on the ORG item; it is a field on the REGISTRATION item. This mismatch causes `orgName: undefined` in API responses and assertion failures in tests that check `body.orgName`.

**Playwright retries can mask root cause**
If a test posts a registration and gets a 5xx, Playwright's default retry submits again. The second attempt gets a `409 "already have a registration"` because the first attempt (despite 5xx) wrote to DynamoDB. The test appears to fail on a 409, but the real bug was the 5xx. Set `retries: 0` while debugging flakiness; only add retries when the test suite is stable.

**Single runner before shards**
Run Playwright with a single worker (`--workers=1`) until the full suite is green. Sharding causes different test files to run concurrently; if they share any DynamoDB state (same seed event, same volunteer), they interfere. Add shards only after confirming full isolation.

**`db:seed` must be idempotent**
The seed script is run in CI before every E2E run. If it uses `PutItem` without `attribute_not_exists` conditions, running it twice writes duplicate items or fails on condition checks. Use upsert semantics: `PutCommand` without condition for seed items (they are identified by deterministic IDs), and document that re-seeding replaces demo data.

### 3.4 CI

**Single E2E runner in CI**
`playwright.config.ts` must set `workers: 1` in the CI config block. Add `fullyParallel: false`. Only move to shards after the test suite has been green for at least 5 consecutive CI runs.

**Bootstrap before seed**
CI must run `db:bootstrap` then `db:seed` in that order with the DynamoDB endpoint env var set. The bootstrap creates the table and GSIs; seed fails without them. Add an explicit health check wait for DynamoDB Local before running bootstrap.

**Artifact upload always**
Upload the Playwright HTML report (`playwright-report/`) as a CI artifact with `if: always()`. This is the only reliable way to debug flaky tests without local reproduction.

### 3.5 API design

**Overlap check runs before capacity check in registration service**
The events-dog implementation checks overlap before capacity. This is correct and intentional: a volunteer who already has a conflicting shift should be told about the conflict regardless of whether there is capacity. However, tests must be written with this check order in mind. Test AC for "full role" must use a volunteer with no other registrations on that event, otherwise the overlap check fires first with a different error.

**Never expose `volunteerEmail` in API responses**
The REGISTRATION item stores `volunteerEmail` (needed for notification emails). The DTO type explicitly omits it: `Omit<RegistrationItem, 'volunteerEmail' | ...>`. Org admins see volunteer names but not emails in the roster response. This is a deliberate privacy decision.

---

## 4. Build Order (Layer by Layer)

Each layer has a dependency. Do not start a layer until its dependencies are complete and green.

### Layer 0: Repository Setup

**Agent:** infrastructure-engineer
**Depends on:** nothing
**Tasks:**
- [ ] INF-00: Initialise git repo at `/home/trystanm2/dev/gatherly` with npm workspaces monorepo (`frontend`, `backend`, `e2e` workspaces)
- [ ] INF-01: ESLint + Prettier config (shared root config, workspace overrides); TypeScript tsconfig.json per workspace (strict mode, path aliases)
- [ ] INF-02: Write `docker-compose.yml` (api, frontend, dynamodb-local, dynamodb-admin, ses-local, localstack) exactly as specified in Section 2.6
- [ ] INF-03: Write `.env.local.example` documenting all required variables
- [ ] INF-04: Write `infra/local/bootstrap.ts` — creates DynamoDB table + all 9 GSIs; idempotent
- [ ] INF-05: Write `infra/local/seed.ts` — seeds demo org (using `name:` not `orgName:`), volunteer user, published event with roles; idempotent upsert semantics
- [ ] INF-06: Write `.github/workflows/ci.yml` (lint → typecheck → unit tests → build → E2E; single E2E worker; artifact upload always)
- [ ] INF-07: Write `.github/workflows/deploy-staging.yml` and `deploy-prod.yml` shells (implementation after infra apply)
- [ ] INF-08: Write Terraform modules (dynamodb, lambda, api-gateway, s3, cloudfront, sqs, ses, secrets, oidc, waf, observability) and per-environment roots

**Definition of done:** `docker compose up` starts all services; `npm run db:bootstrap && npm run db:seed` succeeds; `GET /health` returns 200; `terraform validate` passes on dev environment

---

### Layer 1a: Backend Tests (Red) — Auth + Org + Core DB

**Agent:** backend-developer
**Depends on:** Layer 0 (table name, GSI names, env vars)
**Tasks:**
- [ ] BE-TEST-01: Failing unit tests for `userRepository` (create user, find by email via GSI9, find by id)
- [ ] BE-TEST-02: Failing unit tests for `sessionRepository` (create, get, delete, delete-all-for-user via GSI6)
- [ ] BE-TEST-03: Failing unit tests for `orgRepository` (create org + sentinel transact, get by id, update status, list pending via GSI1)
- [ ] BE-TEST-04: Failing unit tests for `authService` (register, login, logout, password-reset flow, rate limiting)
- [ ] BE-TEST-05: Failing unit tests for `orgService` (register org atomic write, approve, reject)
- [ ] BE-TEST-06: Failing unit tests for `authMiddleware` (RBAC: correct 401/403 for all role combinations)

**TDD note:** Run tests — they must ALL FAIL before proceeding to Layer 1b.

---

### Layer 1b: Backend Implementation (Green) — Auth + Org

**Agent:** backend-developer
**Depends on:** Layer 1a (failing tests)
**Tasks:**
- [ ] BE-01: `backend/src/db/client.ts` — DynamoDBDocumentClient singleton; reads `DYNAMODB_ENDPOINT` from env; uses `@aws-sdk/lib-dynamodb` only
- [ ] BE-02: `backend/src/db/index.ts` — shared helpers: getItem, putItem, deleteItem, updateItem (with ExpressionAttributeNames guard), transactWrite, queryByPK, queryByGSI (with empty-string prefix guard)
- [ ] BE-03: `backend/src/db/auth/userRepository.ts` and `sessionRepository.ts`
- [ ] BE-04: `backend/src/db/org/orgRepository.ts` (3-item transact: USER + ORG + ORGEMAIL sentinel)
- [ ] BE-05: `backend/src/services/authService.ts` (register, login, logout, password reset, bcrypt cost 12, rate limiting)
- [ ] BE-06: `backend/src/services/orgService.ts` (register org, approve, reject, list pending)
- [ ] BE-07: `backend/src/handlers/auth.ts`, `backend/src/handlers/org.ts` — Lambda-compatible handlers + Express router wrapper
- [ ] BE-08: `backend/src/lib/authMiddleware.ts` — session lookup from DynamoDB, RBAC enforcement, org-status gate
- [ ] BE-09: `backend/scripts/provision-super-admin.ts` — CLI script

**Definition of done:** All BE-TEST-01 through BE-TEST-06 tests pass; no test is skipped.

---

### Layer 2a: Backend Tests (Red) — Events + Registration + Profile

**Agent:** backend-developer
**Depends on:** Layer 1b (auth middleware, org service, DB helpers)
**Tasks:**
- [ ] BE-TEST-07: Failing unit tests for `eventRepository` and `roleRepository`
- [ ] BE-TEST-08: Failing unit tests for `registrationRepository` (create, get by id, get by event via GSI7, get by volunteer via GSI5, confirmTransact with filledCount increment, cancelTransact with filledCount decrement, updateStatus)
- [ ] BE-TEST-09: Failing unit tests for `registrationService` (submitRegistration — all 5 pre-flight checks in correct order; confirmRegistration; declineRegistration; cancelRegistration; getEventRoster; getVolunteerRegistrations)
- [ ] BE-TEST-10: Failing unit tests for `profileService` (update profile fields, update skills diff, change password, change email)
- [ ] BE-TEST-11: Failing unit tests for `skillRepository` (catalogue CRUD, volunteer skill diff)
- [ ] BE-TEST-12: Failing unit tests for `eventService` (create event, edit draft, publish — requires at least one role, cancel)
- [ ] BE-TEST-13: Failing unit tests for `discoveryService` (GSI3 + GSI4 query, post-read city filter, cursor pagination)

---

### Layer 2b: Backend Implementation (Green) — Events + Registration + Profile

**Agent:** backend-developer
**Depends on:** Layer 2a (failing tests)
**Tasks:**
- [ ] BE-10: `eventRepository.ts`, `roleRepository.ts`, `skillRepository.ts`
- [ ] BE-11: `registrationRepository.ts` — confirmRegistrationTransact with `filledCount < headcount` condition; cancelRegistrationTransact with `filledCount > :zero` condition
- [ ] BE-12: `registrationService.ts` — pre-flight checks in order: event check, role check, duplicate check, overlap check, capacity check
- [ ] BE-13: `profileService.ts` — profile update, skills diff (TransactWrite for ≤25 ops, batched for larger diffs), password change, email change
- [ ] BE-14: `eventService.ts` — create (DRAFT), edit (DRAFT only), publish (requires ≥1 role, updates GSI3PK), cancel
- [ ] BE-15: `discoveryService.ts` — dual GSI3 query (PUBLISHED + ACTIVE), BatchGet enrichment, city post-filter, cursor pagination
- [ ] BE-16: All remaining handlers (events, registrations, profile, skills, discovery)

**Definition of done:** All BE-TEST-07 through BE-TEST-13 pass; API contracts are documented and match the PRD response shapes.

---

### Layer 3a: Frontend Tests (Red)

**Agent:** frontend-developer
**Depends on:** Layer 2b (API contracts finalised)
**Tasks:**
- [ ] FE-TEST-01: Failing component tests for auth forms (RegisterForm, LoginForm, OrgLoginForm, PasswordResetForm) — validation behaviour, submit handler calls, error display
- [ ] FE-TEST-02: Failing component tests for OrgRegistrationForm — multi-section form, field-level errors
- [ ] FE-TEST-03: Failing component tests for EventCard, EventFilters, DiscoveryPage — filter state, empty state, load more
- [ ] FE-TEST-04: Failing component tests for RegistrationButton / RoleCard — PENDING badge, confirm/decline actions
- [ ] FE-TEST-05: Failing component tests for VolunteerDashboard — registration list, status badges, cancel action
- [ ] FE-TEST-06: Failing component tests for ProfileEditForm — completeness score calculation (client-side, 8 optional fields)
- [ ] FE-TEST-07: Failing component tests for SkillsPicker — toggle behaviour, max 30 cap display, deactivated skill label
- [ ] FE-TEST-08: Failing component tests for OrgAdminApprovalQueue — table render, approve/reject actions
- [ ] FE-TEST-09: Failing component tests for RegistrationsManagementPage — grouped-by-role roster, confirm/decline buttons

---

### Layer 3b: Frontend Implementation (Green)

**Agent:** frontend-developer
**Depends on:** Layer 3a (failing tests)
**Tasks:**
- [ ] FE-01: `lib/api.ts` — typed fetch wrapper with cookie credentials; base URL from `VITE_API_BASE_URL`; consistent error shape
- [ ] FE-02: `context/SessionContext.tsx` — loads `/auth/me` on mount; provides userId, role, orgId; route guards (ProtectedRoute, RoleRoute)
- [ ] FE-03: Auth pages: `/register`, `/login`, `/org/login`, `/admin/login`, `/forgot-password`, `/reset-password`
- [ ] FE-04: Org registration pages: `/register/organisation`, `/register/organisation/submitted`, `/organisation/pending`, `/organisation/rejected`
- [ ] FE-05: Super Admin pages: `/admin/organisations`, `/admin/organisations/:orgId`
- [ ] FE-06: Org dashboard and event management: `/organisation/dashboard`, `/organisation/events/new`, `/organisation/events/:eventId`
- [ ] FE-07: Event discovery: `/events` — filter bar (event type dropdown, city input, date range), event cards, skeleton loaders, empty states, load-more pagination, mobile-responsive (filter bar collapses to bottom sheet on mobile)
- [ ] FE-08: Volunteer registration flow: `/events/:eventId` — role cards with register button; PENDING/CONFIRMED state badges; `/dashboard` — registration list with cancel actions
- [ ] FE-09: Volunteer profile: `/profile/edit`, `/profile/skills`, `/settings/account`
- [ ] FE-10: Org admin registration management: `/org/events/:eventId/registrations` — roster grouped by role, confirm/decline per registration

**Definition of done:** All FE-TEST-01 through FE-TEST-09 pass; all routes accessible without TypeScript errors; mobile layout verified at 375px viewport.

---

### Layer 4: E2E Tests (Playwright)

**Agent:** playwright-tester
**Depends on:** Layers 2b + 3b (full system running)
**Tasks:**
- [ ] TST-01: Auth E2E — volunteer register → login → logout; org admin login → routing by status; super admin login
- [ ] TST-02: Org registration E2E — register org → pending screen; super admin approves → org admin routed to dashboard
- [ ] TST-03: Event creation E2E — approved org admin creates event → adds role → publishes
- [ ] TST-04: Event discovery E2E — volunteer sees published event in feed; filter by type and city works
- [ ] TST-05: Registration E2E — volunteer signs up → PENDING badge shown; org admin confirms → CONFIRMED badge; volunteer cancels CONFIRMED registration
- [ ] TST-06: Registration rejection E2E — org admin declines registration → decline reason shown to volunteer
- [ ] TST-07: Capacity E2E — role fills up → subsequent volunteer gets "role is full" 409
- [ ] TST-08: Duplicate/overlap guard E2E — second registration for same role returns 409; overlapping shift returns 409
- [ ] TST-09: Profile E2E — volunteer updates profile, adds skills, completeness score updates
- [ ] TST-10: Password reset E2E — request reset, retrieve token from Mailhog (or DynamoDB Admin), set new password, old session invalidated
- [ ] TST-11: Accessibility checks — axe-core assertions on all main pages (login, discovery, event detail, dashboard, registration management)

**Definition of done:** All 11 TST tasks pass with `workers: 1`; 0 flakes over 3 consecutive CI runs; Playwright HTML report uploaded as CI artifact.

---

## 5. E2E Testing Strategy

### 5.1 File structure

One test file per feature domain. Each file is entirely self-contained — it creates all its own seed data in `beforeAll` and never relies on data created by another test file.

```
e2e/
├── tests/
│   ├── auth/
│   │   ├── volunteer-auth.spec.ts
│   │   ├── org-auth.spec.ts
│   │   └── password-reset.spec.ts
│   ├── org-registration/
│   │   └── org-registration.spec.ts
│   ├── events/
│   │   ├── event-creation.spec.ts
│   │   └── event-discovery.spec.ts
│   ├── registrations/
│   │   ├── registration.spec.ts       (happy path + capacity + duplicate/overlap)
│   │   └── manual-approval.spec.ts    (confirm + decline + cancel)
│   └── profile/
│       └── profile.spec.ts
└── utils/
    ├── db.ts                          (putTestItem, getTestItem, queryTestByGSI)
    ├── unique.ts                      (generates unique IDs per test run)
    └── fixtures.ts                    (common seed helpers: seedOrg, seedVolunteer, seedEvent)
```

### 5.2 Seed data conventions

**Use a unique tag per test file run:**
```typescript
const tag = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
```
All IDs and email addresses in the seed are derived from `tag`. This prevents collisions between concurrent runs (if shards are ever added) and makes cleanup trivial (filter by tag prefix).

**ORG items must use `name:`, not `orgName:`:**
```typescript
await putTestItem({
  PK: `ORG#${orgId}`,
  SK: 'PROFILE',
  entityType: 'ORG',
  orgId,
  name: 'Test Org',      // CORRECT
  // orgName: 'Test Org' // WRONG — this field does not exist on the ORG item
  status: 'APPROVED',
  ...
});
```

**Session items must include GSI6 keys:**
```typescript
await putTestItem({
  PK: `SESSION#${sessionId}`,
  SK: 'PROFILE',
  entityType: 'SESSION',
  sessionId,
  userId,
  role: 'VOLUNTEER',
  createdAt: now,
  expiresAt: Math.floor(Date.now() / 1000) + 86400,
  GSI6PK: `USER#${userId}`,
  GSI6SK: `SESSION#${sessionId}`,
});
```

**One volunteer per test that submits a registration:**
Tests that test capacity or conflict behaviour must use separate volunteer accounts. Never reuse `volunteerSessionId` across tests that leave PENDING registrations behind, because a later test in the same file might hit the duplicate-check guard.

**Non-overlapping roles for concurrent-registration tests:**
When testing that a volunteer can sign up for two roles on the same event, give the roles non-overlapping shift windows. The full role (headcount=1) used in the capacity test must have a shift that does not overlap with the open role used in the happy-path test.

### 5.3 Playwright configuration

```typescript
// playwright.config.ts
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,   // Must be false until suite is stable
  workers: process.env.CI ? 1 : 2,
  retries: process.env.CI ? 0 : 1,   // No retries in CI — find the bug, fix it
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: process.env.FRONTEND_BASE_URL ?? 'http://localhost:5173',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
});
```

**Set `retries: 0` in CI.** Retries in CI mask root causes. If a POST returns 5xx and Playwright retries, the retry gets 409 (duplicate registration from the first attempt's write). The test "fails on 409" but the real bug was the 5xx. Fix the 5xx; do not add retries to hide it.

### 5.4 Anti-patterns to never repeat

| Anti-pattern | Consequence | Rule |
|---|---|---|
| Reusing a volunteer with state across sequential tests | Duplicate/overlap 409 from a previous test's PENDING registration | One volunteer per independent test scenario |
| Seeding ORG item with `orgName:` | `org.name` is `undefined`; all downstream enrichment returns `"Unknown"` | Always use `name:` on ORG items |
| Shared mutable role (headcount=1) across tests | First test fills the slot; second test gets "role is full" 409 | Seed separate roles or use sufficient headcount |
| `retries > 0` in CI | Hides root cause 5xx behind misleading 409 | `retries: 0` in CI always |
| `workers > 1` before stable | Test isolation failures from concurrent writes to shared data | `workers: 1` until suite is green for 5 runs |
| Empty string passed to `begins_with` via `queryByGSI` | DynamoDB `ValidationException` at runtime | `queryByGSI` must guard against empty-string prefix |

---

## 6. Repository Setup Checklist

Step-by-step commands to initialise the gatherly repo from scratch.

### Step 1 — Git and workspace setup

```bash
cd /home/trystanm2/dev/gatherly
git init
git branch -M main

# Root package.json (npm workspaces)
cat > package.json << 'EOF'
{
  "name": "gatherly",
  "private": true,
  "workspaces": ["frontend", "backend", "e2e"],
  "scripts": {
    "test": "npm run test --workspaces --if-present",
    "lint": "npm run lint --workspaces --if-present",
    "typecheck": "npm run typecheck --workspaces --if-present",
    "build": "npm run build --workspaces --if-present"
  },
  "engines": { "node": ">=20.0.0", "npm": ">=10.0.0" }
}
EOF
```

### Step 2 — TypeScript and ESLint config (root)

```bash
npm install --save-dev typescript@5 eslint@9 @typescript-eslint/eslint-plugin \
  @typescript-eslint/parser prettier eslint-config-prettier

# Root tsconfig.base.json — extended by each workspace
cat > tsconfig.base.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "skipLibCheck": true
  }
}
EOF
```

### Step 3 — Backend workspace

```bash
mkdir -p backend/src/{handlers,domain,services,db/{auth,org,events,registrations},lib}
mkdir -p backend/scripts backend/__tests__

cd backend
npm init -y
npm install @aws-sdk/lib-dynamodb @aws-sdk/client-dynamodb \
  express bcryptjs zod uuid
npm install --save-dev typescript tsx @types/node @types/express \
  @types/bcryptjs vitest @vitest/coverage-v8 supertest @types/supertest

# backend/tsconfig.json
cat > tsconfig.json << 'EOF'
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src/**/*", "scripts/**/*"]
}
EOF
```

### Step 4 — Frontend workspace

```bash
cd ..
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install tailwindcss@3 @tailwindcss/forms postcss autoprefixer \
  react-router-dom@6 @tanstack/react-query
npm install --save-dev @testing-library/react @testing-library/jest-dom \
  @testing-library/user-event vitest jsdom @vitest/coverage-v8 \
  @axe-core/react

npx tailwindcss init -p
npx shadcn-ui@latest init
```

### Step 5 — E2E workspace

```bash
cd ..
mkdir e2e && cd e2e
npm init -y
npm install --save-dev @playwright/test @aws-sdk/lib-dynamodb \
  @aws-sdk/client-dynamodb bcryptjs @types/bcryptjs

# playwright.config.ts
cat > playwright.config.ts << 'EOF'
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: process.env.CI ? 1 : 2,
  retries: process.env.CI ? 0 : 1,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: process.env.FRONTEND_BASE_URL ?? 'http://localhost:5173',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
});
EOF
```

### Step 6 — docker-compose.yml (project root)

Create `docker-compose.yml` as specified in Section 2.6. Key points:
- `api` depends on `dynamodb-local` and `ses-local`; reads `DYNAMODB_ENDPOINT=http://dynamodb-local:8000`
- `dynamodb-local` uses `-sharedDb -inMemory` flags
- `localstack` sets `SERVICES: sqs,s3`
- All services have `restart: unless-stopped` except DynamoDB Local
- `api` has a healthcheck against `GET /health`
- `localstack` has a healthcheck against `/_localstack/health`

### Step 7 — .env.local.example

```
# Required — copy to .env.local and fill in marked values
DYNAMODB_TABLE_NAME=gatherly-local
DYNAMODB_ENDPOINT=http://localhost:8000
AWS_REGION=eu-west-2
AWS_ACCESS_KEY_ID=local
AWS_SECRET_ACCESS_KEY=local
SQS_QUEUE_URL=http://localhost:4566/000000000000/gatherly-local-queue
SQS_DLQ_URL=http://localhost:4566/000000000000/gatherly-local-dlq
SES_FROM_ADDRESS=noreply@gatherly.local
SMTP_HOST=localhost
SMTP_PORT=1025
SESSION_SECRET=dev-secret-min-32-chars-change-in-prod
API_PORT=3001
NODE_ENV=development

# Frontend (Vite — prefix with VITE_)
VITE_API_BASE_URL=http://localhost:3001
```

### Step 8 — .gitignore

```
node_modules/
dist/
.env.local
.env.*.local
*.env
playwright-report/
test-results/
coverage/
.terraform/
*.tfstate
*.tfstate.backup
.terraform.lock.hcl
```

### Step 9 — GitHub Actions CI workflow

Create `.github/workflows/ci.yml` with the following structure (based on events-dog `ci.yml` with these corrections applied):
- Single E2E worker: `npx playwright test --workers=1`
- `retries: 0` in playwright.config.ts for CI
- Bootstrap runs before seed; both use explicit env vars
- Artifact upload with `if: always()`
- Chromium only (`npx playwright install --with-deps chromium`)
- `concurrency: group: ci-${{ github.ref }}` with `cancel-in-progress: true`

Jobs: `lint-typecheck` → `unit-tests-frontend` + `unit-tests-backend` (parallel) → `build` → `e2e`

### Step 10 — Verify local stack

```bash
# From project root
cp .env.local.example .env.local
docker compose up -d

# Wait for DynamoDB
sleep 5

# Bootstrap and seed (from backend workspace)
npm run db:bootstrap --workspace=backend
npm run db:seed --workspace=backend

# Health check
curl http://localhost:3001/health
# Expected: {"status":"ok"}

# Browse DynamoDB Admin UI
# http://localhost:8001

# Browse Mailhog
# http://localhost:8025
```

---

## 7. Open Questions

These must be resolved before or during implementation. Each has a recommended default.

| # | Question | Recommended default |
|---|---|---|
| OQ-01 | Is the `gatherly.co.uk` domain verified with SES for staging? | Use `gatherly.local` in staging until domain verification is complete; Mailhog catches all emails locally |
| OQ-02 | Should event types be seeded at bootstrap or managed via admin API? | Seed a fixed set at bootstrap (Running, Cycling, Walking, Community, Charity, Other); admin management is post-MVP |
| OQ-03 | What is the correct GSI number for the email lookup (USER by email)? | GSI9 as defined in this plan; validate against all other GSI usages before writing repository code |
| OQ-04 | Is `filledCount` on the role item updated lazily or transactionally on every status change? | Transactionally on CONFIRM and CONFIRMED-CANCEL only; PENDING does not change filledCount |
| OQ-05 | Should the org admin approval queue be paginated by default, or show all pending orgs? | Paginated (20 per page, cursor-based) even if the queue starts small; sets the right pattern from day one |
| OQ-06 | Does password reset invalidate all sessions or only the current session? | All sessions (bulk delete via GSI6); consistent with the PRD |
| OQ-07 | What is the bcrypt cost factor in CI (affects E2E speed)? | Cost factor 4 in tests (as seen in events-dog E2E), cost factor 12 in production |

---

## 8. Integration Checkpoints

| After layer | Verify |
|---|---|
| Layer 0 | `docker compose up` starts cleanly; bootstrap and seed succeed; CI pipeline file is valid YAML; `terraform validate` passes |
| Layer 1a | All BE-TEST-01 through BE-TEST-06 fail with "cannot find module" or "function not found" errors — not passing, not erroring on test infrastructure |
| Layer 1b | All BE-TEST-01 through BE-TEST-06 pass; `GET /health`, `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `POST /auth/organisation/register`, `POST /admin/organisations/:orgId/approve` all return correct status codes against the running stack |
| Layer 2a | All BE-TEST-07 through BE-TEST-13 fail cleanly |
| Layer 2b | All backend tests pass; API contracts documented in code match PRD response shapes; no hardcoded table names (all read from `config.dynamodbTableName`) |
| Layer 3a | All FE-TEST-01 through FE-TEST-09 fail cleanly (components not yet implemented) |
| Layer 3b | All frontend tests pass; all routes accessible; no TypeScript errors; `npm run build` succeeds |
| Layer 4 | All 11 TST tasks pass with `workers: 1`; 0 flakes over 3 consecutive CI runs; Playwright report uploaded as artifact; axe-core assertions pass on all main pages |

---

## 9. The Single Most Important Lesson

**Always use `ExpressionAttributeNames` for every attribute name in every DynamoDB `UpdateExpression`, not just the ones you know are reserved words.**

The root cause of the most time-consuming bugs in events-dog was a DynamoDB reserved word collision — `status`, `name`, `type` — that produced a `ValidationException` with a non-obvious error message, especially in the context of Lambda where the stack trace pointed to the wrong layer. The fix is architectural: establish a team convention that all UpdateExpression attribute names use `#` aliases, always, unconditionally. The cost is two extra lines per update call. The benefit is never spending four hours debugging a DynamoDB ValidationException again.
