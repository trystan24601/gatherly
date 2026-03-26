# PRD: Event Lifecycle

> 🔗 GitHub Issue: [#6 Event Lifecycle](https://github.com/trystan24601/gatherly/issues/6)

## 1. Background

A DRAFT event is invisible to volunteers. The publish action is what makes an event real — it moves the event from DRAFT to PUBLISHED, making it visible in the volunteer discovery feed. Cancellation is the inverse: it removes an event from discovery and notifies all registered volunteers. An event can only move forward through the lifecycle (DRAFT → PUBLISHED → COMPLETED or CANCELLED); no backwards transitions are permitted.

## 2. User Roles

| Role | Description |
|---|---|
| **Org Admin** | Publishes and cancels events for their organisation |

## 3. Functional Requirements

### FR-01 — Publish Event

`POST /organisation/events/:eventId/publish` (ORG_ADMIN, requireApprovedOrg):
- Pre-condition: event must be DRAFT and have at least one role
- Zero roles: `400 {"error":"An event must have at least one role before it can be published."}`
- Not DRAFT: `409 {"error":"Only DRAFT events can be published."}`
- On success:
  - Sets `status=PUBLISHED`, `publishedAt=now()`
  - Updates `GSI3PK` from `EVENT_STATUS#DRAFT` to `EVENT_STATUS#PUBLISHED`
  - Returns updated event

### FR-02 — Cancel Event

`POST /organisation/events/:eventId/cancel` (ORG_ADMIN, requireApprovedOrg):
- Pre-condition: event must be PUBLISHED or ACTIVE
- DRAFT event cancellation: `409 {"error":"Draft events cannot be cancelled. Delete the event instead."}`
- COMPLETED event: `409 {"error":"Completed events cannot be cancelled."}`
- On success:
  - Sets `status=CANCELLED`, `cancelledAt=now()`
  - Updates `GSI3PK` from `EVENT_STATUS#PUBLISHED` to `EVENT_STATUS#CANCELLED`
  - Enqueues SQS message `EVENT_CANCELLED` with list of affected volunteer registrations (for notification fan-out)
  - Returns updated event

### FR-03 — Complete Event (System / Super Admin)

Events are completed automatically by a scheduled job when `eventDate + endTime` is in the past, or manually by a Super Admin:

`POST /admin/events/:eventId/complete` (SUPER_ADMIN):
- Pre-condition: event must be PUBLISHED or ACTIVE
- Sets `status=COMPLETED`, `completedAt=now()`
- Updates `GSI3PK` to `EVENT_STATUS#COMPLETED`

### FR-04 — Lifecycle Transition Guard

All API endpoints that modify event data (add role, edit event, etc.) check event status first:
- Only DRAFT events can be edited
- Only DRAFT events can have roles added/edited/deleted
- Only PUBLISHED/ACTIVE events can be cancelled
- COMPLETED/CANCELLED events are immutable

### FR-05 — Event Status Propagation

When an event is cancelled:
- All PENDING registrations for all roles on the event are set to `CANCELLED`
- No `filledCount` changes (cancelled registrations don't decrement — event is gone)
- Volunteers are notified via SQS-triggered SES email (visible in Mailhog locally)

---

## 4. Non-Functional Requirements

- **Security**: Org admin can only publish/cancel their own events (ownership check enforced).
- **Performance**: Publish is a single DynamoDB UpdateItem; completes in under 500ms.
- **Consistency**: Cancel + bulk registration cancellation uses a DynamoDB TransactWrite (max 25 items per transaction). For events with > 25 registrations, sequential transactions are used.

---

## 5. API Changes

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/organisation/events/:eventId/publish` | ORG_ADMIN | Publish a DRAFT event |
| `POST` | `/organisation/events/:eventId/cancel` | ORG_ADMIN | Cancel a PUBLISHED event |
| `POST` | `/admin/events/:eventId/complete` | SUPER_ADMIN | Mark event as COMPLETED |

---

## 6. UI Screens

### Event Detail with Lifecycle Actions (`/organisation/events/:eventId`)
```
┌─────────────────────────────────────────┐
│  ← Dashboard                            │
│  Spring 5K Race           [PUBLISHED]   │
│  12 Apr 2026 · 09:00–17:00             │
├─────────────────────────────────────────┤
│  Roles (2)              Fill: 3/8 (38%) │
│─────────────────────────────────────────│
│  Water Station Marshal   08:00–12:00    │
│  2/5 filled                             │
│  Finish Line Marshal     12:00–16:00    │
│  1/3 filled                             │
├─────────────────────────────────────────┤
│  ┌──────────────────────────────────┐   │
│  │   ⚠ Cancel event                │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### Cancel Confirmation Modal
```
┌─────────────────────────────────────────┐
│  Cancel event?                    [×]   │
├─────────────────────────────────────────┤
│  This will cancel Spring 5K Race and    │
│  notify all 3 registered volunteers.   │
│                                         │
│  This action cannot be undone.          │
│                                         │
│         [Keep event]  [Cancel event]    │
└─────────────────────────────────────────┘
```

---

## 7. Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-01 | DRAFT event with at least one role can be published; `status=PUBLISHED` in DynamoDB |
| AC-02 | Attempting to publish a DRAFT event with zero roles returns `400` |
| AC-03 | Published event appears in volunteer discovery feed |
| AC-04 | PUBLISHED event can be cancelled; `status=CANCELLED` in DynamoDB |
| AC-05 | DRAFT event cancellation returns `409` |
| AC-06 | COMPLETED event cancellation returns `409` |
| AC-07 | Cancellation enqueues `EVENT_CANCELLED` SQS message |
| AC-08 | All PENDING registrations for a cancelled event are set to `CANCELLED` |
| AC-09 | COMPLETED event is no longer visible in the discovery feed |

---

## 8. Out of Scope

- Event duplication / clone from cancelled
- Re-opening a CANCELLED event
- Partial cancellation (cancelling individual roles, not the whole event)
- 48-hour pre-event reminder emails
- Automatic event completion scheduled job (Super Admin manual completion only in MVP)
