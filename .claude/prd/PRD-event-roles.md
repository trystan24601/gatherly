# PRD: Event Roles

> 🔗 GitHub Issue: [#5 Event Roles](https://github.com/trystan24601/gatherly/issues/5)

## 1. Background

Events without roles cannot accept volunteer registrations. A **role** represents a job type at an event (e.g. "Steward", "Water Station Marshal"). Each role can have one or more **slots** — a slot is a specific combination of location, shift window, and headcount. Volunteers sign up for a slot, not a role directly.

This two-level model avoids encoding location and shift information into role names (e.g. "Steward (Mile 3 · 10:00–11:00)"), enables natural grouping in the UI, and avoids a costly data migration if slots are added later.

Both ROLE and SLOT items live in the same DynamoDB partition as the event (`PK=EVENT#<eventId>`), enabling retrieval of the full event structure in a single query. Role and slot management is only permitted on DRAFT events.

---

## 2. User Roles

| Role | Description |
|---|---|
| **Org Admin** | Adds, edits, and deletes roles and slots on their DRAFT events |

---

## 3. Domain Model

### DynamoDB item types

| Entity | PK | SK | Key attributes |
|---|---|---|---|
| ROLE | `EVENT#<eventId>` | `ROLE#<roleId>` | `name`, `description?`, `skillIds?` |
| SLOT | `EVENT#<eventId>` | `ROLE#<roleId>#SLOT#<slotId>` | `location?`, `shiftStart`, `shiftEnd`, `headcount`, `filledCount`, `status` |

ROLE items carry the human-readable job description. SLOT items carry the operational detail (when, where, how many). A role must have at least one slot before an event can be published.

Registrations (future PRD) point to a `slotId` — not a `roleId` — so fill rates are tracked at the slot level.

### Query patterns

- **All roles + slots for an event**: `Query PK=EVENT#<eventId>, SK begins_with ROLE#` — returns both ROLE and SLOT items in a single request, distinguished by `entityType`.
- **All slots for a role**: `Query PK=EVENT#<eventId>, SK begins_with ROLE#<roleId>#SLOT#`.

---

## 4. Functional Requirements

### FR-01 — Add Role

`POST /organisation/events/:eventId/roles` (ORG_ADMIN, requireApprovedOrg):

Request body:
- `name` (2–100 chars, required)
- `description` (optional, max 500 chars)
- `skillIds` (optional array of skill ID strings, informational only)

ROLE item schema:
- `PK = EVENT#<eventId>`, `SK = ROLE#<roleId>`
- `entityType = ROLE`
- `roleId` (uuid)
- `orgId` (from session, for ownership enforcement)

Returns `404` if event not found or not owned by session org.
Returns `409 {"error":"Only DRAFT events can be modified."}` if event is not DRAFT.

### FR-02 — Edit Role

`PATCH /organisation/events/:eventId/roles/:roleId` (ORG_ADMIN):
- Accepts any subset of: `name`, `description`, `skillIds`
- Returns `409` if event is not DRAFT
- Returns `404` if role not found or not owned by session org

### FR-03 — Delete Role

`DELETE /organisation/events/:eventId/roles/:roleId` (ORG_ADMIN):
- Checks for existing PENDING or CONFIRMED registrations on any slot of this role (via GSI query on `roleId`)
- If any exist: `409 {"error":"Cannot delete a role with active registrations. Decline all registrations first."}`
- If none: deletes the ROLE item and all its SLOT items in a single TransactWrite
- Returns `409` if event is not DRAFT

### FR-04 — Add Slot to Role

`POST /organisation/events/:eventId/roles/:roleId/slots` (ORG_ADMIN):

Request body:
- `shiftStart` (HH:MM, required)
- `shiftEnd` (HH:MM, must be after shiftStart, required)
- `headcount` (integer 1–500, required)
- `location` (optional, max 200 chars — e.g. "Mile 3 marker", "Water station A")

SLOT item schema:
- `PK = EVENT#<eventId>`, `SK = ROLE#<roleId>#SLOT#<slotId>`
- `entityType = SLOT`
- `slotId` (uuid)
- `roleId` (denormalised for easy lookup)
- `filledCount = 0`
- `status = OPEN`

Returns `404` if role not found or event not owned by session org.
Returns `409` if event is not DRAFT.

### FR-05 — Edit Slot

`PATCH /organisation/events/:eventId/roles/:roleId/slots/:slotId` (ORG_ADMIN):
- Accepts any subset of: `shiftStart`, `shiftEnd`, `headcount`, `location`
- Returns `409` if event is not DRAFT
- Returns `404` if slot not found
- Reducing `headcount` below current `filledCount` returns `409 {"error":"Cannot reduce headcount below current filled count."}`

### FR-06 — Delete Slot

`DELETE /organisation/events/:eventId/roles/:roleId/slots/:slotId` (ORG_ADMIN):
- Checks for existing PENDING or CONFIRMED registrations on this slot
- If any exist: `409 {"error":"Cannot delete a slot with active registrations. Decline all registrations first."}`
- If none: deletes slot item
- Returns `409` if event is not DRAFT

### FR-07 — Get Roles + Slots (included in event GET)

`GET /organisation/events/:eventId` returns the event with a nested `roles` array. Each role contains a `slots` array:

```json
{
  "eventId": "...",
  "title": "Spring 5K Race",
  "status": "DRAFT",
  "roles": [
    {
      "roleId": "role-abc",
      "name": "Steward",
      "description": "Directs runners and ensures course safety.",
      "slots": [
        {
          "slotId": "slot-1",
          "location": "Mile 3 marker",
          "shiftStart": "10:00",
          "shiftEnd": "11:00",
          "headcount": 5,
          "filledCount": 0,
          "status": "OPEN"
        },
        {
          "slotId": "slot-2",
          "location": "Mile 3 marker",
          "shiftStart": "11:00",
          "shiftEnd": "12:00",
          "headcount": 5,
          "filledCount": 0,
          "status": "OPEN"
        },
        {
          "slotId": "slot-3",
          "location": "Water station A",
          "shiftStart": "10:00",
          "shiftEnd": "11:00",
          "headcount": 3,
          "filledCount": 0,
          "status": "OPEN"
        }
      ]
    }
  ]
}
```

Implementation: single `Query PK=EVENT#<eventId>, SK begins_with ROLE#` returns all ROLE and SLOT items. Application code groups SLOT items under their parent ROLE by matching `SK` prefix.

### FR-08 — Publish guard

`POST /organisation/events/:eventId/publish` (existing endpoint) must verify that the event has **at least one role with at least one slot** before allowing the transition to PUBLISHED. Returns `400 {"error":"Event must have at least one role with at least one slot before publishing."}` if not.

---

## 5. Non-Functional Requirements

- **Security**: Ownership enforced on every endpoint — org admin can only modify roles/slots on their own events.
- **Performance**: All role + slot reads are a single DynamoDB partition query (sub-10ms). Writes are single-item PutItem/UpdateItem except role deletion (TransactWrite for role + slots).
- **Scalability**: All items in the same partition — no cross-partition joins needed for event detail retrieval.
- **No migration risk**: Registrations always point to `slotId`. The role/slot split is the canonical model from day one.

---

## 6. API Changes

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/organisation/events/:eventId/roles` | ORG_ADMIN | Create a role (job type) on a DRAFT event |
| `PATCH` | `/organisation/events/:eventId/roles/:roleId` | ORG_ADMIN | Edit role name / description |
| `DELETE` | `/organisation/events/:eventId/roles/:roleId` | ORG_ADMIN | Delete role + all its slots (no active registrations) |
| `POST` | `/organisation/events/:eventId/roles/:roleId/slots` | ORG_ADMIN | Add a slot (location + shift + headcount) to a role |
| `PATCH` | `/organisation/events/:eventId/roles/:roleId/slots/:slotId` | ORG_ADMIN | Edit slot details |
| `DELETE` | `/organisation/events/:eventId/roles/:roleId/slots/:slotId` | ORG_ADMIN | Delete a slot (no active registrations) |

---

## 7. UI Screens

### Event Detail / Role Management (`/organisation/events/:eventId`)

```
┌─────────────────────────────────────────┐
│  ← Dashboard                            │
│  Spring 5K Race              [DRAFT]    │
│  12 Apr 2026 · 09:00–17:00             │
├─────────────────────────────────────────┤
│  Roles                    [+ Add role]  │
│─────────────────────────────────────────│
│  Steward                    [+ Add slot]│
│  Directs runners on course  [Edit][Del] │
│  ┌─────────────────────────────────┐    │
│  │ Mile 3 marker                   │    │
│  │ 10:00–11:00 · 5 spaces · 0 filled   │
│  │                      [Edit][Del]│    │
│  ├─────────────────────────────────┤    │
│  │ Mile 3 marker                   │    │
│  │ 11:00–12:00 · 5 spaces · 0 filled   │
│  │                      [Edit][Del]│    │
│  ├─────────────────────────────────┤    │
│  │ Water station A                 │    │
│  │ 10:00–11:00 · 3 spaces · 0 filled   │
│  │                      [Edit][Del]│    │
│  └─────────────────────────────────┘    │
│─────────────────────────────────────────│
│  Water Station Marshal      [+ Add slot]│
│  Manages hydration points   [Edit][Del] │
│  ┌─────────────────────────────────┐    │
│  │ Station B                       │    │
│  │ 09:00–13:00 · 4 spaces · 0 filled   │
│  │                      [Edit][Del]│    │
│  └─────────────────────────────────┘    │
├─────────────────────────────────────────┤
│  [Publish event]                        │
└─────────────────────────────────────────┘
```

### Add / Edit Role Modal

```
┌─────────────────────────────────────────┐
│  Add Role                         [×]   │
├─────────────────────────────────────────┤
│  Role name                              │
│  ┌─────────────────────────────────┐    │
│  │ Steward                         │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Description (optional)                 │
│  ┌─────────────────────────────────┐    │
│  │ Directs runners and ensures...  │    │
│  └─────────────────────────────────┘    │
│                                         │
│              [Cancel]  [Save role]      │
└─────────────────────────────────────────┘
```

### Add / Edit Slot Modal

```
┌─────────────────────────────────────────┐
│  Add Slot — Steward               [×]   │
├─────────────────────────────────────────┤
│  Location (optional)                    │
│  ┌─────────────────────────────────┐    │
│  │ Mile 3 marker                   │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Shift start       Shift end            │
│  ┌─────────────┐  ┌─────────────────┐   │
│  │ 10:00       │  │ 11:00           │   │
│  └─────────────┘  └─────────────────┘   │
│                                         │
│  Spaces needed                          │
│  ┌─────────────────────────────────┐    │
│  │ 5                               │    │
│  └─────────────────────────────────┘    │
│                                         │
│              [Cancel]  [Save slot]      │
└─────────────────────────────────────────┘
```

---

## 8. Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-01 | Org Admin can create a role (name + optional description) on a DRAFT event; ROLE item created in event partition |
| AC-02 | Org Admin can add a slot to a role with shiftStart, shiftEnd, headcount, and optional location; SLOT item created with `filledCount=0`, `status=OPEN` |
| AC-03 | Adding a role or slot to a non-DRAFT event returns `409` |
| AC-04 | Org Admin can edit role name and description |
| AC-05 | Org Admin can edit slot location, shift times, and headcount |
| AC-06 | Reducing slot headcount below filledCount returns `409` |
| AC-07 | Org Admin can delete a role with no slots, or a role whose slots have no active registrations; deletes ROLE + all SLOT items atomically |
| AC-08 | Org Admin can delete a slot with no active registrations |
| AC-09 | Deleting a role or slot with PENDING or CONFIRMED registrations returns `409` |
| AC-10 | `GET /organisation/events/:eventId` returns `roles` array with nested `slots` array per role |
| AC-11 | Attempting to publish an event with no roles, or a role with no slots, returns `400` |
| AC-12 | Attempting to modify another org's event roles or slots returns `404` |

---

## 9. Out of Scope

- Role templates / presets (create "Steward" once and reuse across events)
- Slot duplication UI (duplicate a slot and change one field) — follow-up UX improvement
- Skill requirement enforcement (skillIds are informational only in MVP)
- Role/slot-level visibility controls (volunteers see all published roles and slots)
- Slot capacity increase after registrations are confirmed
