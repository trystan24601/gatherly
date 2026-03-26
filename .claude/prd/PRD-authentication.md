# PRD: Authentication

> 🔗 GitHub Issue: [#2 Authentication](https://github.com/trystan24601/gatherly/issues/2)

## 1. Background

Authentication is the second layer of the platform — nothing meaningful works without it. All three user types (Volunteer, Org Admin, Super Admin) need their own login paths. Sessions are stored in DynamoDB with TTLs. The platform uses cookie-based sessions (`httpOnly`, `Secure`, `SameSite=Strict`) rather than JWTs, so tokens are revocable and never leak in browser history. Password hashing uses bcrypt (12 rounds). Super Admins are provisioned only via CLI — there is no UI path to become a Super Admin.

## 2. User Roles

| Role | Description |
|---|---|
| **Volunteer** | Registers and logs in at `/login`; accesses volunteer-scoped endpoints |
| **Org Admin** | Logs in at `/org/login`; accesses org-scoped endpoints; account created during org registration |
| **Super Admin** | Logs in at `/admin/login`; account created via CLI provisioning script only |

## 3. Functional Requirements

### FR-01 — Volunteer Registration

- `POST /auth/register` accepts: `firstName`, `lastName`, `email`, `password` (min 8 chars, 1 uppercase, 1 number)
- Password hashed with bcrypt (12 rounds) before storage
- Creates a USER item (`PK=USER#<id>`, `SK=PROFILE`, `role=VOLUNTEER`) and a USEREMAIL sentinel (`PK=USEREMAIL#<email>`, `SK=LOCK`) atomically via TransactWrite with `attribute_not_exists(PK)` condition on both
- Duplicate email returns `409 {"error":"An account with this email already exists."}`; no records written
- On success: creates a SESSION item, sets `sid` cookie, returns `201` with user profile (no password hash)
- Volunteer is immediately logged in after registration

### FR-02 — Login (all three paths)

- `POST /auth/login` — Volunteer login (email + password)
- `POST /auth/org/login` — Org Admin login (email + password)
- `POST /auth/admin/login` — Super Admin login (email + password)
- All three: bcrypt compare → on match, upsert SESSION item in DynamoDB, set `sid` cookie, return user profile
- Wrong credentials: `401 {"error":"Invalid email or password."}` — same message for both wrong email and wrong password (no enumeration)
- Unknown email for any login path returns same 401 (no enumeration)
- On success, response includes `role` and `orgId` (if ORG_ADMIN) for client-side routing

### FR-03 — Session Management (DynamoDB)

SESSION item schema:
- `PK = SESSION#<sessionId>`, `SK = PROFILE`
- `userId`, `role`, `orgId` (ORG_ADMIN only), `createdAt`, `expiresAt` (TTL attribute — DynamoDB auto-expires)
- `GSI6PK = USER#<userId>`, `GSI6SK = SESSION#<sessionId>` (list sessions by user for forced logout)

Session TTL: 7 days for Volunteer/Org Admin; 8 hours for Super Admin.
Cookie: `httpOnly=true`, `secure=true` (production), `sameSite=Strict`, `path=/`.

### FR-04 — Logout

- `POST /auth/logout` — deletes SESSION item from DynamoDB; clears `sid` cookie; returns `204`
- Works regardless of session validity (idempotent)

### FR-05 — Auth Middleware

- `requireAuth` middleware: reads `sid` cookie → queries DynamoDB for SESSION item → validates not expired → attaches `{ userId, role, orgId }` to `req.session`
- Missing or invalid session: `401 {"error":"Authentication required."}`
- `requireRole(role)` middleware: checks `req.session.role === role`; mismatch returns `403 {"error":"Insufficient permissions."}`
- `requireApprovedOrg` middleware: for ORG_ADMIN routes, additionally checks org status is APPROVED; PENDING/REJECTED returns `403 {"error":"Organisation is not approved."}`

### FR-06 — Password Reset

- `POST /auth/password-reset/request` — accepts `email`; always returns `200` (no enumeration); if email exists, writes a RESET token item to DynamoDB (TTL 1 hour) and enqueues SQS message to send reset email (visible in Mailhog locally)
- `POST /auth/password-reset/confirm` — accepts `token`, `newPassword`; validates token exists and not expired; updates password hash; deletes token item; returns `200`
- Invalid/expired token: `400 {"error":"Invalid or expired reset token."}`

### FR-07 — Rate Limiting

- 5 failed login attempts from the same IP within 15 minutes blocks further attempts for 15 minutes
- Rate limit response: `429 {"error":"Too many login attempts. Try again in 15 minutes."}`
- Rate limit state stored in-memory (acceptable for single Lambda in MVP; revisit for multi-instance)

### FR-08 — Super Admin Provisioning (CLI only)

- `backend/scripts/provision-super-admin.ts` — CLI script accepts `--email` and `--firstName`, `--lastName`
- Generates a random temporary password, creates USER item (`role=SUPER_ADMIN`) and USEREMAIL sentinel
- Prints the temporary password to stdout (admin copies it manually)
- No UI path to become Super Admin — this is a hard constraint enforced by backend middleware

---

## 4. Non-Functional Requirements

- **Security**: Passwords stored as bcrypt hashes (cost 12). No plaintext passwords in logs. `sid` cookie is `httpOnly` + `SameSite=Strict`. Reset tokens are single-use and TTL-bounded. Session IDs are UUIDs (128-bit random). No user enumeration on login or password reset.
- **Performance**: Session lookup from DynamoDB < 10ms p99 (single GetItem by PK — fastest DynamoDB operation).
- **Scalability**: Sessions stored in DynamoDB auto-scale. No in-memory session store.
- **Accessibility**: All login forms meet WCAG AA — labels on all fields, descriptive error messages, keyboard navigable.

---

## 5. API Changes

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | None | Volunteer registration |
| `POST` | `/auth/login` | None | Volunteer login |
| `POST` | `/auth/org/login` | None | Org Admin login |
| `POST` | `/auth/admin/login` | None | Super Admin login |
| `POST` | `/auth/logout` | Cookie | Logout (any role) |
| `GET` | `/auth/me` | Cookie | Returns current session user profile |
| `POST` | `/auth/password-reset/request` | None | Request password reset email |
| `POST` | `/auth/password-reset/confirm` | None | Confirm password reset with token |

---

## 6. UI Screens

### Volunteer Login (`/login`)
```
┌─────────────────────────────────────────┐
│  ◆ Gatherly                             │
├─────────────────────────────────────────┤
│                                         │
│  Sign in to your account                │
│                                         │
│  Email address                          │
│  ┌─────────────────────────────────┐    │
│  │ email@example.com               │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Password                               │
│  ┌─────────────────────────────────┐    │
│  │ ••••••••                        │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Forgot your password?                  │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │       Sign in                   │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Don't have an account? Register        │
│                                         │
└─────────────────────────────────────────┘
```

### Volunteer Registration (`/register`)
```
┌─────────────────────────────────────────┐
│  ◆ Gatherly                             │
├─────────────────────────────────────────┤
│  Create your account                    │
│                                         │
│  First name          Last name          │
│  ┌───────────────┐  ┌───────────────┐   │
│  │               │  │               │   │
│  └───────────────┘  └───────────────┘   │
│                                         │
│  Email address                          │
│  ┌─────────────────────────────────┐    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Password                               │
│  ┌─────────────────────────────────┐    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│  Min 8 chars, 1 uppercase, 1 number     │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │       Create account            │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Already have an account? Sign in       │
└─────────────────────────────────────────┘
```

---

## 7. Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-01 | Volunteer can register with valid details; is immediately logged in and redirected to `/dashboard` |
| AC-02 | Duplicate email returns `409` with field-level error; no USER or USEREMAIL item written |
| AC-03 | Volunteer can log in at `/login`; receives `sid` cookie; `GET /auth/me` returns correct profile |
| AC-04 | Org Admin can log in at `/org/login`; response includes `orgId` |
| AC-05 | Super Admin can log in at `/admin/login` |
| AC-06 | Logout deletes SESSION item; subsequent `GET /auth/me` returns `401` |
| AC-07 | Unauthenticated request to any protected endpoint returns `401` |
| AC-08 | Volunteer session calling org-admin endpoint returns `403` |
| AC-09 | PASSWORD RESET: requesting reset returns `200` regardless of whether email exists |
| AC-10 | PASSWORD RESET: valid token updates password; invalid/expired token returns `400` |
| AC-11 | 5 failed logins from same IP triggers `429` for subsequent attempts within 15 minutes |
| AC-12 | SESSION item has correct TTL attribute; DynamoDB admin UI shows expiry timestamp |
| AC-13 | All three login forms are keyboard-navigable; labels present on all input fields |

---

## 8. Out of Scope

- Social login (Google / Apple)
- Multi-factor authentication (TOTP / SMS)
- Email verification on registration or email change
- Forced session invalidation on password change (all sessions expire naturally via TTL)
- "Remember me" toggle (sessions always 7 days for volunteers)
- Account lockout at the DynamoDB level (rate limiting is in-memory only for MVP)
