# PRD: Volunteer Registration

## 1. Background

Volunteer registration is the core transaction of the platform. A volunteer selects a role on a PUBLISHED event and submits a registration request. The system runs a sequence of pre-flight checks (event exists, role exists, no duplicate, no overlapping shift, capacity not exceeded) in a fixed order. Registrations start as PENDING and can be confirmed or declined by the Org Admin. Volunteers can cancel their own registrations. The check order is critical and must never deviate — especially overlap before capacity, which is a lesson from the events-dog build.

## 2. User Roles

| Role | Description |
|---|---|
| **Volunteer** | Submits, views, and cancels registrations |
| **Org Admin** | Confirms or declines PENDING registrations |

## 3. Functional Requirements

### FR-01 — Submit Registration

`POST /events/:eventId/roles/:roleId/registrations` (VOLUNTEER):

Pre-flight checks in this exact order:
1. **Event exists**: `404 {"error":"Event not found."}` if event does not exist or is not PUBLISHED/ACTIVE
2. **Role exists**: `404 {"error":"Role not found."}` if role does not exist on this event
3. **Duplicate check**: Volunteer has no PENDING or CONFIRMED registration for this exact role → `409 {"error":"You already have a registration for this role."}`
4. **Shift overlap check**: Volunteer has no PENDING or CONFIRMED registration with an overlapping shift on ANY role of this event → `409 {"error":"You already have a registration for an overlapping shift on this event."}` Overlap formula: `shiftStart_A < shiftEnd_B && shiftEnd_A > shiftStart_B` (string comparison on HH:MM is lexicographically correct)
5. **Capacity check**: PENDING + CONFIRMED count for this role < headcount → `409 {"error":"This role is full."}`

**Check order is invariant** — duplicate fires before overlap, overlap fires before capacity. This is enforced by test order in E2E specs.

On success:
- Creates REGISTRATION item using `PutItem` with `attribute_not_exists(PK)` condition (race condition guard)
- `status = PENDING`
- `PK = REG#<regId>`, `SK = META`
- `GSI4PK = EVENT#<eventId>`, `GSI4SK = REG#<regId>` (event roster)
- `GSI5PK = USER#<volunteerId>`, `GSI5SK = <eventDate>#<eventId>#<roleId>` (volunteer's list)
- Returns `201 Created` with registration item

### FR-02 — Confirm Registration (Org Admin)

`POST /events/:eventId/roles/:roleId/registrations/:registrationId/confirm` (ORG_ADMIN):
- Registration must be PENDING → `409 {"error":"Registration is not in PENDING status."}`
- Uses TransactWrite:
  1. Update REGISTRATION: `status = CONFIRMED`
  2. Update ROLE: `filledCount = filledCount + 1` with condition `filledCount < headcount` (overflow guard)
- If TransactWrite fails due to capacity overflow: `409 {"error":"This role is full."}`
- Returns updated registration

### FR-03 — Decline Registration (Org Admin)

`POST /events/:eventId/roles/:roleId/registrations/:registrationId/decline` (ORG_ADMIN):

Request body: `{ "declineReason": "string" }` (optional)

- Registration must be PENDING → `409 {"error":"Registration is not in PENDING status."}`
- UpdateItem: `status = DECLINED`, `declinedAt = now()`, `declineReason = <reason>` (if provided)
- **Critical**: `status` is a DynamoDB reserved word — UpdateExpression MUST use `#status` alias with ExpressionAttributeNames `{ "#status": "status" }`. Missing ExpressionAttributeNames causes 500 ValidationException.
- No `filledCount` change (PENDING → DECLINED, never was counted)
- Returns updated registration

### FR-04 — Cancel Registration (Volunteer)

`DELETE /events/:eventId/roles/:roleId/registrations/:registrationId` (VOLUNTEER):

Ownership check: `registration.volunteerId === req.session.userId`

Blocked if event is COMPLETED: `409 {"error":"Registrations for completed events cannot be cancelled."}`

PENDING → CANCELLED:
- UpdateItem: `status = CANCELLED`, `cancelledAt = now()`
- No `filledCount` change

CONFIRMED → CANCELLED:
- TransactWrite: Update REGISTRATION `status = CANCELLED` + Update ROLE `filledCount = filledCount - 1` (condition: `filledCount > 0`)
- Returns updated registration

### FR-05 — Event Roster (Org Admin)

`GET /events/:eventId/registrations` (ORG_ADMIN):
- Returns all registrations for the event, grouped by role
- **Never includes `volunteerEmail`** in any API response
- Each registration includes: `registrationId`, `volunteerName` (firstName + lastName), `status`, `createdAt`, `declineReason` (if DECLINED)

### FR-06 — My Registrations (Volunteer)

`GET /me/registrations` (VOLUNTEER):
- Returns volunteer's own registrations with enriched fields:
  - `eventTitle`, `eventDate`, `startTime`, `endTime`, `city`, `orgName`
  - `roleName`, `roleId`, `shiftStart`, `shiftEnd`
  - `status`, `registrationId`, `createdAt`
- GSI5 query: `GSI5PK = USER#<userId>` — all registrations for this volunteer
- Org name sourced from `org.name` field (NOT `org.orgName` — OrgItem uses `name`)

---

## 4. Non-Functional Requirements

- **Correctness**: Pre-flight check order is invariant (duplicate → overlap → capacity). This is documented and enforced by E2E tests.
- **Atomicity**: All multi-step writes use TransactWrite. No partial state possible.
- **Security**: Volunteer email never returned in any API response. Org admin can only access registrations for their own events. Volunteer can only cancel their own registrations.
- **Performance**: Submit registration completes in under 1 second (3 GetItem reads + 1 PutItem).
- **Accessibility**: Registration confirmation screen readable by screen readers; status changes announced.

---

## 5. API Changes

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/events/:eventId/roles/:roleId/registrations` | VOLUNTEER | Submit registration |
| `POST` | `/events/:eventId/roles/:roleId/registrations/:regId/confirm` | ORG_ADMIN | Confirm PENDING registration |
| `POST` | `/events/:eventId/roles/:roleId/registrations/:regId/decline` | ORG_ADMIN | Decline PENDING registration |
| `DELETE` | `/events/:eventId/roles/:roleId/registrations/:regId` | VOLUNTEER | Cancel own registration |
| `GET` | `/events/:eventId/registrations` | ORG_ADMIN | Event roster (all registrations) |
| `GET` | `/me/registrations` | VOLUNTEER | Volunteer's own registrations |

---

## 6. UI Screens

### Register Button (on Event Detail)
```
  Water Station Marshal
  08:00–12:00 · 2/5 filled
  ┌────────────────────────────────────┐
  │   Register for this role           │
  └────────────────────────────────────┘
```

### Registration Confirmed Screen
```
┌─────────────────────────────────────────┐
│  ✓ Registration submitted!              │
├─────────────────────────────────────────┤
│  You've registered for:                 │
│  Water Station Marshal                  │
│  Spring 5K Race · 12 April 2026         │
│  08:00–12:00                            │
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
│  Spring 5K Race                         │
│  Water Station Marshal · 12 Apr 26      │
│  08:00–12:00                            │
│  Status: [CONFIRMED]        [Cancel]    │
│─────────────────────────────────────────│
│  Park Clean-up                          │
│  General Helper · 30 Mar 26             │
│  10:00–14:00                            │
│  Status: [PENDING]          [Cancel]    │
└─────────────────────────────────────────┘
```

### Event Roster (Org Admin) (`/organisation/events/:eventId/roster`)
```
┌─────────────────────────────────────────┐
│  Spring 5K Race - Registrations         │
├─────────────────────────────────────────┤
│  Water Station Marshal (2/5 filled)     │
│─────────────────────────────────────────│
│  Jane Smith      PENDING  [✓] [✗]       │
│  Bob Jones       CONFIRMED              │
├─────────────────────────────────────────┤
│  Finish Line Marshal (3/3 filled) FULL  │
│─────────────────────────────────────────│
│  Alice Brown     CONFIRMED              │
└─────────────────────────────────────────┘
```

---

## 7. Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-01 | Volunteer can register for a PUBLISHED event role; REGISTRATION item created with `status=PENDING` |
| AC-02 | Duplicate registration returns `409 "You already have a registration for this role."` |
| AC-03 | Overlapping shift returns `409 "You already have a registration for an overlapping shift on this event."` |
| AC-04 | Full role returns `409 "This role is full."` (after overlap check passes) |
| AC-05 | Capacity check uses PENDING + CONFIRMED count (conservative model) |
| AC-06 | Org Admin can confirm a PENDING registration; `filledCount` incremented atomically |
| AC-07 | Confirming beyond headcount returns `409` (TransactWrite condition) |
| AC-08 | Org Admin can decline a PENDING registration; `filledCount` unchanged |
| AC-09 | Decline/cancel update uses ExpressionAttributeNames `{ "#status": "status" }` — returns `200` not `500` |
| AC-10 | Volunteer can cancel PENDING registration; `status=CANCELLED`, no `filledCount` change |
| AC-11 | Volunteer can cancel CONFIRMED registration; `filledCount` decremented atomically |
| AC-12 | Cancellation of registration on COMPLETED event returns `409` |
| AC-13 | `GET /events/:eventId/registrations` never includes `volunteerEmail` |
| AC-14 | `GET /me/registrations` returns enriched fields including `orgName` (from `org.name`), `roleName`, `roleId` |

---

## 8. Out of Scope

- Waitlist (join when role is full)
- Bulk confirm/decline operations
- Volunteer-to-volunteer messaging
- Custom registration questions per role
- Registration amendments (volunteer cannot change which role they registered for — must cancel and re-register)
