# PRD: Event Roles

## 1. Background

Events without roles cannot accept volunteer registrations — roles are the atomic unit that volunteers sign up for. Each role has a name, optional description, headcount (capacity), and a shift window (start/end time). Roles are stored as items in the same DynamoDB partition as the event (`PK=EVENT#<eventId>`), enabling efficient retrieval of an event and all its roles in a single query. Role management (add, edit, delete) is only permitted on DRAFT events.

## 2. User Roles

| Role | Description |
|---|---|
| **Org Admin** | Adds, edits, and deletes roles on their DRAFT events |

## 3. Functional Requirements

### FR-01 — Add Role to Event

`POST /organisation/events/:eventId/roles` (ORG_ADMIN, requireApprovedOrg):

Request body:
- `name` (2–100 chars, required)
- `description` (optional, max 500 chars)
- `headcount` (integer 1–500, required)
- `shiftStart` (HH:MM, required)
- `shiftEnd` (HH:MM, must be after shiftStart, required)
- `skillIds` (optional array of skill IDs)
- `locationNotes` (optional, max 200 chars)

Role item schema:
- `PK = EVENT#<eventId>`, `SK = ROLE#<roleId>`
- `entityType = ROLE`
- `filledCount = 0` (maintained by confirm/cancel TransactWrite operations)
- `status = OPEN`

Returns `404` if event not found or not owned by session org.
Returns `409 {"error":"Only DRAFT events can be modified."}` if event is not DRAFT.

### FR-02 — Edit Role

`PATCH /organisation/events/:eventId/roles/:roleId` (ORG_ADMIN):
- Accepts any subset of role fields
- Returns `409` if event is not DRAFT
- Returns `404` if role not found
- Editing `headcount` below the current `filledCount` returns `409 {"error":"Cannot reduce headcount below current filled count."}`

### FR-03 — Delete Role

`DELETE /organisation/events/:eventId/roles/:roleId` (ORG_ADMIN):
- Checks for existing PENDING or CONFIRMED registrations on the role
- If any exist: `409 {"error":"Cannot delete a role with active registrations. Decline all registrations first."}`
- If none: deletes role item
- Returns `409` if event is not DRAFT

### FR-04 — Get Roles (included in event GET)

`GET /organisation/events/:eventId` returns the event plus a `roles` array:
```json
{
  "eventId": "...",
  "title": "...",
  "status": "DRAFT",
  "roles": [
    {
      "roleId": "...",
      "name": "Water Station Marshal",
      "headcount": 5,
      "filledCount": 0,
      "shiftStart": "08:00",
      "shiftEnd": "12:00",
      "status": "OPEN"
    }
  ]
}
```

Roles query: `Query PK=EVENT#<eventId>, SK begins_with ROLE#` — retrieves all roles in the same partition.

---

## 4. Non-Functional Requirements

- **Security**: Ownership enforced — org admin can only modify roles on their own events.
- **Performance**: Role add/edit/delete are single-item DynamoDB writes. Role list is a partition query — sub-10ms.
- **Scalability**: Storing roles in the same partition as the event enables efficient single-query retrieval.

---

## 5. API Changes

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/organisation/events/:eventId/roles` | ORG_ADMIN | Add a role to a DRAFT event |
| `PATCH` | `/organisation/events/:eventId/roles/:roleId` | ORG_ADMIN | Edit a role |
| `DELETE` | `/organisation/events/:eventId/roles/:roleId` | ORG_ADMIN | Delete a role (no active registrations) |

---

## 6. UI Screens

### Event Detail / Role Management (`/organisation/events/:eventId`)
```
┌─────────────────────────────────────────┐
│  ← Dashboard                            │
│  Spring 5K Race              [DRAFT]    │
│  12 Apr 2026 · 09:00–17:00             │
├─────────────────────────────────────────┤
│  Roles                    [+ Add role]  │
│─────────────────────────────────────────│
│  Water Station Marshal                  │
│  08:00–12:00 · 5 spaces · 0 filled     │
│                         [Edit] [Delete] │
│─────────────────────────────────────────│
│  Finish Line Marshal                    │
│  12:00–16:00 · 3 spaces · 0 filled     │
│                         [Edit] [Delete] │
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
│  │ Water Station Marshal           │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Shift start       Shift end            │
│  ┌─────────────┐  ┌─────────────────┐   │
│  │ 08:00       │  │ 12:00           │   │
│  └─────────────┘  └─────────────────┘   │
│                                         │
│  Spaces needed                          │
│  ┌─────────────────────────────────┐    │
│  │ 5                               │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Description (optional)                 │
│  ┌─────────────────────────────────┐    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│                                         │
│              [Cancel]  [Save role]      │
└─────────────────────────────────────────┘
```

---

## 7. Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-01 | Org Admin can add a role to a DRAFT event; ROLE item created in same DynamoDB partition as event |
| AC-02 | New role has `filledCount=0` and `status=OPEN` |
| AC-03 | Adding role to non-DRAFT event returns `409` |
| AC-04 | Org Admin can edit role name, description, headcount, shift times |
| AC-05 | Reducing headcount below filledCount returns `409` |
| AC-06 | Org Admin can delete a role with no active registrations |
| AC-07 | Deleting a role with PENDING or CONFIRMED registrations returns `409` |
| AC-08 | `GET /organisation/events/:eventId` returns `roles` array with all roles |
| AC-09 | Attempting to modify another org's event roles returns `404` |

---

## 8. Out of Scope

- Role templates / presets
- Role skills requirement enforcement (skills are informational only in MVP)
- Role-level visibility to volunteers (volunteers see roles on the public event detail)
- Role capacity increase after registrations are confirmed
