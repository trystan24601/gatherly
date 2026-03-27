# Implementation Plan: Event Creation & Organisation Dashboard

> PRD: `.claude/prd/PRD-event-creation.md`
> GitHub Issue: [#4 Event Creation & Organisation Dashboard](https://github.com/trystan24601/gatherly/issues/4)

---

## Phase 1 — PRD Analysis

### 1.1 System Overview

Event Creation is MVP-04. It lets an approved Org Admin create, view, and edit
events for their organisation. Events are created in DRAFT status and remain
invisible to volunteers until published (covered by the Event Lifecycle PRD).
The dashboard is the organisation's primary management view: a paginated table of
all events with fill-rate metrics and status badges. Security is enforced by
always sourcing `orgId` from the authenticated session, never from request body.

### 1.2 Functional Requirements

- **FR-01** Create Event — `POST /organisation/events`; creates an EVENT item with `status=DRAFT` and `orgId` from session; validates all required fields; stores GSI3 keys for status-based queries.
- **FR-02** Validation Rules — past date → 400; `endTime <= startTime` → 400; invalid UK postcode → 400; missing required field → 400.
- **FR-03** Edit Draft Event — `PATCH /organisation/events/:eventId`; partial update; 409 if not DRAFT; 404 if not found or wrong org.
- **FR-04** Get Single Event (Org View) — `GET /organisation/events/:eventId`; returns event profile + roles array.
- **FR-05** List Org Events — `GET /organisation/events?limit=20&cursor=<cursor>`; sorted by eventDate descending; includes fill-rate per event.
- **FR-06** Organisation Dashboard — React page at `/organisation/dashboard`; events table with status badges; empty state; "Create event" CTA.

### 1.3 Non-Functional Requirements

- **Security**: `orgId` always from session middleware; ownership check `event.orgId === req.session.orgId` on every event-scoped endpoint.
- **Performance**: Create event < 1 second; list query uses GSI3 (no table scan).
- **Accessibility**: Date/time inputs have accessible labels; errors announced by screen readers.
- **Scalability**: Cursor pagination on the list endpoint.

### 1.4 System Boundaries

- **DynamoDB** (single-table `gatherly-local`) — EVENT item type; GSI3 already defined (`GSI3PK`, `GSI3SK` attributes already in `bootstrap.ts`).
- **Express backend** — new `/organisation/events` router; new `/organisation/dashboard` data endpoint.
- **React frontend** — new pages at `/organisation/events/new`, `/organisation/dashboard`; replaces the current `OrgDashboard` placeholder in `App.tsx`.
- **Auth middleware** — `requireAuth`, `requireRole('ORG_ADMIN')`, and `requireApprovedOrg` already implemented and ready to compose.
- **`queryItemsPaginated`** — already available in `lib/dynamodb.ts`; used for the paginated list endpoint.

---

## Architecture Overview

Event Creation extends the existing Express + DynamoDB + React platform following
identical patterns to the Organisation Registration feature. The backend gains a
new `orgEventsRouter` mounted at `/organisation/events` under the triple middleware
guard (`requireAuth`, `requireRole('ORG_ADMIN')`, `requireApprovedOrg`). EVENT
items live in the shared DynamoDB single table; `PK=EVENT#<eventId>`, `SK=PROFILE`
with `GSI3PK=EVENT_STATUS#DRAFT` / `GSI3SK=<eventDate>#<eventId>` for status-based
queries (GSI3 is already defined in `bootstrap.ts`). The org-scoped list access
pattern (all events for a given org) requires a dedicated GSI — either GSI4 keyed
on `orgId` or a filter expression on GSI3 (see Open Questions OQ-01). The frontend
replaces the `OrgDashboard` placeholder with a real `OrgDashboardPage` and adds an
`OrgEventCreatePage` at `/organisation/events/new`. Both pages consume the new
REST endpoints through the existing `apiClient`. All local development runs against
DynamoDB Local via `docker compose up`; no new Docker services are required.

---

## Domain Model

### Entities (DynamoDB single-table)

| Entity | PK | SK | Key attributes |
|---|---|---|---|
| EVENT | `EVENT#<eventId>` | `PROFILE` | `eventId`, `orgId`, `title`, `eventTypeId`, `eventDate` (ISO date), `startTime` (HH:MM), `endTime` (HH:MM), `venueName`, `venueAddress`, `city`, `postcode`, `description?`, `maxVolunteers?`, `status` (DRAFT\|PUBLISHED\|CANCELLED\|COMPLETED), `createdAt`, `GSI3PK=EVENT_STATUS#<status>`, `GSI3SK=<eventDate>#<eventId>`, `GSI4PK=ORG#<orgId>`, `GSI4SK=<eventDate>#<eventId>` |
| ROLE (read-only in this PRD) | `EVENT#<eventId>` | `ROLE#<roleId>` | `roleId`, `eventId`, `name`, `capacity`, `filledCount` |

### Access Patterns

| Pattern | Key |
|---|---|
| Get single event | `GetItem PK=EVENT#<eventId>, SK=PROFILE` |
| Get roles for event | `Query PK=EVENT#<eventId>, SK begins_with ROLE#` |
| List events by org (paginated, date desc) | `Query GSI4 PK=ORG#<orgId>, ScanIndexForward=false` |
| List events by status (lifecycle PRD) | `Query GSI3 PK=EVENT_STATUS#<status>` |

---

## Layers

### Layer 0: Infrastructure (additive only)

**Agent**: infrastructure-engineer

**Tasks**:
- [x] INF-01: Verify GSI3 and GSI4 are defined in `backend/infra/local/bootstrap.ts`. GSI3 (`GSI3PK`, `GSI3SK`) is already present. GSI4 (`GSI4PK`, `GSI4SK`) must be confirmed present — add if missing. Update `AttributeDefinitions` and `GlobalSecondaryIndexes` in `bootstrap.ts` if GSI4 is absent.
- [x] INF-02: Add an EVENT seed item to `backend/infra/local/seed.ts` for the approved org (`org-demo-runners`), ensuring the item uses the final GSI3 and GSI4 key schema confirmed in INF-01. The existing seed already contains a minimal event item (`event-demo-fun-run`) — verify its GSI keys are aligned with the schema defined in this plan and update if needed.
- [x] INF-03: Document any new env vars in `.env.example` (none expected — the existing `DYNAMODB_TABLE_NAME` and `DYNAMODB_ENDPOINT` are sufficient).
- [x] INF-04: Confirm `docker compose up` starts cleanly and `npm run db:bootstrap && npm run db:seed` succeeds with the updated schema.

**Outputs**:
- Confirmed DynamoDB attribute names for GSI4: `GSI4PK`, `GSI4SK`
- Confirmed event item key schema: `PK=EVENT#<eventId>`, `SK=PROFILE`, `GSI3PK=EVENT_STATUS#<status>`, `GSI3SK=<eventDate>#<eventId>`, `GSI4PK=ORG#<orgId>`, `GSI4SK=<eventDate>#<eventId>`
- Seed event item under `org-demo-runners` that integration tests can rely on
- No new Docker services required

**Depends on**: None

**TDD note**: No Terraform in this project. Run `npm run db:bootstrap && npm run db:seed` inside the Docker environment to verify the table and seed data are healthy. Confirm `docker compose up` starts all services before proceeding.

---

### Layer 1a: Backend Tests (Red)

**Agent**: backend-developer

**Tasks**:

#### Validation helper unit tests
- [x] BE-TEST-01: Write failing unit tests for `backend/src/lib/eventValidation.ts` (to be created):
  - `validatePostcode(value)` returns `true` for `SW1A 1AA`, `EC1A 1BB`, `W1A 0AX`; returns `false` for `sw1a1aa`, `INVALID`, `12345`, empty string
  - `isDateInFuture(dateStr)` returns `true` for today and future ISO dates; returns `false` for yesterday
  - `isEndTimeAfterStartTime(start, end)` returns `true` for `09:00` / `17:00`; returns `false` for `17:00` / `09:00` and `09:00` / `09:00`

#### Create event integration tests
- [x] BE-TEST-02: Write failing integration tests for `POST /organisation/events`:
  - Valid payload → `201` with event body containing `eventId`, `status='DRAFT'`, `orgId` matching session org (not body)
  - `orgId` in request body is silently ignored; event assigned to session org (AC-02)
  - Missing `title` → `400 {"error":"title is required."}`
  - Missing `eventTypeId` → `400 {"error":"eventTypeId is required."}`
  - Missing `eventDate` → `400 {"error":"eventDate is required."}`
  - Missing `startTime` → `400 {"error":"startTime is required."}`
  - Missing `endTime` → `400 {"error":"endTime is required."}`
  - Missing `venueName` → `400 {"error":"venueName is required."}`
  - Missing `venueAddress` → `400 {"error":"venueAddress is required."}`
  - Missing `city` → `400 {"error":"city is required."}`
  - Missing `postcode` → `400 {"error":"postcode is required."}`
  - Past `eventDate` → `400 {"error":"Event date must be in the future."}`
  - `endTime` before `startTime` → `400 {"error":"End time must be after start time."}`
  - Invalid postcode → `400 {"error":"Please enter a valid UK postcode."}`
  - `title` > 150 chars → `400`
  - `description` > 2000 chars → `400`
  - `maxVolunteers` = 0 → `400`; `maxVolunteers` = 10001 → `400`
  - Unauthenticated → `401`
  - Authenticated as VOLUNTEER → `403`
  - Authenticated as ORG_ADMIN with PENDING org → `403`

#### Edit event integration tests
- [x] BE-TEST-03: Write failing integration tests for `PATCH /organisation/events/:eventId`:
  - Valid partial update on own DRAFT event → `200` with updated event
  - Attempt to edit PUBLISHED event → `409 {"error":"Only DRAFT events can be edited."}`
  - Event belonging to a different org → `404`
  - Non-existent eventId → `404`
  - Unauthenticated → `401`
  - Authenticated as VOLUNTEER → `403`
  - Patch validation: if `endTime` provided without `startTime`, must validate against existing `startTime`; if `eventDate` in past → `400`

#### Get single event integration tests
- [x] BE-TEST-04: Write failing integration tests for `GET /organisation/events/:eventId`:
  - Valid own event → `200` with `{ eventId, title, status, roles: [...] }`
  - Event belonging to different org → `404`
  - Non-existent eventId → `404`
  - Unauthenticated → `401`

#### List events integration tests
- [x] BE-TEST-05: Write failing integration tests for `GET /organisation/events`:
  - Returns events for the session org, sorted by `eventDate` descending
  - Response per event includes `eventId`, `title`, `eventDate`, `status`, `totalRoles`, `totalHeadcount`, `filledCount`, `fillRate`
  - Returns `{ events: [], cursor: null }` when org has no events (AC-10)
  - Accepts `limit` and `cursor` query params for pagination
  - Unauthenticated → `401`

**Outputs**: Failing test suite in:
- `backend/src/lib/__tests__/eventValidation.test.ts`
- `backend/src/handlers/__tests__/orgEvents.test.ts`

**Depends on**: Layer 0 (GSI attribute names and event item schema confirmed)

**TDD note**: Run `cd /home/trystanm2/dev/gatherly/backend && npm test`. All new tests MUST fail (cannot find module or similar). Pre-existing tests must still be green. Do not proceed to Layer 1b until red phase is confirmed.

---

### Layer 1b: Backend Implementation (Green → Refactor)

**Agent**: backend-developer

**Tasks**:

- [x] BE-01: Create `backend/src/lib/eventValidation.ts` — export `validatePostcode`, `isDateInFuture`, `isEndTimeAfterStartTime`. Make BE-TEST-01 green.

- [x] BE-02: Create `backend/src/handlers/org-events.ts` — `orgEventsRouter` with four endpoints. Apply `requireAuth`, `requireRole('ORG_ADMIN')`, `requireApprovedOrg` on the router level (not in `app.ts` — keep route guards co-located with the router).

- [x] BE-03: Implement `POST /organisation/events` in `org-events.ts`:
  - Validate all required fields; use `eventValidation` helpers for date/time/postcode checks
  - Generate `eventId` with `uuidv4()`; always use `req.session.orgId` for `orgId`
  - Ignore any `orgId` field in request body
  - Write EVENT item with `PK=EVENT#<eventId>`, `SK=PROFILE`, `status=DRAFT`, `GSI3PK=EVENT_STATUS#DRAFT`, `GSI3SK=<eventDate>#<eventId>`, `GSI4PK=ORG#<orgId>`, `GSI4SK=<eventDate>#<eventId>`
  - Return `201` with the created event object
  - Make BE-TEST-02 green.

- [x] BE-04: Implement `PATCH /organisation/events/:eventId` in `org-events.ts`:
  - Fetch event via `GetItem`; return `404` if not found or `event.orgId !== req.session.orgId`
  - Return `409` if `event.status !== 'DRAFT'`
  - Accept any subset of create fields; re-validate provided fields using `eventValidation` helpers
  - When `endTime` is provided but `startTime` is not, compare against stored `startTime`
  - Update item with `updateItem`; return updated event
  - Make BE-TEST-03 green.

- [x] BE-05: Implement `GET /organisation/events/:eventId` in `org-events.ts`:
  - Fetch EVENT item via `GetItem`; return `404` if not found or wrong org
  - Query `PK=EVENT#<eventId>, SK begins_with ROLE#` to get roles array
  - Return combined response `{ eventId, title, status, ..., roles }`
  - Make BE-TEST-04 green.

- [x] BE-06: Implement `GET /organisation/events` in `org-events.ts`:
  - Query GSI4 with `PK=ORG#<orgId>`, `ScanIndexForward=false` using `queryItemsPaginated`
  - For each event, compute `totalRoles`, `totalHeadcount`, `filledCount`, `fillRate` from ROLE items (batch query or per-event query)
  - Return `{ events: [...], cursor: <base64-encoded lastEvaluatedKey or null> }`
  - Accept `limit` (default 20, max 100) and `cursor` query params
  - Make BE-TEST-05 green.

- [x] BE-07: Mount `orgEventsRouter` in `backend/src/app.ts` at `/organisation/events`, protected by `requireAuth`, `requireRole('ORG_ADMIN')`, `requireApprovedOrg`.

- [x] BE-08: Refactor — extract any duplicated validation or ownership-check logic into shared helpers. Re-run all tests to confirm still green.

**Outputs**:
- All BE-TEST-* green
- API contract (for frontend consumption):
  - `POST /organisation/events` → `201 { eventId, orgId, title, eventTypeId, eventDate, startTime, endTime, venueName, venueAddress, city, postcode, description?, maxVolunteers?, status, createdAt }`
  - `PATCH /organisation/events/:eventId` → `200 { ...updatedEvent }`
  - `GET /organisation/events/:eventId` → `200 { eventId, title, status, ..., roles: [{ roleId, name, capacity, filledCount }] }`
  - `GET /organisation/events` → `200 { events: [{ eventId, title, eventDate, status, totalRoles, totalHeadcount, filledCount, fillRate }], cursor: string | null }`
  - Error shape: `{ "error": "<message>" }` with appropriate HTTP status
- Environment variables consumed: `DYNAMODB_TABLE_NAME`, `DYNAMODB_ENDPOINT` (no new vars)

**Depends on**: Layer 1a (all tests must be failing/red before implementation starts)

**TDD note**: Implement minimum to pass each test group, then refactor. Run `npm test` in `/home/trystanm2/dev/gatherly/backend` after each handler. All tests must be green before Layer 2 starts.

---

### Layer 2a: Frontend Tests (Red)

**Agent**: frontend-developer

**Tasks**:

- [x] FE-TEST-01: Write failing component tests for `<OrgEventCreateForm>` (`frontend/src/components/events/OrgEventCreateForm.tsx`):
  - Renders all required fields with accessible labels: Event title, Event type (select), Date, Start time, End time, Venue name, Address, City, Postcode
  - Renders optional fields: Description (textarea), Max volunteers (number input)
  - Renders a "Save as draft" submit button
  - Renders a back link to `/organisation/dashboard`
  - On submit with valid data, calls `apiClient.post('/organisation/events', ...)` with correct payload
  - Does NOT send `orgId` in the request body
  - Displays field-level error for past date (FR-02)
  - Displays field-level error for `endTime` before `startTime` (FR-02)
  - Displays field-level error for invalid UK postcode (FR-02)
  - Displays generic `400` field errors returned from the API
  - On `201` success, navigates to `/organisation/dashboard`

- [x] FE-TEST-02: Write failing component tests for `<OrgEventEditForm>` (`frontend/src/components/events/OrgEventEditForm.tsx`):
  - Pre-populates all fields from the event passed as props
  - On submit, calls `apiClient.patch('/organisation/events/:eventId', ...)` with only changed fields (partial payload)
  - Displays `409` error as a form-level banner: "Only DRAFT events can be edited."
  - On `200` success, navigates back to `/organisation/dashboard`

- [x] FE-TEST-03: Write failing component tests for `<OrgDashboardPage>` (`frontend/src/pages/OrgDashboardPage.tsx`):
  - On mount, calls `apiClient.get('/organisation/events?limit=20')`
  - Renders events table with columns: Title, Date, Status, Fill (filledCount/totalHeadcount)
  - Renders status badges as pill shapes with correct colours: DRAFT (grey), PUBLISHED (green), CANCELLED (red), COMPLETED (muted)
  - Renders empty state message when `events` array is empty (AC-10)
  - Renders a "Create event" button linking to `/organisation/events/new`
  - Renders a "Load more" button when `cursor` is not null; clicking it fetches the next page and appends events
  - Renders organisation name from `AuthContext` user data

- [x] FE-TEST-04: Write failing unit tests for `frontend/src/lib/events.ts` (to be created):
  - `createEvent(payload)` calls `apiClient.post('/organisation/events', payload)` and returns the created event
  - `updateEvent(eventId, patch)` calls `apiClient.patch('/organisation/events/${eventId}', patch)` and returns the updated event
  - `getEvent(eventId)` calls `apiClient.get('/organisation/events/${eventId}')` and returns the event + roles
  - `listOrgEvents(params?)` calls `apiClient.get('/organisation/events?...')` with cursor and limit params

**Outputs**: Failing test suite in:
- `frontend/src/components/events/__tests__/OrgEventCreateForm.test.tsx`
- `frontend/src/components/events/__tests__/OrgEventEditForm.test.tsx`
- `frontend/src/pages/__tests__/OrgDashboardPage.test.tsx`
- `frontend/src/lib/__tests__/events.test.ts`

**Depends on**: Layer 1b (API contracts must be known: endpoints, request/response shapes, error codes)

**TDD note**: Run `cd /home/trystanm2/dev/gatherly/frontend && npm test`. All new tests MUST fail. Pre-existing tests must stay green. Do not proceed to Layer 2b until red phase is confirmed.

---

### Layer 2b: Frontend Implementation (Green → Refactor)

**Agent**: frontend-developer

**Tasks**:

- [x] FE-01: Create `frontend/src/lib/events.ts` — `createEvent`, `updateEvent`, `getEvent`, `listOrgEvents`. Make FE-TEST-04 green.

- [x] FE-02: Create `frontend/src/components/events/OrgEventCreateForm.tsx` — form matching the PRD wireframe. Tailwind styling consistent with the existing design system (use `AuthFormWrapper`-style card pattern if appropriate, or a full-page form layout). Client-side validation for postcode regex, past date, and time ordering before submitting. Make FE-TEST-01 green.

- [x] FE-03: Create `frontend/src/components/events/OrgEventEditForm.tsx` — pre-populated form; calls PATCH endpoint; displays 409 banner. Make FE-TEST-02 green.

- [x] FE-04: Create `frontend/src/pages/OrgDashboardPage.tsx` — replaces the inline `OrgDashboard` placeholder in `App.tsx`. Renders events table, status badge pills, empty state, "Create event" CTA, and "Load more" pagination. Uses `useAuth()` for org name display. Make FE-TEST-03 green.

- [x] FE-05: Create `frontend/src/components/events/StatusBadge.tsx` — reusable status badge component used by both the dashboard table and (later) the event detail page. Props: `status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED'`. Colours match the design system: DRAFT → grey pill, PUBLISHED → green pill, CANCELLED → red pill, COMPLETED → muted pill.

- [x] FE-06: Add routes to `frontend/src/App.tsx`:
  - `/organisation/events/new` → `<OrgEventCreatePage>` behind `<ProtectedRoute role="ORG_ADMIN">`
  - `/organisation/events/:eventId/edit` → `<OrgEventEditPage>` behind `<ProtectedRoute role="ORG_ADMIN">`
  - Replace the inline `OrgDashboard` placeholder on `/organisation/dashboard` with `<OrgDashboardPage>`

- [x] FE-07: Refactor — extract any shared form field components (e.g. `<FormField>` label+input wrapper) if they appear in both create and edit forms. Re-run all tests to confirm still green.

**Outputs**:
- All FE-TEST-* green
- Routes: `/organisation/events/new`, `/organisation/events/:eventId/edit`, `/organisation/dashboard` (real implementation)
- `events.ts` API client module
- `StatusBadge` component available for reuse in future features

**Depends on**: Layer 2a (all FE tests must be failing before implementation)

**TDD note**: Implement minimum to pass each test, then refactor. All tests must be green before Layer 3 starts.

---

### Layer 3: End-to-End Tests

**Agent**: playwright-tester

**Tasks**:

- [x] TST-01: Create event happy path (AC-01, AC-02):
  - Log in as `admin@gatherlydemohq.com / TestPassword123!`
  - Navigate to `/organisation/events/new`
  - Fill all required fields with valid data (future date, valid UK postcode, `endTime` after `startTime`)
  - Include `orgId` in the form fields if any are named `orgId` (should not exist in the form) — verify it is NOT sent in the request body via network intercept
  - Submit → assert redirect to `/organisation/dashboard`
  - Assert the new event appears in the dashboard table with status badge "DRAFT"
  - Assert the event was created in DynamoDB with `status=DRAFT` and correct `orgId` (via API `GET /organisation/events/:eventId`)

- [x] TST-02: Validation errors (AC-03, AC-04, AC-05):
  - Navigate to `/organisation/events/new`
  - Submit with a past date → assert `400` error message "Event date must be in the future." shown in UI
  - Submit with `endTime` before `startTime` → assert "End time must be after start time." shown
  - Submit with invalid postcode `SW1A1AA` (no space) → assert "Please enter a valid UK postcode." shown

- [x] TST-03: Edit DRAFT event (AC-06):
  - Create a DRAFT event via API (`POST /organisation/events`)
  - Navigate to `/organisation/events/:eventId/edit`
  - Change the title; submit → assert `200` response; assert dashboard shows updated title

- [x] TST-04: Cannot edit PUBLISHED event (AC-07):
  - Create an event via API and manually set its status to PUBLISHED (via direct DynamoDB update or by using seed data)
  - Attempt `PATCH /organisation/events/:eventId` via API → assert `409 {"error":"Only DRAFT events can be edited."}`
  - (Optional) Navigate to edit page → assert `409` banner shown

- [x] TST-05: Ownership enforcement (AC-08):
  - Create a second org admin session (or use a different seeded org admin)
  - Attempt `PATCH /organisation/events/:eventId` targeting an event owned by a different org → assert `404`

- [x] TST-06: List events with fill rate (AC-09):
  - Navigate to `/organisation/dashboard` as `admin@gatherlydemohq.com`
  - Assert the seeded event `event-demo-fun-run` appears in the table
  - Assert `fillRate` column shows `0/15` (sum of role capacities from seed: Marshal 10 + Water Station 5)

- [x] TST-07: Empty state (AC-10):
  - Log in as a freshly created org admin whose org has no events
  - Navigate to `/organisation/dashboard` → assert empty state message is displayed
  - Assert "Create event" button is visible

- [x] TST-08: Status badges (AC-11):
  - Seed or create events with different statuses (DRAFT, PUBLISHED)
  - Navigate to `/organisation/dashboard`
  - Assert DRAFT badge renders with grey styling
  - Assert PUBLISHED badge renders with green styling

- [x] TST-09: Accessibility checks:
  - Navigate to `/organisation/events/new` — assert all inputs have visible labels
  - Tab through form — assert focus order follows visual order
  - Assert no ARIA violations using Playwright accessibility snapshot

**Outputs**: Playwright test suite in `e2e/tests/event-creation.test.ts`; all tests pass against the running local stack (`docker compose up`)

**Depends on**: Layers 1b + 2b (both must be fully implemented and green)

**TDD note**: E2E tests are written against the running system. All tests must pass before the plan is marked complete. Run with `cd /home/trystanm2/dev/gatherly/e2e && npx playwright test tests/event-creation.test.ts`.

---

## Integration Checkpoints

| After layer | What to verify |
|---|---|
| Layer 0 | `docker compose up` starts cleanly; `npm run db:bootstrap && npm run db:seed` succeeds; GSI4 present in table with correct attribute definitions; seed event item has `GSI4PK=ORG#org-demo-runners` key |
| Layer 1a | `cd /home/trystanm2/dev/gatherly/backend && npm test` — all new event tests FAIL (red); zero passing among new tests; pre-existing health/auth/org tests still green |
| Layer 1b | `cd /home/trystanm2/dev/gatherly/backend && npm test` — 100% of event tests pass (green); API contract documented above matches implementation; `orgId` from body is demonstrably ignored (verified by BE-TEST-02); no hardcoded org IDs or table names |
| Layer 2a | `cd /home/trystanm2/dev/gatherly/frontend && npm test` — all new event component/page tests FAIL (red); pre-existing auth/org tests still green |
| Layer 2b | `cd /home/trystanm2/dev/gatherly/frontend && npm test` — 100% of event tests pass; `StatusBadge` renders correct colours; `/organisation/dashboard` no longer renders the old placeholder; routes accessible at `/organisation/events/new` and `/organisation/events/:eventId/edit` |
| Layer 3 | `cd /home/trystanm2/dev/gatherly/e2e && npx playwright test tests/event-creation.test.ts` — all 9 tests pass; all pre-existing smoke and auth tests still pass |

---

## Open Questions

These must be resolved before or during Layer 0. A decision must be recorded here before the backend-developer agent is briefed for Layer 1b.

| # | Question | Impact | Suggested default |
|---|---|---|---|
| OQ-01 | **Org-events list access pattern** — The PRD requires listing all events for an org sorted by date descending. The PRD specifies `GSI3PK=EVENT_STATUS#DRAFT` for the event item, which indexes by status. A separate GSI keyed on `orgId` is needed to list all events for an org efficiently without a table scan. Should this use GSI4 (`GSI4PK=ORG#<orgId>`, `GSI4SK=<eventDate>#<eventId>`) as assumed in this plan, or a filter expression on GSI3? | Affects bootstrap.ts, seed.ts, and all event write paths | Use GSI4 — it avoids full-status-partition scans and scales as event count grows per org |
| OQ-02 | **GSI3SK format** — The PRD specifies `GSI3SK=<eventDate>#<eventId>` for the event item. The existing seed in `seed.ts` uses `GSI3SK=PUBLISHED#2026-06-15` (status-prefixed, no eventId). These are inconsistent. Which format is authoritative for this feature? | Affects the create handler and seed data alignment | Use `<eventDate>#<eventId>` as specified in the PRD FR-01; update the seed item in INF-02 |
| OQ-03 | **`eventTypeId` validation** — FR-01 requires `eventTypeId` to be a "valid skill catalogue event type". The Event Types feature is out of scope for this PRD. Should `eventTypeId` be validated against a catalogue on creation (requiring a DynamoDB lookup), or accepted as a free-form string for now with a note that stricter validation is added when the Event Types PRD ships? | Affects BE-TEST-02 and the create handler | Accept as non-empty string for now; add catalogue lookup when Event Types PRD ships. Document in PLAN.md. |
| OQ-04 | **Fill rate computation on list** — `GET /organisation/events` must return `totalRoles`, `totalHeadcount`, `filledCount`, and `fillRate` per event. ROLE items live under the same PK as the event. Should fill-rate data be computed live per request (Query per event), aggregated on the event item itself (denormalised counters), or pre-computed in a `totalHeadcount` / `filledCount` attribute on the EVENT item? | Affects performance and implementation complexity | Compute live from ROLE items for now (acceptable at MVP scale with < 10 roles per event); denormalise when the Event Roles PRD ships |
| OQ-05 | **Cursor encoding** — The PRD specifies cursor pagination for the list endpoint. DynamoDB returns `LastEvaluatedKey` as a JSON object. Should the cursor be base64-encoded JSON (transparent to the client) or an opaque token? | Affects both backend serialisation and frontend cursor handling | Base64-encoded JSON, consistent with the pattern used in `GET /admin/organisations` |
| OQ-06 | **`/organisation/dashboard` vs `/org/dashboard`** — The current `App.tsx` has two routes: `/org/dashboard` (ProtectedRoute wrapping `OrgDashboard` placeholder) and `/organisation/dashboard` (also wrapping `OrgDashboard`). The PRD specifies `/organisation/dashboard`. Should `/org/dashboard` be kept as a redirect alias, removed, or left unchanged? | Affects routing and any existing E2E tests that navigate to `/org/dashboard` | Keep `/org/dashboard` as an alias redirect to `/organisation/dashboard` to avoid breaking existing auth tests |
