# Implementation Plan: Event Roles

> PRD: `.claude/prd/PRD-event-roles.md`
> GitHub Issue: [#5 Event Roles](https://github.com/trystan24601/gatherly/issues/5)
> Feature branch: `feature/event-roles`

---

## Architecture Overview

The Event Roles feature extends the existing Express + DynamoDB single-table backend and React frontend. ROLE and SLOT items are stored in the same DynamoDB partition as their parent event (`PK=EVENT#<eventId>`), making the full event structure retrievable in a single `Query`. Six new REST endpoints are added to the existing `orgEventsRouter` in `backend/src/handlers/org-events.ts`; the publish guard in the same file is tightened to require at least one role with at least one slot. The frontend extends the existing `OrgEventDetailPage` with an inline role-and-slot manager, two new modals (Add/Edit Role, Add/Edit Slot), and updates the `EventRole` and `EventDetail` types in `frontend/src/lib/events.ts` to carry the nested `slots` array. No infrastructure changes are required: the existing DynamoDB table, GSIs, and docker-compose stack support this feature without modification.

---

## Phase 1: PRD Analysis

### 1.1 System Overview

A two-level hierarchy — **Role** (job type) and **Slot** (shift window + location + headcount) — is introduced for DRAFT events. Org Admins manage roles and slots on their own events. Volunteers will eventually sign up for a specific slot (future PRD). The publish guard is strengthened so that an event must have at least one role with at least one slot before it can be published.

### 1.2 Functional Requirements

| ID | Feature | Description |
|---|---|---|
| FR-01 | Add Role | `POST /organisation/events/:eventId/roles` — create ROLE item in event partition |
| FR-02 | Edit Role | `PATCH /organisation/events/:eventId/roles/:roleId` — update name/description/skillIds |
| FR-03 | Delete Role | `DELETE /organisation/events/:eventId/roles/:roleId` — atomic delete of ROLE + all SLOTs; blocks if active registrations exist |
| FR-04 | Add Slot | `POST /organisation/events/:eventId/roles/:roleId/slots` — create SLOT item under role |
| FR-05 | Edit Slot | `PATCH /organisation/events/:eventId/roles/:roleId/slots/:slotId` — update shift/location/headcount |
| FR-06 | Delete Slot | `DELETE /organisation/events/:eventId/roles/:roleId/slots/:slotId` — blocks if active registrations exist |
| FR-07 | Get Roles + Slots | `GET /organisation/events/:eventId` — existing endpoint extended to return nested `roles[].slots[]` |
| FR-08 | Publish Guard | `POST /organisation/events/:eventId/publish` — requires ≥1 role with ≥1 slot |

### 1.3 Non-Functional Requirements

- **Security**: Ownership enforced on every endpoint; org admin can only modify roles/slots on events they own.
- **Performance**: All role + slot reads are a single DynamoDB partition query (sub-10ms target). Role deletion uses TransactWrite to atomically remove ROLE + all SLOTs.
- **Scalability**: All items co-located in the event partition; no cross-partition joins needed.
- **Idempotency**: PUT/PATCH operations are safe to retry; DELETE checks registrations before acting.

### 1.4 System Boundaries

- **DynamoDB single table** — all ROLE and SLOT items co-located with event PROFILE item under `PK=EVENT#<eventId>`.
- **Registration GSI** — future registrations pointing to `slotId` will use a GSI to check for PENDING/CONFIRMED registrations before delete. The GSI key structure must be decided now (see Open Questions).
- **Auth**: Existing `requireAuth` + `requireRole('ORG_ADMIN')` + `requireApprovedOrg` middleware — unchanged.

---

## Domain Model

### DynamoDB Items

| Entity | PK | SK | Key Attributes |
|---|---|---|---|
| EVENT (existing) | `EVENT#<eventId>` | `PROFILE` | `orgId`, `status`, `title`, ... |
| ROLE (new) | `EVENT#<eventId>` | `ROLE#<roleId>` | `entityType=ROLE`, `roleId`, `orgId`, `name`, `description?`, `skillIds?` |
| SLOT (new) | `EVENT#<eventId>` | `ROLE#<roleId>#SLOT#<slotId>` | `entityType=SLOT`, `slotId`, `roleId`, `location?`, `shiftStart`, `shiftEnd`, `headcount`, `filledCount=0`, `status=OPEN` |

### Query Patterns

- **All ROLE + SLOT items for event**: `Query PK=EVENT#<eventId>, SK begins_with ROLE#`
- **All SLOTs for a role**: `Query PK=EVENT#<eventId>, SK begins_with ROLE#<roleId>#SLOT#`
- **Active registrations for a role** (delete guard): GSI query on `roleId` — see Open Question OQ-01
- **Active registrations for a slot** (delete guard): GSI query on `slotId` — see Open Question OQ-01

### Frontend Types (updated)

```typescript
// Slot (new)
interface EventSlot {
  slotId: string
  roleId: string
  location?: string
  shiftStart: string   // HH:MM
  shiftEnd: string     // HH:MM
  headcount: number
  filledCount: number
  status: 'OPEN' | 'FULL' | 'CLOSED'
}

// Role (extended from current EventRole)
interface EventRole {
  roleId: string
  name: string
  description?: string
  skillIds?: string[]
  slots: EventSlot[]   // NEW — previously absent
}

// EventDetail.roles type changes from EventRole[] to updated EventRole[]
```

---

## Layers

### Layer 0: Infrastructure

**Agent**: infrastructure-engineer
**Status**: No new infrastructure required.

The existing DynamoDB table, GSIs, IAM policies, and docker-compose setup support this feature without modification. The table already uses `PK`/`SK` with `begins_with` SK prefix queries.

**Tasks**:
- [x] INF-01: Confirm that the existing table's GSI configuration can support the registration-lookup query pattern for FR-03 and FR-06 (query registrations by `roleId` or `slotId`). Document findings. If a new GSI is needed, add it to the Terraform module and update the `docker-compose.yml` table initialisation script.
- [x] INF-02: Update `.env.example` if any new environment variables are introduced (none anticipated).

**Outputs**: Confirmation of GSI sufficiency (or a new GSI definition if required); updated Terraform if needed.
**Depends on**: None.
**TDD note**: Run `terraform validate` and `tflint` on the infra module. Run Checkov. No new resources means this layer is fast — primary output is the GSI decision documented in PLAN.md.

**Deviation note**: No new infrastructure layer is being provisioned. This decision is recorded here per architectural defaults — the single-table design already accommodates the new SK prefix patterns.

---

### Layer 1a: Backend Tests (Red)

**Agent**: backend-developer
**Tasks**:

- [x] BE-TEST-01: Write failing integration tests for `POST /organisation/events/:eventId/roles` (FR-01):
  - Creates ROLE item with correct PK/SK/entityType when event is DRAFT and owned by session org
  - Returns 400 when `name` is missing, fewer than 2 chars, or over 100 chars
  - Returns 400 when `description` exceeds 500 chars
  - Returns 404 when event not found or belongs to another org
  - Returns 409 when event is not DRAFT

- [x] BE-TEST-02: Write failing integration tests for `PATCH /organisation/events/:eventId/roles/:roleId` (FR-02):
  - Updates only the provided fields (`name`, `description`, `skillIds`)
  - Returns 404 when role not found or event not owned
  - Returns 409 when event is not DRAFT

- [x] BE-TEST-03: Write failing integration tests for `DELETE /organisation/events/:eventId/roles/:roleId` (FR-03):
  - Deletes ROLE item and all its SLOT items atomically via TransactWrite when no active registrations exist
  - Returns 409 with "Cannot delete a role with active registrations." when PENDING/CONFIRMED registrations exist on any slot of this role
  - Returns 409 when event is not DRAFT
  - Returns 404 when role not found or event not owned

- [x] BE-TEST-04: Write failing integration tests for `POST /organisation/events/:eventId/roles/:roleId/slots` (FR-04):
  - Creates SLOT item with `filledCount=0`, `status=OPEN`, correct PK/SK/entityType
  - Returns 400 when `shiftStart` or `shiftEnd` is missing
  - Returns 400 when `shiftEnd` is not after `shiftStart`
  - Returns 400 when `headcount` is not between 1 and 500
  - Returns 400 when `location` exceeds 200 chars
  - Returns 404 when role not found or event not owned
  - Returns 409 when event is not DRAFT

- [x] BE-TEST-05: Write failing integration tests for `PATCH /organisation/events/:eventId/roles/:roleId/slots/:slotId` (FR-05):
  - Updates only the provided fields
  - Returns 409 when reducing headcount below filledCount
  - Returns 409 when event is not DRAFT
  - Returns 404 when slot not found

- [x] BE-TEST-06: Write failing integration tests for `DELETE /organisation/events/:eventId/roles/:roleId/slots/:slotId` (FR-06):
  - Deletes SLOT item when no active registrations exist
  - Returns 409 with "Cannot delete a slot with active registrations." when PENDING/CONFIRMED registrations exist on this slot
  - Returns 409 when event is not DRAFT

- [x] BE-TEST-07: Write failing integration tests for updated `GET /organisation/events/:eventId` (FR-07):
  - Returns event with nested `roles` array; each role contains a `slots` array
  - ROLE items and SLOT items are correctly grouped — SLOT items appear under the correct parent ROLE
  - An event with no roles returns `roles: []`

- [x] BE-TEST-08: Write failing integration tests for updated `POST /organisation/events/:eventId/publish` (FR-08):
  - Returns 400 with "Event must have at least one role with at least one slot before publishing." when no roles exist
  - Returns 400 with same message when roles exist but none have slots
  - Succeeds (200) when at least one role with at least one slot exists

**Outputs**: Failing test suite in `backend/src/handlers/__tests__/orgEventRoles.test.ts` (new file); updated `orgEventsLifecycle.test.ts` for the publish guard change.
**Depends on**: Layer 0 (GSI decision must be resolved so mock structure is correct).
**TDD note**: Run `npm test` in `/home/trystanm2/dev/gatherly/backend` and confirm all new tests fail. Do not proceed to Layer 1b until failure is confirmed.

---

### Layer 1b: Backend Implementation (Green → Refactor)

**Agent**: backend-developer
**Tasks**:

- [x] BE-01: Add role CRUD endpoints to `backend/src/handlers/org-events.ts`:
  - `POST /organisation/events/:eventId/roles` — validate name (2–100 chars), optional description (max 500), optional skillIds; write ROLE item; return 201 with role object.
  - `PATCH /organisation/events/:eventId/roles/:roleId` — partial update; validate same field constraints; return 200 with updated role.
  - `DELETE /organisation/events/:eventId/roles/:roleId` — query registrations GSI for PENDING/CONFIRMED on any slot of this role; if none, TransactWrite delete ROLE + all SLOT items; return 204.

- [x] BE-02: Add slot CRUD endpoints to `backend/src/handlers/org-events.ts`:
  - `POST /organisation/events/:eventId/roles/:roleId/slots` — validate shiftStart/shiftEnd (HH:MM, end after start), headcount (1–500), optional location (max 200); write SLOT item with `filledCount=0`, `status=OPEN`; return 201.
  - `PATCH /organisation/events/:eventId/roles/:roleId/slots/:slotId` — partial update; validate headcount not below filledCount; return 200.
  - `DELETE /organisation/events/:eventId/roles/:roleId/slots/:slotId` — query registrations for PENDING/CONFIRMED on this slotId; if none, delete SLOT item; return 204.

- [x] BE-03: Update `GET /organisation/events/:eventId` response building — after querying all `ROLE#` prefixed items, group by `entityType`: ROLE items become the role array, SLOT items are nested under their parent role by matching the SK prefix `ROLE#<roleId>#SLOT#`.

- [x] BE-04: Update `POST /organisation/events/:eventId/publish` publish guard — after confirming roles exist, also confirm at least one role has at least one SLOT item; return 400 with correct message if not.

- [x] BE-05: Extract a shared `validateTimeRange(shiftStart, shiftEnd)` helper (HH:MM format, end after start) into `backend/src/lib/eventValidation.ts` — reuse existing `isEndTimeAfterStartTime` if compatible, otherwise add alongside it.

**Outputs**: All BE-TEST-01 through BE-TEST-08 tests passing; updated `org-events.ts`; updated `eventValidation.ts`.
**Depends on**: Layer 1a (failing tests must exist).
**TDD note**: Run `npm test` in `/home/trystanm2/dev/gatherly/backend` — all tests must be green. Then refactor (extract helpers, clean up duplication) and re-run to confirm still green.

---

### Layer 2a: Frontend Tests (Red)

**Agent**: frontend-developer
**Tasks**:

- [x] FE-TEST-01: Write failing unit tests for new API client functions in `frontend/src/lib/events.ts`:
  - `createRole(eventId, payload)` — sends `POST /organisation/events/:eventId/roles`
  - `updateRole(eventId, roleId, patch)` — sends `PATCH ...`
  - `deleteRole(eventId, roleId)` — sends `DELETE ...`
  - `createSlot(eventId, roleId, payload)` — sends `POST .../slots`
  - `updateSlot(eventId, roleId, slotId, patch)` — sends `PATCH .../slots/:slotId`
  - `deleteSlot(eventId, roleId, slotId)` — sends `DELETE .../slots/:slotId`

- [x] FE-TEST-02: Write failing component tests for `RoleCard` component:
  - Renders role name, description, and a list of slots
  - Shows slot location, shift times, headcount, and filledCount
  - Renders "Edit" and "Delete" buttons on each role
  - Renders "Edit" and "Delete" buttons on each slot
  - Renders "+ Add slot" button per role

- [x] FE-TEST-03: Write failing component tests for `AddEditRoleModal`:
  - Renders name field (required), description field (optional)
  - Submit with empty name shows inline validation error
  - Submit with valid name calls `onSave` callback with correct payload
  - Cancel calls `onClose`
  - In edit mode, pre-fills existing values

- [x] FE-TEST-04: Write failing component tests for `AddEditSlotModal`:
  - Renders location (optional), shiftStart, shiftEnd, headcount fields
  - Submit with missing shiftStart or shiftEnd shows error
  - Submit where shiftEnd ≤ shiftStart shows error
  - Submit with headcount out of range (< 1 or > 500) shows error
  - Valid submit calls `onSave` with correct payload
  - Cancel calls `onClose`
  - In edit mode, pre-fills existing values

- [x] FE-TEST-05: Write failing integration tests for updated `OrgEventDetailPage`:
  - Renders a "Roles" section with an "+ Add role" button when event is DRAFT
  - Lists each role with its name and nested slots
  - "+ Add slot" button opens `AddEditSlotModal`
  - "Edit" on a role opens `AddEditRoleModal` in edit mode
  - "Delete" on a role with no registrations calls `deleteRole` and refreshes
  - "Publish event" button is enabled only when at least one role with at least one slot exists (updated from current: was "at least one role")
  - Role/slot management controls are hidden when event is not DRAFT

- [x] FE-TEST-06: Write failing tests for updated `EventDetail` and `EventRole` TypeScript types:
  - `EventRole` includes a `slots: EventSlot[]` field
  - `EventSlot` type exists with correct fields (`slotId`, `roleId`, `location?`, `shiftStart`, `shiftEnd`, `headcount`, `filledCount`, `status`)

**Outputs**: Failing test suite across:
- `frontend/src/lib/__tests__/events.test.ts` (updated)
- `frontend/src/components/events/__tests__/RoleCard.test.tsx` (new)
- `frontend/src/components/events/__tests__/AddEditRoleModal.test.tsx` (new)
- `frontend/src/components/events/__tests__/AddEditSlotModal.test.tsx` (new)
- `frontend/src/pages/__tests__/OrgEventDetailPage.test.tsx` (updated)

**Depends on**: Layer 1b (API contracts from backend must be known and stable).
**TDD note**: Run `npm test` in `/home/trystanm2/dev/gatherly/frontend` — all new tests must fail before proceeding to Layer 2b.

---

### Layer 2b: Frontend Implementation (Green → Refactor)

**Agent**: frontend-developer
**Tasks**:

- [x] FE-01: Update `frontend/src/lib/events.ts`:
  - Add `EventSlot` interface.
  - Update `EventRole` interface to include `slots: EventSlot[]` and `description?`, `skillIds?` fields.
  - Add `createRole`, `updateRole`, `deleteRole`, `createSlot`, `updateSlot`, `deleteSlot` API client functions.

- [x] FE-02: Create `frontend/src/components/events/RoleCard.tsx`:
  - Renders role name, optional description.
  - Lists slots with location, shift time range, headcount/filledCount display.
  - "Edit" / "Delete" buttons on role (DRAFT only).
  - "Edit" / "Delete" buttons on each slot (DRAFT only).
  - "+ Add slot" button (DRAFT only).

- [x] FE-03: Create `frontend/src/components/events/AddEditRoleModal.tsx`:
  - Controlled modal with `name` (required, 2–100 chars) and `description` (optional, max 500 chars) fields.
  - Client-side validation with inline error messages.
  - `onSave(payload)` and `onClose` props.

- [x] FE-04: Create `frontend/src/components/events/AddEditSlotModal.tsx`:
  - Controlled modal with `location` (optional), `shiftStart` (HH:MM, required), `shiftEnd` (HH:MM, required), `headcount` (1–500, required) fields.
  - Client-side validation: shiftEnd must be after shiftStart; headcount in range.
  - `onSave(payload)` and `onClose` props, plus `roleName` for the modal title.

- [x] FE-05: Refactor `frontend/src/pages/OrgEventDetailPage.tsx`:
  - Replace the flat roles list with `RoleCard` components.
  - Add "+ Add role" button (DRAFT only) that opens `AddEditRoleModal`.
  - Wire role edit/delete actions: on delete, call `deleteRole`, then `fetchEvent`.
  - Wire slot add/edit/delete actions: open `AddEditSlotModal`, then call appropriate API function, then `fetchEvent`.
  - Update "Publish event" disabled condition: disabled when no role has at least one slot (not just when `roles.length === 0`).
  - Disable all management controls when event status is not DRAFT.

**Outputs**: All FE-TEST-01 through FE-TEST-06 tests passing; new components; updated `events.ts` types; updated `OrgEventDetailPage`.
**Depends on**: Layer 2a (failing tests must exist first).
**TDD note**: Run `npm test` in `/home/trystanm2/dev/gatherly/frontend` — all tests must be green. Refactor (extract duplication, improve prop naming) then re-run.

---

### Layer 3: End-to-End Tests

**Agent**: playwright-tester
**Tasks**:

- [x] TST-01: E2E test — Add a role to a DRAFT event:
  - Org Admin logs in, navigates to a DRAFT event detail page.
  - Clicks "+ Add role", fills in name and description, saves.
  - Role appears in the list; slot count is 0.

- [x] TST-02: E2E test — Add a slot to a role:
  - Clicks "+ Add slot" on a role.
  - Fills in shiftStart, shiftEnd, headcount, optional location.
  - Slot appears nested under the role with correct details.

- [x] TST-03: E2E test — Edit a role:
  - Clicks "Edit" on a role, changes name, saves.
  - Updated name is reflected in the list.

- [x] TST-04: E2E test — Edit a slot:
  - Clicks "Edit" on a slot, changes headcount, saves.
  - Updated headcount is shown.

- [x] TST-05: E2E test — Delete a slot (no registrations):
  - Clicks "Delete" on a slot.
  - Slot is removed from the list.

- [x] TST-06: E2E test — Delete a role (no registrations):
  - Clicks "Delete" on a role with no registrations.
  - Role and all its slots are removed.

- [x] TST-07: E2E test — Publish guard (no slots on any role):
  - Org Admin has a DRAFT event with one role but zero slots.
  - "Publish event" button is disabled.

- [x] TST-08: E2E test — Publish guard (role with slot):
  - Org Admin adds a slot to the role.
  - "Publish event" button becomes enabled.
  - Clicking publish transitions event to PUBLISHED.

- [x] TST-09: E2E test — DRAFT-only guard:
  - Navigate to a PUBLISHED event detail page.
  - Role management controls (+ Add role, + Add slot, Edit, Delete) are not rendered.

- [x] TST-10: API contract test — `POST /organisation/events/:eventId/roles` returns 409 for non-DRAFT event:
  - Directly call API (via `request` fixture) against a PUBLISHED event.
  - Assert 409 with correct error message.

**Outputs**: New Playwright test file `e2e/tests/event-roles.test.ts`.
**Depends on**: Layers 1b + 2b (fully implemented system must be running).
**TDD note**: E2E tests are written against the running dev stack (`docker compose up`). All tests must pass before the feature is marked complete.

---

## Integration Checkpoints

| After Layer | Checkpoint |
|---|---|
| Layer 0 | GSI decision is documented; confirm mock structure for backend tests reflects the correct query pattern for registration lookups |
| Layer 1a | Run `npm test` in `/home/trystanm2/dev/gatherly/backend` — confirm all new role/slot tests FAIL (Red). Blocked if zero failures. |
| Layer 1b | Run `npm test` in `/home/trystanm2/dev/gatherly/backend` — confirm all tests GREEN. Verify: (1) `GET /organisation/events/:eventId` returns `roles[].slots[]`; (2) publish guard returns 400 when roles exist but have no slots; (3) no hardcoded table names or credentials. |
| Layer 2a | Run `npm test` in `/home/trystanm2/dev/gatherly/frontend` — confirm all new role/slot UI tests FAIL (Red). Blocked if zero failures. |
| Layer 2b | Run `npm test` in `/home/trystanm2/dev/gatherly/frontend` — confirm all tests GREEN. Verify: (1) `EventRole` type carries `slots: EventSlot[]`; (2) API client functions match backend route paths exactly; (3) Publish button disabled logic matches updated guard. |
| Layer 3 | Run Playwright suite — all 10 E2E tests must pass against local docker-compose stack. |

---

## Open Questions

**OQ-01 — RESOLVED** — Registration GSI structure for role/slot delete guards.

**Decision**: Proceed with mocking "no active registrations" for the delete guards in this PRD. The tests must explicitly document that the mock represents the absence of registrations, and the Volunteer Registration PRD must reference back to these guards and wire up the real GSI query when registrations are implemented.

**Implementation note for Layer 1a**: Both `hasActiveRegistrationsForSlot` and `hasActiveRegistrationsForRole` helpers are written as thin wrappers that call a `queryItems` mock. Tests mock `queryItems` to return `[]`. A `TODO` comment in each helper must read: `// TODO: wired up by Volunteer Registration PRD — queries GSI on REGISTRATION items by slotId/roleId`.

**OQ-02 (INFORMATIONAL)** — `skillIds` validation.

The PRD states `skillIds` is an "optional array of skill ID strings, informational only." There is no validation that the IDs correspond to real skills in the skill catalogue. This plan assumes no validation — any array of strings is accepted. Confirm this is acceptable.

**OQ-03 (INFORMATIONAL)** — Slot `status` field lifecycle.

SLOT items are created with `status=OPEN`. The PRD does not define when `status` transitions to `FULL` or `CLOSED`, nor whether this is computed on read or stored. This plan assumes `status` is stored on the SLOT item and is `OPEN` at creation. The transition to `FULL` (when `filledCount >= headcount`) is out of scope for this PRD and will be addressed in the Volunteer Registration PRD. Confirm this assumption.

**OQ-04 (INFORMATIONAL)** — Response body for DELETE endpoints.

The PRD does not specify the response body for `DELETE` role/slot endpoints. This plan defaults to `204 No Content`. If the frontend needs the updated event object returned, change to `200` with the full event. Confirm preferred convention.

**OQ-05 — RESOLVED** — Publish guard error message consistency.

**Decision**: Replace the existing message with a single unified message for both cases (no roles, and roles with no slots): `"Event must have at least one role with at least one slot before publishing."` Update the existing test in `orgEventsLifecycle.test.ts` that asserts the old message string.

---

## Integration Summary

**Status: COMPLETE** — All layers implemented, all tests passing.

### Final Test Counts

| Suite | Tests | Status |
|---|---|---|
| Backend unit/integration (`vitest`) | 311 | All passing |
| Frontend unit/component (`vitest`) | 203 | All passing |
| E2E Playwright (`event-roles.test.ts`) | 10 | All passing |

### What Was Built

**Backend** (`backend/src/handlers/org-events.ts`):
- 6 new REST endpoints: `POST /roles`, `PATCH /roles/:roleId`, `DELETE /roles/:roleId`, `POST /roles/:roleId/slots`, `PATCH /roles/:roleId/slots/:slotId`, `DELETE /roles/:roleId/slots/:slotId`
- `buildRolesWithSlots(items)` — groups flat `ROLE#` DynamoDB items into nested `roles[].slots[]` using SK-based entity detection (`#SLOT#` in SK)
- `validateRoleFields`, `validateSlotFields` helpers
- `hasActiveRegistrationsForRole`, `hasActiveRegistrationsForSlot` placeholder guards (TODO: wired by Volunteer Registration PRD)
- Updated `GET /:eventId` to return `roles[].slots[]`
- Tightened publish guard: requires ≥1 role with ≥1 slot

**Backend** (`backend/src/lib/eventValidation.ts`):
- Added `validateTimeRange(shiftStart, shiftEnd)` helper

**Frontend** (`frontend/src/lib/events.ts`):
- `EventSlot` interface
- Updated `EventRole` interface (with `slots`, `description?`, `skillIds?`)
- `createRole`, `updateRole`, `deleteRole`, `createSlot`, `updateSlot`, `deleteSlot` API client functions

**Frontend** (new components):
- `frontend/src/components/events/RoleCard.tsx`
- `frontend/src/components/events/AddEditRoleModal.tsx`
- `frontend/src/components/events/AddEditSlotModal.tsx`

**Frontend** (updated pages):
- `frontend/src/pages/OrgEventDetailPage.tsx` — full rewrite to support role/slot management

**Seed data** (`backend/infra/local/seed.ts`):
- Added `entityType: 'ROLE'` to all seeded role items
- Added slot item for draft event (enables E2E publish tests)
- 25 total seed items (up from 24)

**E2E tests** (`e2e/tests/event-roles.test.ts`):
- 10 tests covering all critical user journeys: add/edit/delete role, add/edit/delete slot, publish guard (disabled with no slots, enabled with slots), DRAFT-only guard, API contract 409 on non-DRAFT events.

### Deviations from PRD

None. All 8 functional requirements implemented as specified.

### Bug Fixes Discovered During E2E

1. **DynamoDB reserved keyword `name`** — the PATCH role handler used `name = :name` directly in the UpdateExpression. DynamoDB Local (and production DynamoDB) rejects `name` as a reserved keyword. Fixed by aliasing to `#name` via `ExpressionAttributeNames`. The mocked unit tests did not catch this; the E2E run against DynamoDB Local exposed it.

2. **`apiClient.delete` throwing on 204 No Content** — `frontend/src/lib/api.ts` called `response.json()` unconditionally on successful responses. A 204 response has no body, causing a JSON parse error that silently swallowed the delete action and prevented the subsequent `fetchEvent()` re-render. Fixed by returning `undefined` immediately when `response.status === 204`.

### Open Items / Follow-up Work

- **Registration delete guards** — `hasActiveRegistrationsForSlot` and `hasActiveRegistrationsForRole` are stub implementations that always return `false`. The Volunteer Registration PRD must wire these up to query the registration GSI for PENDING/CONFIRMED items by `slotId`/`roleId`.
- **Slot `status` transitions** — `OPEN → FULL` transition (when `filledCount >= headcount`) is deferred to the Volunteer Registration PRD.
- **`skillIds` catalogue** — `skillIds` is stored as an unvalidated string array. A future PRD may introduce a skill catalogue and validation.
