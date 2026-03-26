# PRD: Event Discovery

## 1. Background

Volunteers need a way to find events to sign up for. The discovery feed is the demand-side entry point — it shows all PUBLISHED events sorted by date ascending, with filtering by event type, city, and date range. The feed uses cursor-based pagination (20 per page) and is accessible only to VOLUNTEER sessions. Org Admins are blocked from the discovery feed to prevent orgs from browsing each other's events. The UI uses skeleton loaders for initial load and a "Load more" button for pagination.

## 2. User Roles

| Role | Description |
|---|---|
| **Volunteer** | Browses PUBLISHED events; filters by type, city, date range |

## 3. Functional Requirements

### FR-01 — Event Discovery Feed

`GET /events` (VOLUNTEER only — ORG_ADMIN returns `403`):

Query parameters:
- `typeId` — filter by event type ID (optional)
- `city` — case-insensitive substring match, minimum 2 chars (optional)
- `from` — ISO date, filter events on or after this date (optional)
- `to` — ISO date, filter events on or before this date (optional)
- `limit` — max 50 (default 20)
- `cursor` — pagination cursor (base64-encoded LastEvaluatedKey)

Response per event:
```json
{
  "eventId": "...",
  "title": "...",
  "orgName": "...",
  "eventTypeName": "...",
  "eventDate": "2026-04-12",
  "startTime": "09:00",
  "endTime": "17:00",
  "city": "Redhill",
  "status": "PUBLISHED",
  "totalRoles": 3,
  "totalHeadcount": 15,
  "totalFilledCount": 4
}
```

Only returns events where `eventDate >= today` and `status IN (PUBLISHED, ACTIVE)`.

Implementation: GSI3 query on `GSI3PK = EVENT_STATUS#PUBLISHED`, ScanIndexForward: true (date ascending).

### FR-02 — Filtering

- `typeId`: filter applied after GSI3 query (DynamoDB FilterExpression) — acceptable at MVP scale
- `city`: case-insensitive `contains` filter on `city` attribute
- Date range: `GSI3SK BETWEEN from#<from> AND to#<to>` if both from+to provided; otherwise `>=` or `<=` individually
- `city` minimum 2 chars enforced server-side; shorter returns `400`

### FR-03 — Event Detail (Volunteer View)

`GET /events/:eventId` (VOLUNTEER):
- Returns full event detail including roles array
- Each role includes: `roleId`, `name`, `description`, `headcount`, `filledCount`, `shiftStart`, `shiftEnd`, `skillIds`, `isFull` (filledCount >= headcount)
- Does NOT include individual volunteer names or emails (privacy)
- Returns `404` if event is not PUBLISHED/ACTIVE or does not exist

### FR-04 — Discovery Page UI

`/events` route:
- Event cards in a responsive grid (2 cols desktop, 1 col mobile)
- Each card: title, org name, event type badge, date, time, city, fill indicator (`4/15 volunteers`)
- Empty state: "No events found matching your filters" with a "Clear filters" link
- No events at all: "No upcoming events yet. Check back soon."
- Filter bar: event type dropdown, city text input (300ms debounce), date range pickers
- Filters update URL query params (shareable/bookmarkable URLs)
- "Load more" button appends next page; skeleton loaders during fetch

---

## 4. Non-Functional Requirements

- **Security**: VOLUNTEER-only; ORG_ADMIN calling this endpoint returns `403`. Volunteer email never included in any discovery response.
- **Performance**: GSI3 query returns first page in under 200ms. Filter bar debounced at 300ms to avoid excessive API calls.
- **Scalability**: Cursor pagination — no full table scans. GSI3 designed to support thousands of events.
- **Accessibility**: Filter controls have accessible labels; event cards are keyboard-navigable; skeleton loaders have appropriate ARIA roles.

---

## 5. API Changes

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/events` | VOLUNTEER | Paginated event discovery feed |
| `GET` | `/events/:eventId` | VOLUNTEER | Event detail + roles |

---

## 6. UI Screens

### Discovery Feed (`/events`)
```
┌─────────────────────────────────────────┐
│  ◆ Gatherly                   [🔔] [👤] │
├─────────────────────────────────────────┤
│  Find events near you                   │
│                                         │
│  [All types ▼]  [City...]  [Date range] │
├─────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐     │
│  │ Spring 5K    │  │ Park Clean   │     │
│  │ Running Race │  │ Community    │     │
│  │ Redhill      │  │ Dorking      │     │
│  │ 12 Apr 26    │  │ 30 Mar 26    │     │
│  │ 09:00–17:00  │  │ 10:00–14:00  │     │
│  │ 4/15 spaces  │  │ 2/10 spaces  │     │
│  └──────────────┘  └──────────────┘     │
│                                         │
│             [Load more]                 │
└─────────────────────────────────────────┘
```

### Event Detail (`/events/:eventId`)
```
┌─────────────────────────────────────────┐
│  ← Events                               │
│  Spring 5K Race 2026                    │
│  Redhill Harriers                       │
├─────────────────────────────────────────┤
│  📅 12 April 2026                       │
│  🕐 09:00 – 17:00                       │
│  📍 Redhill Park, RH1 1AA               │
│                                         │
│  About this event                       │
│  Annual charity 5K run...               │
├─────────────────────────────────────────┤
│  Volunteer Roles                        │
│─────────────────────────────────────────│
│  Water Station Marshal                  │
│  08:00–12:00 · 3/5 filled              │
│              [Register for this role →] │
│─────────────────────────────────────────│
│  Finish Line Marshal        FULL        │
│  12:00–16:00 · 3/3 filled              │
└─────────────────────────────────────────┘
```

---

## 7. Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-01 | VOLUNTEER can browse PUBLISHED events at `/events` |
| AC-02 | ORG_ADMIN calling `GET /events` returns `403` |
| AC-03 | Events are sorted by eventDate ascending |
| AC-04 | Only events with `eventDate >= today` are returned |
| AC-05 | `typeId` filter returns only events of that type |
| AC-06 | `city` filter (case-insensitive) returns matching events |
| AC-07 | `city` value < 2 chars returns `400` |
| AC-08 | `GET /events/:eventId` returns roles array with `isFull` flag |
| AC-09 | Full roles still appear in event detail (with FULL indicator) |
| AC-10 | Event detail page shows "Register" button for non-full roles |
| AC-11 | Discovery page shows skeleton loaders during initial fetch |
| AC-12 | "Load more" appends next page of events |
| AC-13 | Filters update URL query params |
| AC-14 | CANCELLED/DRAFT/COMPLETED events do not appear in the feed |

---

## 8. Out of Scope

- Map-based venue visualisation
- Distance-based filtering ("events within X miles")
- Volunteer saved / bookmarked events
- Event search by keyword (title / description)
- Event recommendations / personalisation
