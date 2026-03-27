# PRD: Volunteer Registration

> 🔗 GitHub Issue: [#8 Volunteer Registration](https://github.com/trystan24601/gatherly/issues/8)

## 1. Background

Volunteer registration is the core transaction of the platform. A volunteer selects a **slot** on a PUBLISHED event and submits a registration request. Slots are the atomic unit of sign-up — they carry the specific location, shift window, and headcount for a role. Registrations point to a `slotId` (not a `roleId`) so that shift overlap checks, fill rate tracking, and cancellation guards all operate at the correct granularity.

The system runs a sequence of pre-flight checks in a fixed order before creating a registration. This order is critical and must never deviate — especially overlap before capacity, a lesson from the events-dog build.

This PRD also wires up the two stub guards (`hasActiveRegistrationsForSlot`, `hasActiveRegistrationsForRole`) left as TODOs in the Event Roles PRD, enabling safe slot and role deletion once registrations exist.

---

## 2. User Roles

| Role | Description |
|---|---|
| **Volunteer** | Submits, views, and cancels registrations |
| **Org Admin** | Confirms or declines PENDING registrations; views event roster |

---

## 3. Domain Model

### DynamoDB item type

| Entity | PK | SK | Key attributes |
|---|---|---|---|
| REGISTRATION | `REG#<regId>` | `META` | `regId`, `volunteerId`, `eventId`, `roleId`, `slotId`, `status`, `createdAt`, `confirmedAt?`, `declinedAt?`, `cancelledAt?`, `declineReason?` |

### GSI access patterns

| GSI | PK | SK | Used for |
|---|---|---|---|
| GSI4 | `EVENT#<eventId>` | `REG#<regId>` | Event roster — all registrations for an event |
| GSI5 | `USER#<volunteerId>` | `<eventDate>#<eventId>#<slotId>` | Volunteer's own registrations (sorted by date) |
| GSI6 | `SLOT#<slotId>` | `REG#<regId>` | Slot-level queries — fill count, active registration check for deletion guard |

GSI6 is new and required by this PRD. It replaces the stub in `hasActiveRegistrationsForSlot` and enables efficient fill-count queries without scanning all event registrations.

### Completing the stubs from Event Roles PRD

`hasActiveRegistrationsForSlot(slotId)` — queries `GSI6PK = SLOT#<slotId>` with FilterExpression `#status IN (:pending, :confirmed)`.

`hasActiveRegistrationsForRole(roleId, slotItems)` — iterates slot IDs, calls `hasActiveRegistrationsForSlot` for each. Returns true if any slot has active registrations.

---

## 4. Functional Requirements

### FR-01 — Submit Registration

`POST /events/:eventId/slots/:slotId/registrations` (VOLUNTEER):

Pre-flight checks in this exact order:
1. **Event exists & is published**: `404 {"error":"Event not found."}` if event does not exist or is not PUBLISHED/ACTIVE
2. **Slot exists**: `404 {"error":"Slot not found."}` if slot does not exist on this event
3. **Duplicate check**: Volunteer has no PENDING or CONFIRMED registration for this exact slot → `409 {"error":"You already have a registration for this slot."}`
4. **Shift overlap check**: Volunteer has no PENDING or CONFIRMED registration with an overlapping shift on ANY slot of this event → `409 {"error":"You already have a registration for an overlapping shift on this event."}`. Overlap formula: `shiftStart_A < shiftEnd_B && shiftEnd_A > shiftStart_B` (string comparison on HH:MM is lexicographically correct)
5. **Capacity check**: PENDING + CONFIRMED count for this slot < headcount → `409 {"error":"This slot is full."}`

**Check order is invariant** — duplicate fires before overlap, overlap fires before capacity. Enforced by test order in E2E specs.

On success:
- Creates REGISTRATION item via `PutItem` with `attribute_not_exists(PK)` condition (race condition guard)
- `status = PENDING`
- `PK = REG#<regId>`, `SK = META`
- `GSI4PK = EVENT#<eventId>`, `GSI4SK = REG#<regId>`
- `GSI5PK = USER#<volunteerId>`, `GSI5SK = <eventDate>#<eventId>#<slotId>`
- `GSI6PK = SLOT#<slotId>`, `GSI6SK = REG#<regId>`
- `roleId` denormalised from the slot item (for roster grouping)
- Returns `201 Created` with registration item

### FR-02 — Confirm Registration (Org Admin)

`POST /events/:eventId/registrations/:registrationId/confirm` (ORG_ADMIN):

Ownership check: event must belong to session org.

- Registration must be PENDING → `409 {"error":"Registration is not in PENDING status."}`
- Uses TransactWrite:
  1. Update REGISTRATION: `status = CONFIRMED`, `confirmedAt = now()`
  2. Update SLOT: `filledCount = filledCount + 1` with condition `filledCount < headcount` (overflow guard)
- If TransactWrite fails due to capacity overflow: `409 {"error":"This slot is full."}`
- Returns updated registration

### FR-03 — Decline Registration (Org Admin)

`POST /events/:eventId/registrations/:registrationId/decline` (ORG_ADMIN):

Request body: `{ "declineReason": "string" }` (optional)

Ownership check: event must belong to session org.

- Registration must be PENDING → `409 {"error":"Registration is not in PENDING status."}`
- UpdateItem: `status = DECLINED`, `declinedAt = now()`, `declineReason` (if provided)
- **Critical**: `status` is a DynamoDB reserved word — UpdateExpression MUST use `#status` alias with `ExpressionAttributeNames: { "#status": "status" }`. Missing alias causes `500 ValidationException`.
- No `filledCount` change (PENDING → DECLINED, was never counted)
- Returns updated registration

### FR-04 — Cancel Registration (Volunteer)

`DELETE /events/:eventId/registrations/:registrationId` (VOLUNTEER):

Ownership check: `registration.volunteerId === req.session.userId`

Blocked if event is COMPLETED: `409 {"error":"Registrations for completed events cannot be cancelled."}`

PENDING → CANCELLED:
- UpdateItem: `status = CANCELLED`, `cancelledAt = now()`
- No `filledCount` change

CONFIRMED → CANCELLED:
- TransactWrite: Update REGISTRATION `status = CANCELLED` + Update SLOT `filledCount = filledCount - 1` (condition: `filledCount > 0`)
- Returns updated registration

### FR-05 — Event Roster (Org Admin)

`GET /events/:eventId/registrations` (ORG_ADMIN):

Ownership check: event must belong to session org.

- GSI4 query: `GSI4PK = EVENT#<eventId>` — returns all registrations for the event
- Response grouped by role → slot → registrations
- **Never includes `volunteerEmail`** in any API response
- Each registration includes: `registrationId`, `volunteerName` (firstName + lastName), `status`, `createdAt`, `declineReason` (if DECLINED)
- Each slot in response includes: `slotId`, `location`, `shiftStart`, `shiftEnd`, `headcount`, `filledCount`
- Each role in response includes: `roleId`, `roleName`

### FR-06 — My Registrations (Volunteer)

`GET /me/registrations` (VOLUNTEER):

- GSI5 query: `GSI5PK = USER#<userId>` — all registrations for this volunteer, sorted by event date
- Response includes enriched fields per registration:
  - `eventTitle`, `eventDate`, `startTime`, `endTime`, `city`, `orgName`
  - `roleName`, `roleId`, `slotId`, `location`, `shiftStart`, `shiftEnd`
  - `status`, `registrationId`, `createdAt`
- `orgName` sourced from `org.name` field (NOT `org.orgName` — OrgItem uses `name`)

### FR-07 — Wire up registration delete guards (from Event Roles PRD)

Add GSI6 to DynamoDB table definition (Terraform + local bootstrap). Implement the real `hasActiveRegistrationsForSlot` and `hasActiveRegistrationsForRole` helpers in `backend/src/handlers/org-events.ts`, replacing the stubs. Update the `.todo` tests in `orgEventRoles.test.ts` to use the real implementation.

---

## 5. Non-Functional Requirements

- **Correctness**: Pre-flight check order is invariant (duplicate → overlap → capacity). Documented and enforced by E2E test order.
- **Atomicity**: Confirm and CONFIRMED-cancel use TransactWrite. No partial state possible.
- **Security**: Volunteer email never returned in any API response. Org admin can only access registrations for their own events. Volunteer can only cancel their own registrations.
- **Performance**: Submit registration completes in under 1 second (3 GetItem reads + 1 PutItem). GSI6 enables O(1) slot fill count without full table scan.
- **No migration risk**: GSI6 is additive — existing items without `GSI6PK` are simply absent from the index.

---

## 6. API Changes

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/events/:eventId/slots/:slotId/registrations` | VOLUNTEER | Submit registration for a slot |
| `POST` | `/events/:eventId/registrations/:regId/confirm` | ORG_ADMIN | Confirm PENDING registration |
| `POST` | `/events/:eventId/registrations/:regId/decline` | ORG_ADMIN | Decline PENDING registration |
| `DELETE` | `/events/:eventId/registrations/:regId` | VOLUNTEER | Cancel own registration |
| `GET` | `/events/:eventId/registrations` | ORG_ADMIN | Event roster (all registrations, grouped by role → slot) |
| `GET` | `/me/registrations` | VOLUNTEER | Volunteer's own registrations |

---

## 7. UI Screens

### Register Button (on Public Event Detail, per slot)

```
┌─────────────────────────────────────────┐
│  Steward                                │
│─────────────────────────────────────────│
│  Mile 3 marker · 10:00–11:00            │
│  3 of 5 spaces filled                   │
│  [Register for this slot]               │
│─────────────────────────────────────────│
│  Mile 3 marker · 11:00–12:00            │
│  5 of 5 spaces filled  [FULL]           │
│─────────────────────────────────────────│
│  Water station A · 10:00–11:00          │
│  1 of 3 spaces filled                   │
│  [Register for this slot]               │
└─────────────────────────────────────────┘
```

### Registration Confirmed Screen

```
┌─────────────────────────────────────────┐
│  ✓ Registration submitted!              │
├─────────────────────────────────────────┤
│  You've registered for:                 │
│  Steward — Mile 3 marker                │
│  Spring 5K Race · 12 April 2026         │
│  10:00–11:00                            │
│                                         │
│  Status: PENDING                        │
│  The organiser will review and confirm  │
│  your registration.                     │
│                                         │
│  [View my registrations]  [Back to event]│
└─────────────────────────────────────────┘
```

### My Registrations (`/dashboard/registrations`)

```
┌─────────────────────────────────────────┐
│  My Registrations                       │
├─────────────────────────────────────────┤
│  Spring 5K Race · 12 Apr 2026           │
│  Steward — Mile 3 marker                │
│  10:00–11:00                            │
│  Status: [CONFIRMED]        [Cancel]    │
│─────────────────────────────────────────│
│  Park Clean-up · 30 Mar 2026            │
│  General Helper — North gate            │
│  10:00–14:00                            │
│  Status: [PENDING]          [Cancel]    │
└─────────────────────────────────────────┘
```

### Event Roster (Org Admin) (`/organisation/events/:eventId/roster`)

```
┌─────────────────────────────────────────┐
│  Spring 5K Race — Registrations         │
├─────────────────────────────────────────┤
│  Steward                                │
│  ┌──────────────────────────────────┐   │
│  │ Mile 3 marker · 10:00–11:00      │   │
│  │ 2/5 filled                       │   │
│  │ Jane Smith    PENDING  [✓] [✗]   │   │
│  │ Bob Jones     CONFIRMED          │   │
│  ├──────────────────────────────────┤   │
│  │ Water station A · 10:00–11:00    │   │
│  │ 3/3 filled  FULL                 │   │
│  │ Alice Brown   CONFIRMED          │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

---

## 8. Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-01 | Volunteer can register for a slot on a PUBLISHED event; REGISTRATION item created with `status=PENDING`, `GSI6PK=SLOT#<slotId>` |
| AC-02 | Duplicate registration for same slot returns `409 "You already have a registration for this slot."` |
| AC-03 | Overlapping shift returns `409 "You already have a registration for an overlapping shift on this event."` — fires before capacity check |
| AC-04 | Full slot returns `409 "This slot is full."` — fires after overlap check passes |
| AC-05 | Capacity check uses PENDING + CONFIRMED count (conservative model) |
| AC-06 | Org Admin can confirm a PENDING registration; SLOT `filledCount` incremented atomically via TransactWrite |
| AC-07 | Confirming beyond headcount returns `409` (TransactWrite condition on filledCount < headcount) |
| AC-08 | Org Admin can decline a PENDING registration; `filledCount` unchanged |
| AC-09 | Decline/cancel update uses `ExpressionAttributeNames: { "#status": "status" }` — returns `200` not `500` |
| AC-10 | Volunteer can cancel PENDING registration; `status=CANCELLED`, no `filledCount` change |
| AC-11 | Volunteer can cancel CONFIRMED registration; SLOT `filledCount` decremented atomically |
| AC-12 | Cancellation on COMPLETED event returns `409` |
| AC-13 | `GET /events/:eventId/registrations` never includes `volunteerEmail`; response grouped by role → slot |
| AC-14 | `GET /me/registrations` returns enriched fields including `orgName`, `roleName`, `slotId`, `location`, `shiftStart`, `shiftEnd` |
| AC-15 | `hasActiveRegistrationsForSlot` correctly returns `true` via GSI6 query when PENDING/CONFIRMED registrations exist |
| AC-16 | Slot delete guard (from Event Roles PRD) now returns `409` when active registrations exist — `.todo` tests promoted to active |
| AC-17 | GSI6 added to Terraform and local DynamoDB bootstrap |

---

## 9. Out of Scope

- Waitlist (join when slot is full)
- Bulk confirm/decline operations
- Volunteer-to-volunteer messaging
- Custom registration questions per role/slot
- Registration amendments (volunteer must cancel and re-register for a different slot)
