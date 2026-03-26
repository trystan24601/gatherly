# PRD: Event Creation & Organisation Dashboard

> 🔗 GitHub Issue: [#4 Event Creation & Organisation Dashboard](https://github.com/trystan24601/gatherly/issues/4)

## 1. Background

An approved organisation needs to create events in order to attract volunteers. This feature covers the event creation form, editing of draft events, and the organisation dashboard that shows all events with their fill rates. Events start in DRAFT status and are invisible to volunteers until published (covered in the Event Lifecycle PRD). The `orgId` is always taken from the authenticated session — never from the request body — to prevent an org admin from creating events on behalf of another org.

## 2. User Roles

| Role | Description |
|---|---|
| **Org Admin** | Creates, edits, and views events for their organisation (must be APPROVED) |

## 3. Functional Requirements

### FR-01 — Create Event

`POST /organisation/events` (ORG_ADMIN, requireApprovedOrg):

Request body:
- `title` (3–150 chars, required)
- `eventTypeId` (valid skill catalogue event type, required)
- `eventDate` (ISO date, must be today or future, required)
- `startTime` (HH:MM, required)
- `endTime` (HH:MM, must be after startTime, required)
- `venueName` (required)
- `venueAddress` (required)
- `city` (required)
- `postcode` (UK postcode regex `^[A-Z]{1,2}[0-9][0-9A-Z]?\s[0-9][A-Z]{2}$`, required)
- `description` (optional, max 2000 chars)
- `maxVolunteers` (optional, integer 1–10000)

Event item schema:
- `PK = EVENT#<eventId>`, `SK = PROFILE`
- `status = DRAFT`
- `orgId` from session (never from body)
- `GSI3PK = EVENT_STATUS#DRAFT`, `GSI3SK = <eventDate>#<eventId>`

### FR-02 — Validation Rules

- Past event date: `400 {"error":"Event date must be in the future."}`
- `endTime` ≤ `startTime`: `400 {"error":"End time must be after start time."}`
- Invalid UK postcode: `400 {"error":"Please enter a valid UK postcode."}`
- Missing required field: `400 {"error":"<fieldName> is required."}`

### FR-03 — Edit Draft Event

`PATCH /organisation/events/:eventId` (ORG_ADMIN, requireApprovedOrg):
- Accepts any subset of the create fields (partial update)
- Returns `409 {"error":"Only DRAFT events can be edited."}` if event is not DRAFT
- Returns `404` if event not found or belongs to a different org
- Ownership check: `event.orgId === req.session.orgId`

### FR-04 — Get Single Event (Org View)

`GET /organisation/events/:eventId` — returns event + roles array in a single response:
```json
{
  "eventId": "...",
  "title": "...",
  "status": "DRAFT",
  "roles": [...]
}
```

### FR-05 — List Org Events

`GET /organisation/events?limit=20&cursor=<cursor>` — all events for the org, sorted by eventDate descending.

Response per event includes: `eventId`, `title`, `eventDate`, `status`, `totalRoles`, `totalHeadcount`, `filledCount`, `fillRate` (filledCount / totalHeadcount, percentage).

### FR-06 — Organisation Dashboard

`GET /organisation/dashboard` renders:
- Events table with columns: Title, Date, Status badge, Roles, Fill rate
- Empty state when no events exist
- "Create event" CTA button
- Status badges use pill shapes (design system): DRAFT (grey), PUBLISHED (green), CANCELLED (red), COMPLETED (muted)

---

## 4. Non-Functional Requirements

- **Security**: `orgId` always sourced from session middleware — never trusted from request body.
- **Performance**: Create event completes in under 1 second. Dashboard list query uses GSI3 (no table scan).
- **Accessibility**: Date/time inputs have accessible labels; error messages announced by screen readers.
- **Scalability**: Event list uses cursor pagination — no full table scans.

---

## 5. API Changes

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/organisation/events` | ORG_ADMIN | Create a new DRAFT event |
| `GET` | `/organisation/events` | ORG_ADMIN | List all events for the org |
| `GET` | `/organisation/events/:eventId` | ORG_ADMIN | Get event detail + roles |
| `PATCH` | `/organisation/events/:eventId` | ORG_ADMIN | Edit a DRAFT event |

---

## 6. UI Screens

### Create Event Form (`/organisation/events/new`)
```
┌─────────────────────────────────────────┐
│  ← Organisation Dashboard               │
│  New Event                              │
├─────────────────────────────────────────┤
│  Event title                            │
│  ┌─────────────────────────────────┐    │
│  │ e.g. Redhill Half Marathon 2026 │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Event type          Date               │
│  ┌─────────────────┐ ┌───────────────┐  │
│  │ Running Race  ▼ │ │ DD/MM/YYYY    │  │
│  └─────────────────┘ └───────────────┘  │
│                                         │
│  Start time          End time           │
│  ┌─────────────────┐ ┌───────────────┐  │
│  │ 09:00           │ │ 17:00         │  │
│  └─────────────────┘ └───────────────┘  │
│                                         │
│  Venue name                             │
│  ┌─────────────────────────────────┐    │
│  └─────────────────────────────────┘    │
│  Address                                │
│  ┌─────────────────────────────────┐    │
│  └─────────────────────────────────┘    │
│  City               Postcode           │
│  ┌─────────────────┐ ┌───────────────┐  │
│  └─────────────────┘ └───────────────┘  │
│                                         │
│  Description (optional)                 │
│  ┌─────────────────────────────────┐    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │        Save as draft            │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

### Organisation Dashboard (`/organisation/dashboard`)
```
┌─────────────────────────────────────────┐
│  Redhill Harriers                       │
│  Dashboard                   [+ Event]  │
├─────────────────────────────────────────┤
│  Title           Date   Status  Fill   │
│─────────────────────────────────────────│
│  Spring 5K Race  Apr 12 DRAFT   0/20   │
│  Park Clean-up   Mar 30 PUBLISHED 8/10 │
│─────────────────────────────────────────│
│                   [Load more]           │
└─────────────────────────────────────────┘
```

---

## 7. Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-01 | Org Admin can create an event; EVENT item created in DynamoDB with `status=DRAFT` and correct `orgId` from session |
| AC-02 | `orgId` in request body is ignored; event always assigned to the session org |
| AC-03 | Past event date returns `400` |
| AC-04 | `endTime` before `startTime` returns `400` |
| AC-05 | Invalid UK postcode returns `400` |
| AC-06 | Editing a DRAFT event updates the item; returns updated event |
| AC-07 | Attempting to edit a PUBLISHED event returns `409` |
| AC-08 | Org Admin cannot edit another org's event (returns `404`) |
| AC-09 | `GET /organisation/events` returns events sorted by date descending with fill rate |
| AC-10 | Dashboard shows empty state when org has no events |
| AC-11 | Dashboard shows DRAFT, PUBLISHED status badges in correct colours |

---

## 8. Out of Scope

- Event templates / duplication
- Multi-day events
- Map-based venue selection
- Rich text / markdown event descriptions
- Event image upload
- Event type management (covered in separate admin feature)
