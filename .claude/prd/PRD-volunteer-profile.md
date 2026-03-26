# PRD: Volunteer Profile & Skills

> 🔗 GitHub Issue: [#9 Volunteer Profile & Skills](https://github.com/trystan24601/gatherly/issues/9)

## 1. Background

Without a profile, volunteers are anonymous and organisations cannot properly vet or match them to roles. The profile feature gives volunteers a way to describe themselves, set their availability preferences, and list their skills. The profile completeness score is computed client-side from 8 optional fields and never persisted to DynamoDB. The skills catalogue is managed by Super Admins and provides a controlled vocabulary for matching volunteers to role skill requirements.

## 2. User Roles

| Role | Description |
|---|---|
| **Volunteer** | Updates their own profile, skills, password, and email |
| **Super Admin** | Manages the global skill catalogue (add, update, deactivate) |

## 3. Functional Requirements

### FR-01 — Update Volunteer Profile

`PATCH /me/profile` (VOLUNTEER):

Updatable fields:
- `firstName`, `lastName` (2–50 chars each)
- `bio` (max 500 chars)
- `phone` (optional, UK phone format)
- `locationTown` (optional, max 100 chars)
- `locationPostcode` (optional, UK postcode regex)
- `travelRadiusMiles` (optional: 5 | 10 | 25 | 50 | 999)
- `availabilityDays` (optional array of strings: MON | TUE | WED | THU | FRI | SAT | SUN)
- `availabilityTimeOfDay` (optional: MORNING | AFTERNOON | EVENING | FLEXIBLE)
- `isDiscoverable` (optional boolean — whether org admins can browse this volunteer's profile)

Returns updated user profile (no password hash).

### FR-02 — Profile Completeness Score

Client-side only — never persisted:
- Completeness = (filled optional fields / 8) × 100%
- 8 optional fields: `bio`, `phone`, `locationTown`, `locationPostcode`, `travelRadiusMiles`, `availabilityDays`, `availabilityTimeOfDay`, `isDiscoverable`
- Displayed as a progress bar on the profile page
- Not stored in DynamoDB (recomputed on each render)

### FR-03 — Volunteer Skills

`PUT /me/skills` (VOLUNTEER):

Replaces volunteer's full skill set with a diff reconcile:
1. Fetch existing `VOLUNTEER_SKILL` items for this user (Query PK=USER#<userId>, SK begins_with SKILL#)
2. Compute diff: add new skills, delete removed ones, ignore unchanged
3. Max 30 skills enforced server-side — `400 {"error":"Maximum 30 skills allowed."}`
4. Writes additions and deletions using TransactWrite (batched if needed)

Schema:
- `PK = USER#<userId>`, `SK = SKILL#<skillId>`
- `entityType = VOLUNTEER_SKILL`
- `addedAt = now()`

`GET /me/skills` — returns volunteer's current skill list with skill name and category.

### FR-04 — Skills Catalogue

`GET /skills` (any authenticated user):
- Returns all **active** skills grouped by category
- Eligible for a 5-minute in-memory cache (cache invalidated on any admin skill write)
- Response format:
```json
{
  "categories": [
    {
      "category": "Safety",
      "skills": [
        { "skillId": "...", "name": "First Aid", "isActive": true }
      ]
    }
  ]
}
```

`POST /admin/skills` (SUPER_ADMIN):
- Creates a new skill: `name` (required), `category` (required), `description` (optional)
- Duplicate name within same category: `409`

`PATCH /admin/skills/:skillId` (SUPER_ADMIN):
- Updates skill `name`, `description`, or `isActive` status
- Deactivating a skill (`isActive=false`) does not remove it from existing volunteer profiles
- Deactivated skills are not returned in `GET /skills` (hidden from new selection)

### FR-05 — Deactivated Skill Handling

A deactivated skill held by a volunteer:
- Remains on their profile in `GET /me/skills` response with `isActive: false` flag
- Displayed in UI with a "No longer available" label
- Not selectable by new volunteers (not in `GET /skills` catalogue)

### FR-06 — Password Change

`PATCH /me/settings/password` (VOLUNTEER):
- Body: `{ "currentPassword": "...", "newPassword": "..." }`
- Validates `currentPassword` against stored bcrypt hash
- Wrong current password: `401 {"error":"Current password is incorrect."}`
- Updates password hash in USER item
- New password must meet complexity rules (min 8 chars, 1 uppercase, 1 number)

### FR-07 — Email Change

`PATCH /me/settings/email` (VOLUNTEER):
- Body: `{ "currentPassword": "...", "newEmail": "..." }`
- Validates `currentPassword` (required for email changes)
- Checks new email not already taken (USEREMAIL sentinel GetItem)
- Duplicate new email: `409`
- Updates `email` in USER item and deletes old USEREMAIL sentinel, creates new one (TransactWrite)

---

## 4. Non-Functional Requirements

- **Security**: Password changes require current password verification. Email change requires password. Profile update never accepts `role` or `orgId` fields (ignored if present).
- **Performance**: `GET /skills` with 5-minute in-memory cache avoids repeated DynamoDB queries for a high-read endpoint.
- **Accessibility**: Profile form is fully keyboard-navigable. Availability day checkboxes have accessible labels. Completeness progress bar has ARIA `valuenow`/`valuemax` attributes.

---

## 5. API Changes

| Method | Path | Auth | Description |
|---|---|---|---|
| `PATCH` | `/me/profile` | VOLUNTEER | Update volunteer profile |
| `GET` | `/me/profile` | VOLUNTEER | Get own profile |
| `PUT` | `/me/skills` | VOLUNTEER | Replace volunteer skill set |
| `GET` | `/me/skills` | VOLUNTEER | Get own skills |
| `GET` | `/skills` | Any auth | Browse skills catalogue |
| `POST` | `/admin/skills` | SUPER_ADMIN | Create a new skill |
| `PATCH` | `/admin/skills/:skillId` | SUPER_ADMIN | Update / deactivate a skill |
| `PATCH` | `/me/settings/password` | VOLUNTEER | Change password |
| `PATCH` | `/me/settings/email` | VOLUNTEER | Change email address |

---

## 6. UI Screens

### Volunteer Profile Page (`/profile`)
```
┌─────────────────────────────────────────┐
│  ← Dashboard                            │
│  My Profile                             │
├─────────────────────────────────────────┤
│  Profile completeness                   │
│  ████████████░░░░░░░░ 60%              │
│  Complete your profile to help orgs     │
│  find the right volunteers              │
├─────────────────────────────────────────┤
│  First name          Last name          │
│  ┌───────────────┐  ┌───────────────┐   │
│  │ Jane          │  │ Smith         │   │
│  └───────────────┘  └───────────────┘   │
│                                         │
│  Bio                                    │
│  ┌─────────────────────────────────┐    │
│  │ I love community events...      │    │
│  │                        42/500   │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Location town      Postcode            │
│  ┌─────────────────┐ ┌───────────────┐  │
│  │ Redhill         │ │ RH1 1AA       │  │
│  └─────────────────┘ └───────────────┘  │
│                                         │
│  Travel radius  [Up to 25 miles ▼]      │
│                                         │
│  Availability                           │
│  [Mon] [Tue] [Wed] [Thu] [Fri] [Sat]    │
│  [Sun]                                  │
│                                         │
│  Time of day  [FLEXIBLE ▼]              │
│                                         │
│  ☑ Make my profile visible to orgs      │
│                                         │
│  [Save changes]                         │
└─────────────────────────────────────────┘
```

### Skills Page (`/profile/skills`)
```
┌─────────────────────────────────────────┐
│  ← Profile                              │
│  My Skills (3/30)                       │
├─────────────────────────────────────────┤
│  Safety                                 │
│  ☑ First Aid    ☐ Fire Safety           │
│                                         │
│  Logistics                              │
│  ☑ Marshal      ☑ Event Setup           │
│  ☐ Radio Comms  ☐ Traffic Management    │
│                                         │
│  Technical                              │
│  ☐ Sound Tech   ☐ AV Setup              │
├─────────────────────────────────────────┤
│  [Save skills]                          │
└─────────────────────────────────────────┘
```

---

## 7. Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-01 | Volunteer can update bio, location, availability, travel radius, isDiscoverable |
| AC-02 | Bio exceeding 500 chars returns `400` |
| AC-03 | Invalid UK postcode returns `400` |
| AC-04 | Profile completeness score is computed client-side from 8 optional fields; not stored in DynamoDB |
| AC-05 | Volunteer can set skills from catalogue; `PUT /me/skills` performs diff reconcile |
| AC-06 | More than 30 skills returns `400` |
| AC-07 | `GET /skills` returns only active skills grouped by category |
| AC-08 | Super Admin can create a new skill; appears in `GET /skills` |
| AC-09 | Super Admin can deactivate a skill; it disappears from `GET /skills` but remains on existing volunteer profiles |
| AC-10 | Deactivated skill on volunteer profile shows "No longer available" label |
| AC-11 | Volunteer can change password with valid current password |
| AC-12 | Wrong current password returns `401` |
| AC-13 | Volunteer can change email; new email must not already exist (returns `409` if taken) |
| AC-14 | `role` and `orgId` fields in `PATCH /me/profile` body are ignored |

---

## 8. Out of Scope

- Profile photo / avatar upload
- Volunteer impact record (hours logged, certificates)
- Coordinator-side volunteer browse and search
- Volunteer references or endorsements
- LinkedIn / social profile import
- Skills endorsement by org admins
