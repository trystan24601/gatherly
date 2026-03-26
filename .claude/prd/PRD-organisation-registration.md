# PRD: Organisation Registration

## 1. Background

Organisations are the supply side of the platform. Without at least one approved organisation, there are no events and no volunteers to serve. This feature covers the full journey from an anonymous user submitting an organisation registration form through to a Super Admin approving or rejecting it, and the Org Admin receiving an email notification and being able to log in. The registration is atomic — partial writes are impossible using DynamoDB TransactWrite. Email uniqueness is enforced at both the org contact email and the admin email level via sentinel items.

## 2. User Roles

| Role | Description |
|---|---|
| **Anonymous User** | Completes the org registration form; becomes the Org Admin on submission |
| **Org Admin** | The account created during org registration; logs in after approval |
| **Super Admin** | Reviews and approves or rejects PENDING organisations |

## 3. Functional Requirements

### FR-01 — Organisation Registration Form

`POST /organisations/register` accepts:
- Org details: `name` (3–100 chars), `orgType` (SPORTS_CLUB | CHARITY | COMMUNITY | OTHER), `description` (20–1000 chars), `contactEmail` (valid email), `contactPhone` (UK format), `website` (optional URL)
- Admin account: `adminFirstName`, `adminLastName`, `adminEmail` (valid email), `adminPassword` (min 8 chars, 1 uppercase, 1 number)

### FR-02 — Atomic Write with Uniqueness Guards

On submission, a single TransactWrite creates three items simultaneously:
1. USER item (`PK=USER#<userId>`, `SK=PROFILE`, `role=ORG_ADMIN`) — ConditionExpression: `attribute_not_exists(PK)`
2. ORG item (`PK=ORG#<orgId>`, `SK=PROFILE`, `status=PENDING`) — ConditionExpression: `attribute_not_exists(PK)`
3. ORGEMAIL sentinel (`PK=ORGEMAIL#<contactEmail>`, `SK=LOCK`) — ConditionExpression: `attribute_not_exists(PK)`

If any condition fails, the entire transaction fails — no partial writes.

Duplicate org contact email: `409 {"error":"An organisation with this email is already registered."}`
Duplicate admin email: `409 {"error":"An account with this email already exists."}` (checked via USEREMAIL sentinel in a separate pre-check GetItem before the TransactWrite)

### FR-03 — Post-Submission State

- User is NOT auto-logged-in after submission
- Shown a confirmation screen: "Your organisation has been submitted for review. We'll email you when it's been approved."
- An SQS message `ORG_SUBMITTED` is enqueued (for future notification use; no email sent in MVP at submission time)

### FR-04 — Org Admin Login States

When an Org Admin logs in:
- `status=PENDING` → redirected to `/organisation/pending` (cannot access any org features)
- `status=REJECTED` → redirected to `/organisation/rejected` showing verbatim `rejectionReason`
- `status=APPROVED` → redirected to `/organisation/dashboard`
- `status=SUSPENDED` → `403 {"error":"Your organisation has been suspended."}`

All ORG_ADMIN-scoped API endpoints return `403 {"error":"Organisation is not approved."}` for non-APPROVED orgs (enforced by `requireApprovedOrg` middleware).

### FR-05 — Super Admin Approval Queue

`GET /admin/organisations?status=PENDING&limit=20&cursor=<cursor>` — paginated list of PENDING orgs (GSI1, oldest-first). Response includes org name, type, submitted date, contact email, admin name.

`GET /admin/organisations/:orgId` — full org detail for review.

### FR-06 — Approve Organisation

`POST /admin/organisations/:orgId/approve`
- Sets `status=APPROVED`, `approvedAt=now()`, `approvedBy=<superAdminUserId>`
- Updates `GSI1PK` from `ORG_STATUS#PENDING` to `ORG_STATUS#APPROVED`
- Enqueues SQS message `ORG_APPROVED` with org details (triggers approval email to org admin via SES — viewable in Mailhog locally)
- Returns updated org item

### FR-07 — Reject Organisation

`POST /admin/organisations/:orgId/reject`
- Body: `{ "reason": "string" }` — minimum 10 characters
- Sets `status=REJECTED`, `rejectedAt=now()`, `rejectionReason=<reason>`
- Updates `GSI1PK` from `ORG_STATUS#PENDING` to `ORG_STATUS#REJECTED`
- Enqueues SQS message `ORG_REJECTED` with verbatim reason (triggers rejection email)
- Returns updated org item

---

## 4. Non-Functional Requirements

- **Security**: Admin password hashed bcrypt cost 12. No org contact email leaked to API responses beyond the org admin's own profile. TransactWrite ensures atomicity — no orphaned USER items without a corresponding ORG.
- **Performance**: Registration form submission completes in under 2 seconds including DynamoDB write and SQS enqueue.
- **Accessibility**: Multi-step form fully keyboard-navigable; all fields have associated labels; inline validation errors announced by screen readers.
- **Scalability**: GSI1 (approval queue) supports thousands of PENDING orgs with cursor pagination.

---

## 5. API Changes

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/organisations/register` | None | Submit org registration |
| `GET` | `/admin/organisations` | SUPER_ADMIN | List orgs by status (paginated) |
| `GET` | `/admin/organisations/:orgId` | SUPER_ADMIN | Get org detail |
| `POST` | `/admin/organisations/:orgId/approve` | SUPER_ADMIN | Approve organisation |
| `POST` | `/admin/organisations/:orgId/reject` | SUPER_ADMIN | Reject organisation (requires reason) |

---

## 6. UI Screens

### Organisation Registration Form (`/register/organisation`)
```
┌─────────────────────────────────────────┐
│  ◆ Gatherly                             │
├─────────────────────────────────────────┤
│  Register your organisation             │
│                                         │
│  ── Organisation Details ──────────     │
│  Organisation name                      │
│  ┌─────────────────────────────────┐    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│  Type   [SPORTS_CLUB ▼]                 │
│  Description                            │
│  ┌─────────────────────────────────┐    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│  Contact email    Contact phone         │
│  ┌─────────────┐  ┌─────────────────┐   │
│  │             │  │                 │   │
│  └─────────────┘  └─────────────────┘   │
│                                         │
│  ── Your Admin Account ────────────     │
│  First name          Last name          │
│  ┌───────────────┐  ┌───────────────┐   │
│  │               │  │               │   │
│  └───────────────┘  └───────────────┘   │
│  Your email                             │
│  ┌─────────────────────────────────┐    │
│  └─────────────────────────────────┘    │
│  Password                               │
│  ┌─────────────────────────────────┐    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │     Submit for approval         │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

### Super Admin Approval Queue (`/admin/organisations`)
```
┌─────────────────────────────────────────┐
│  Admin › Organisations                  │
│  [PENDING ▼]                [Filter]    │
├─────────────────────────────────────────┤
│  Redhill Harriers           PENDING     │
│  Sports Club · Submitted 2d ago    [›]  │
│─────────────────────────────────────────│
│  Marshalling Heroes         PENDING     │
│  Charity · Submitted 5d ago        [›]  │
├─────────────────────────────────────────┤
│                    [Load more]          │
└─────────────────────────────────────────┘
```

### Org Pending Screen (`/organisation/pending`)
```
┌─────────────────────────────────────────┐
│  ◆ Gatherly                             │
├─────────────────────────────────────────┤
│                                         │
│  ⏳ Application under review            │
│                                         │
│  Your organisation has been submitted   │
│  and is awaiting approval. We'll email  │
│  you when a decision has been made.     │
│                                         │
│  Submitted: 14 March 2026               │
│                                         │
│  [Sign out]                             │
│                                         │
└─────────────────────────────────────────┘
```

---

## 7. Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-01 | Org registration form submits successfully; USER, ORG, and ORGEMAIL items created in DynamoDB |
| AC-02 | Duplicate org contact email returns `409`; no items written |
| AC-03 | Duplicate admin email returns `409`; no items written |
| AC-04 | After submission, user is NOT logged in; shown confirmation screen |
| AC-05 | Org Admin with PENDING org logs in and is redirected to `/organisation/pending` |
| AC-06 | Org Admin with REJECTED org logs in and sees verbatim rejection reason on `/organisation/rejected` |
| AC-07 | Super Admin can view PENDING org list at `/admin/organisations` (GSI1 query) |
| AC-08 | Super Admin approves org; status changes to APPROVED; SQS `ORG_APPROVED` message enqueued |
| AC-09 | Super Admin rejects org with reason; status changes to REJECTED; SQS `ORG_REJECTED` message enqueued |
| AC-10 | Rejection without reason (< 10 chars) returns `400` |
| AC-11 | Org Admin with APPROVED org logs in and is redirected to `/organisation/dashboard` |
| AC-12 | `POST /events` from PENDING org's admin returns `403 {"error":"Organisation is not approved."}` |
| AC-13 | Approval/rejection emails visible in Mailhog at `http://localhost:8025` |

---

## 8. Out of Scope

- Organisation profile editing post-approval (post-MVP)
- Inviting additional Org Members (post-MVP)
- Organisation suspension / reinstatement (post-MVP)
- Organisation logo / avatar upload (post-MVP)
- Multiple orgs per admin user
