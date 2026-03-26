# The Occasion Report

> Six specialist agents — branding, product, UX, technical architecture, growth strategy, and SEO — were tasked with examining the platform through the lens of the founder's vision: *"harmonious orchestration where everything meshes and just works like a well-oiled machine."* This document captures their complete findings.

---

## The Word

The branding agent was unequivocal: **Occasion is the right word.**

It carries three simultaneous registers that no invented name can:

1. **The special moment** — "this is an occasion" implies significance, something worth attending
2. **Conditional presence** — "on occasion" implies a ready pool that can be activated when needed
3. **Rising to meet something** — "rise to the occasion" is the exact machine metaphor: doing what is required, fully, when it counts

No other word in English does all three. It is not technology language. It is not charity language. It describes the experience from both sides of the platform: the organiser creates an occasion, the volunteer rises to it.

**Domain:** `occasionhq.com` — the HQ adds institutional credibility for organisations (the paying side), de-emphasised visually for volunteers. Visual treatment: `occasion` at full weight, `hq` lighter and smaller. Not one word, but a composed mark.

**Tagline:** *Built for the occasion*
**Hero copy:** *Where it all comes together*

---

## The Machine

### The Dependency Chain

The orchestration vision maps to a strict causal sequence. Nothing before it can be skipped. The "orchestration" lives in the fan-out zone — the moment a published event simultaneously triggers multiple resolution mechanisms:

```
Platform Infrastructure
        |
  Authentication (all sides)
        |
  Organisation Registration + Approval
        |
  Event Creation (Draft)
        |
  Role Definition
        |
  Event Publication  ← The engine. One DynamoDB UpdateItem. Everything below unlocks here.
        |
  ┌─────────────────────────────────┐
  │  Volunteer Discovery            │
  │  Supplier Matching (post-MVP)   │  ← The fan-out zone. This is orchestration.
  │  Sponsor Placement (post-MVP)   │
  │  Lift-share Matching            │
  └─────────────────────────────────┘
        |
  Registration / Commitment
        |
  Coordinator Confirmation
        |
  Pre-event Logistics (comms, reminders)
        |
  Day-of Execution
        |
  Post-event Follow-up
```

### The Cogs

| Cog | What it does | Why it matters |
|-----|-------------|----------------|
| Event Discovery / Matching | Takes the published event, puts it in front of the right volunteers | Without this, the event is published but unseen |
| Role Structure | Defines the teeth of the machine — shift times, headcount, skills | Imprecise roles create imprecise matches; the whole machine runs rough |
| Volunteer Registration | Captures and structures demand | The 5-check pre-flight is quality control — bad registrations are grit in the gears |
| Coordinator Confirmation | The human cog — the only point where judgment is required | The platform makes this as frictionless as possible |
| Lift-share Matching | The differentiating cog — no other platform does this | One matched pair, notified, proves the mechanism |
| Notifications / Comms | The SQS/SES pipeline — carries signals between all other cogs | Without it, humans have to poll constantly to know what happened |

### The Oil (reduces friction, not force)

- **Profile completeness score** — encourages volunteers to give the platform the data it needs
- **Pre-flight checks on registration** — prevent invalid state from entering; the coordinator never sees the downstream effects
- **Atomic writes with conditions** — `TransactWrite` means race conditions absorb upstream, not downstream
- **The skill catalogue** — controlled vocabulary that keeps matching tight ("First Aid" and "first aider" are the same thing)
- **Fill rate dashboard** — the organiser sees which roles need attention without opening each event

---

## The Gap the Product Owner Identified

> **Lift-share matching has no PRD.**

This is the platform's single most differentiating feature. Architecturally supported (the data model has postcodes, event locations, shift times, confirmed attendance). The computation is not complex. But there is no PRD, no API design, no data model extension.

Without it, Occasion is a well-built volunteer registration platform. That is genuinely useful. But it is not the machine described.

**The minimum viable occasion requires five things to simultaneously work:**

1. A coordinator created the event without calling the platform team
2. At least one volunteer found it through the discovery feed (not a link the coordinator sent)
3. At least three volunteers registered for structured roles and were confirmed without leaving the platform
4. **At least one lift-share match was made** and both volunteers received a notification
5. The coordinator opened the roster on event day — no spreadsheet

Any one fails and the machine is not running. The current MVP PRD scope covers items 1, 2, 3, and 5. **Item 4 — lift-share — has no PRD and is not in scope.**

---

## The Hero Moment (UX)

The hero moment is not a separate screen. The event detail page the organiser has been managing all along transforms to show completion. Same URL, same layout — the data has changed and the design reflects it.

```
┌─────────────────────────────────────────────────────────────┐
│  Redhill 10K Fun Run                         [PUBLISHED]    │
│  12 Apr 2026  ·  09:00–17:00  ·  Redhill, Surrey           │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  All roles filled                                   │   │
│  │  20 volunteers confirmed across 3 roles             │   │
│  │  ████████████████████████████  100%                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Start/Finish Marshal     [ALL FILLED]   8 / 8   ████      │
│  Water Station (Mile 3)   [ALL FILLED]   4 / 4   ████      │
│  Finish Line Photographer [ALL FILLED]   8 / 8   ████      │
│                                                             │
│  ─────────────────────────────────────────────────────     │
│  No further action required. Your event is ready.         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**What makes it feel right:**

- The fill bar is full and solid — the organiser has watched it fill incrementally, over days. That resolution is satisfying.
- The `[ALL FILLED]` badge is a new design token: `--badge-filled-bg`, `--badge-filled-text` using `#4ADE80`. Distinct from CONFIRMED (per-registration) and PUBLISHED (per-event). "All filled" is a role-level achievement state.
- The platform speaks in resolved language, not administrative language. Not `filledCount: 20 / headcount: 20`. *Your event is fully staffed.*
- The organiser did not cause the completion. The platform did.

### The Volunteer's Emotional Arc

```
Curiosity → Discovery → Recognition → Commitment → Confirmation anxiety → Relief → Anticipation → Belonging
```

The most underserved moment: **Confirmation anxiety** (volunteer has applied and feels forgotten).

The PENDING badge alone is not enough. The screen should say:
> *"Your application for Start/Finish Marshal is with [Org Name] for review. They typically respond within 24 hours."*

At MVP this is generic copy. Later it becomes informed by actual org response-time data. Design the pattern for it now.

### Six UX Principles for the Well-Oiled Machine

1. **The platform tracks; the user decides.** Never show raw data when a derived insight is available. Show "3 spots remaining" not "7 of 10 filled."
2. **Status is always visible, never hunted.** Sort the organiser dashboard by urgency, not date.
3. **Errors explain and resolve; they never strand.** "This role is full — see other roles for this event" not just "This role is full."
4. **Progressive disclosure hides complexity at every level.** Role creation: name/headcount/shift first, skills/notes behind "More options."
5. **Load states are informative.** "Finding events near you" not a generic spinner.
6. **Every empty state is a directed invitation.** The CTA is the most likely next action, not a generic "get started."

---

## What Existing Platforms Get Wrong

| Failure | Current tools | Occasion |
|---------|--------------|---------|
| Publishing tool, not coordination tool | Lifecycle ends at RSVP | Lifecycle begins at publication |
| Volunteers treated as ticket holders | No structured roles, no headcounts | Roles are first-class objects |
| Volunteers have nowhere to manage commitments | No unified dashboard | Living record with status, history, cancel action |
| Transport completely unaddressed | No platform addresses lift-share | Built in, using data the platform already has |
| Capacity management event-level at best | No role-level enforcement | Role-level with TransactWrite atomicity |
| Post-event abandoned | Platform goes stale | COMPLETED triggers thank-you emails, hours logging |

---

## Technical Architecture: The Orchestration Model

### The Full Publish Chain

```
POST /organisation/events/:eventId/publish
  → DynamoDB UpdateItem: status=PUBLISHED, GSI3PK=EVENT_STATUS#PUBLISHED
  → SQS enqueue: EVENT_PUBLISHED { eventId, roles, postcode, eventDate }
  → HTTP 200 (immediate)

[ASYNC] VolunteerMatchingLambda:
  For each role.skillIds:
    Query GSI7 (SKILL#<skillId>) → candidate volunteers
    Filter: isDiscoverable, availability, postcode radius
  → Enqueue VOLUNTEER_MATCH_NOTIFICATION per candidate

[ASYNC] NotificationLambda:
  → SES to each volunteer: "A new event near you needs a Water Station Marshal"
```

### The Confirmation Chain

```
ORG ADMIN confirms volunteer:
  → TransactWrite: REGISTRATION status=CONFIRMED, ROLE filledCount += 1
  → Check: filledCount === headcount? → enqueue ROLE_FILLED
  → [ASYNC] RoleFilledLambda:
      Query all roles for event
      All full? → enqueue EVENT_FULLY_RESOURCED
  → [ASYNC] EventFullyResourcedLambda:
      UpdateItem: EVENT status=ACTIVE
      SES to org: "Your event is fully resourced"
```

The `EVENT_FULLY_RESOURCED` event drives the status transition PUBLISHED → ACTIVE and fires the "Your event is ready" email. This is the machine completing its work.

### Eight Infrastructure Gaps

| # | Gap | Fix |
|---|-----|-----|
| 1 | Single SQS queue cannot fan-out | SNS topic → multiple SQS queues per consumer |
| 2 | 6 GSIs, need 9 | Add GSI7 (volunteer-by-skill), GSI8 (supplier-by-type), GSI9 (lift-share-by-event) |
| 3 | No volunteer-by-skill reverse index | GSI7: `SKILL#<id>` → `USER#<id>` |
| 4 | `bootstrap.ts` only runs `CreateTableCommand` | Add `UpdateTableCommand` path for adding GSIs to existing tables |
| 5 | `EVENT_CANCELLED` carries full registration list | Carry only `eventId`; fan-out Lambda queries GSI4 |
| 6 | No idempotency keys on notifications | `confirmationEmailSentAt` conditional UpdateItem before sending |
| 7 | No coordinate fields on USER item | Derive `locationLat/Lon` from postcode at profile-save time |
| 8 | DynamoDB Streams not connected | Use explicit SQS enqueues for orchestration; Streams for audit/observability |

### New Domain Events Required

| Event | Trigger |
|-------|---------|
| `EVENT_PUBLISHED` | Volunteer matching fan-out |
| `ROLE_FILLED` | Org notification; check for EVENT_FULLY_RESOURCED |
| `EVENT_FULLY_RESOURCED` | Status → ACTIVE; org celebration email |
| `LIFTSHARE_REQUEST_SUBMITTED` | Matching worker |
| `LIFTSHARE_MATCH_PROPOSED` | Notification to both parties |
| `LIFTSHARE_CONFIRMED` | Mutual reveal email |

### Lift-share Architecture

**Privacy model (non-negotiable):** No volunteer's home address is ever shared. The platform acts as a matching broker revealing only enough to enable coordination.

What gets shared: origin town, departure window, driver/passenger role, seats available.
What never gets shared: full postcode, home address, phone number (until both parties opt-in after confirming a match).

**New item types:**

```
LIFTSHARE#<requestId> / META
  eventId, volunteerId, role (DRIVER|PASSENGER)
  originTown, originPostcodeArea
  originLat, originLon  (derived from postcode area centroid — never the home address)
  seats, departureWindowStart, departureWindowEnd, maxDetourMiles
  status (OPEN|MATCHED|CONFIRMED|CANCELLED)
  GSI9PK = LIFTSHARE_EVENT#<eventId>

LIFTSHARE_MATCH#<matchId> / META
  requestId_driver, requestId_passenger
  status (PROPOSED|ACCEPTED_BY_DRIVER|ACCEPTED_BY_PASSENGER|CONFIRMED|CANCELLED)
```

**Matching algorithm:**
1. Query GSI9 for all OPEN requests on the same event
2. Filter for opposite role (driver→passenger, passenger→driver)
3. Departure window overlap: `max(startA, startB) < min(endA, endB)`
4. Route compatibility: bearing from origin to venue must differ by < 45° between driver and passenger
5. Detour check: `haversine(driverOrigin, passengerOrigin) + haversine(passengerOrigin, venue) - haversine(driverOrigin, venue) <= driver.maxDetourMiles`
6. Top 3 candidates → create LIFTSHARE_MATCH items (PROPOSED) → notify both parties
7. Both accept → TransactWrite: match CONFIRMED, both requests MATCHED → mutual reveal email

---

## Growth Strategy

### The Cold Start Problem

Events are time-bounded inventory. An unfilled volunteer role disappears on race day. The cost of a thin catalogue is not just reduced conversion — it is permanent demand-side churn.

**The sequencing strategy:**

| Phase | Months | Action |
|-------|--------|--------|
| 0 | 1–3 | Manufacture supply manually. 3–5 committed race directors, one county, free. Do not open self-serve yet. |
| 1 | 3–6 | Open volunteer acquisition against a real catalogue. Never send a volunteer to a thin feed. |
| 2 | 6–12 | Create supply flywheel via case studies. Phase 0 organisers introduce 5–10 others each. |
| 3 | 12–18 | Introduce supplier layer. Businesses that already want to reach race organisers. |
| 4 | 18–30 | Sponsors and lift-share as marketing-level differentiators. |

**The shareable event link breaks the cold start.** An organiser sends it to their existing volunteer WhatsApp groups. Volunteers create accounts. They're in the system even though they found the event through the organiser's own channels. This is the Calendly model.

**Single-player mode value** (before network effects exist): event scaffolding, AI template generation, and the sharable event link give an organiser value on day one regardless of whether the Occasion volunteer pool exists.

### The First ICP

**Primary:** A race director in the south of England running 3–6 timed road races per year, 200–800 participants, 20–80 volunteers per event, currently coordinating through email, WhatsApp, and Google Sheets. Pain is felt — they've had at least one coordination failure. Paying for race timing software and Eventbrite; paying nothing for volunteer coordination.

Why this profile: multiple events per year (monthly active user, not seasonal), unusually networked community (word-of-mouth travels fast at parkrun and club committee meetings), high coordination intensity per event (8–12 distinct role types minimum).

### The Three Flywheels

**Flywheel 1 — Local Event Density Loop (fastest):**
More events → better volunteer feed → better fill rates → organiser outcomes → more organisers → more events. Threshold: ~15–20 active events per quarter within 30 miles. Below this, volunteers don't form a return habit.

**Flywheel 2 — Volunteer Passport Loop (slowest, highest long-term value):**
Profile and history become a cross-organisational credential. A volunteer with 40+ logged hours and a First Aid badge is not abandoning that record to start over elsewhere. Requires 18–24 months to become meaningful.

**Flywheel 3 — Supply-Side Referral Loop (medium):**
Volunteers are also organisers. The person marshalling at a 10K today is the race director of their local club's 5K next month. Exceptional volunteer-side UX is an organiser acquisition channel.

### Revenue Model

**Principle 1:** Volunteers are always free. No exceptions.
**Principle 2:** Free tier must run one complete real event.
**Principle 3:** Never charge per registration — penalises success.
**Principle 4:** Upgrade trigger = usage milestone, not time limit.

| Tier | Price | Gate |
|------|-------|------|
| Free | £0 | 3 events/year, 75 volunteers, core features, "Powered by Occasion" |
| Growth | £45/month | Unlimited events (the trigger), 300 volunteers, AI templates (5/month) |
| Professional | £110/month | Impact reports, DBS tracking, check-in, custom subdomain |
| Enterprise | Custom | White-label, SSO, multi-org, dedicated success manager |

**Highest-performing add-on:** Impact reports and volunteer hour certificates (£20–30/month). Volunteers need documented hours for university applications. Charities need grant-ready PDFs for board reporting and grant applications. Neither side is served by any current platform.

**Sustainability positioning:** Don't lead with it. Retrospective data works; forward claims don't. "Your event generated 23 lift-share journeys, reducing estimated travel emissions by 18%" is a credible story after the fact.

### On the "Occasion" Name — Risk Assessment

`occasion.app` already exists (booking software on Square App Marketplace, on G2, App Store). "Occasion Events" and "OccasionGenius" also exist in adjacent spaces. Trademark in Class 42 will face a likelihood-of-confusion assessment.

**Decision rule:** If `occasionhq.com` is available and trademark clears in Class 42, proceed. Always brand as "Occasion HQ" or "OccasionHQ" — never just "Occasion". The HQ disambiguates. If trademark doesn't clear cleanly, reconsider the name entirely.

**If reconsidering:** The brief for a better name is a single invented word, 2–3 syllables, in the semantic field of coordination or togetherness, with no direct competitors in the software namespace. It must own its own search results.

---

## SEO Strategy

### The Structural Problem

Occasion is a two-sided marketplace where neither side exists at launch. SEO strategy has three time horizons:

1. **Launch** — technical baseline and marketing content
2. **Growth** — event page indexing and structured data (the flywheel)
3. **Scale** — category and location pages

### The Most Important Technical Decision: Server-Rendering

The current React SPA means Googlebot sees a shell HTML document. Event pages will **not** appear in Google's Event Search feature without this fix.

**Recommended path:** Static-generate event pages at publish time. Lambda writes HTML snapshot to S3 at `POST /publish`. CloudFront serves it at the public event URL. No JavaScript execution required. Snapshot is always current because it's generated at publish time.

Long-term architecture: Next.js with SSR for all public routes. Authenticated routes (dashboards, admin) can remain client-rendered.

### Event Schema (mandatory on every published event page)

```json
{
  "@context": "https://schema.org",
  "@type": "Event",
  "name": "Farnham 10K Summer Run 2026",
  "startDate": "2026-06-14T08:00:00+01:00",
  "endDate": "2026-06-14T13:00:00+01:00",
  "eventStatus": "https://schema.org/EventScheduled",
  "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
  "location": {
    "@type": "Place",
    "name": "Farnham Park",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Farnham",
      "addressRegion": "Surrey",
      "postalCode": "GU9 0AG",
      "addressCountry": "GB"
    }
  },
  "organizer": {
    "@type": "Organization",
    "name": "Farnham Runners",
    "url": "https://occasionhq.com/organisations/farnham-runners"
  },
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "GBP",
    "availability": "https://schema.org/InStock",
    "url": "https://occasionhq.com/events/farnham-10k-summer-run-2026"
  }
}
```

`price: "0"` earns the "Free" badge in Google's event search cards. `eventStatus` must change to `EventCancelled` when cancelled. Use explicit BST/GMT timezone offset on all dates.

### The Keyword Strategy

**Don't target:** "volunteer opportunities near me" (owned by Do-it.org, VolunteerMatch), "occasion" as a standalone term (fashion/gifting).

**Do target:** Long-tail event-specific queries — "volunteer Farnham 10K 2026". These are zero competition. Every published event with correct schema is a near-certain first-position ranking for its named event query. 500 events = 500 such positions.

**Category pages:** `/events/running`, `/events/cycling`, `/events/charity` — genuine landing pages with introductory copy, not just a filtered feed with a heading.

### Content Priority Stack

**Month 1 (publish these before anything else):**

1. `How to Coordinate Race Marshals for a Running Event (UK Guide)` — targets "how to coordinate race marshals", "race marshal volunteer guide". The most important single piece of content for the organiser audience.
2. `How to Set Up a Volunteer Sign-Up System for a Running Event` — targets "volunteer sign up form running event".
3. `Running Club Event Management Software: A Practical Comparison (2026)` — explicitly compare Rosterfy and Eventbrite. Intercepts bottom-of-funnel buyers.

**Ongoing (2 posts/month):**
Seasonal volunteer opportunities, event-type-specific guides, local angle pieces.

**High-value comparison pages:**
"Rosterfy vs Occasion HQ: which is right for your running club?" — owns the alternative search for the primary competitor.

### The Competitive Gap

| Competitor | Where they're weak |
|------------|-------------------|
| Eventbrite | Primary use case is paid tickets. No content for volunteer coordination workflow. No `price: "0"` event schema. |
| Volunteermatch / Do-it.org | No event-specific structured data. Flat opportunity descriptions with no role/shift/skill detail. Zero organiser acquisition content. |
| Rosterfy | Targets enterprise (five-figure licences). No content for small sports clubs. No presence for "running club" queries. |

The intersection of "UK", "small sports club/charity", "event-based volunteering", and "practical coordination tools" is genuinely uncontested in search. Plant the flag before any competitor recognises it exists.

### The robots.txt Configuration

```
User-agent: *
Disallow: /organisation/
Disallow: /admin/
Disallow: /dashboard/
Disallow: /login
Disallow: /register
Disallow: /api/

Allow: /events/
Allow: /organisations/
Allow: /blog/

Sitemap: https://occasionhq.com/sitemap.xml
```

### Sitemap Strategy

Generate at publish time. Separate sitemaps per entity type:
- `/sitemap-events.xml` — regenerated on every publish/cancel
- `/sitemap-orgs.xml` — all approved public organisations
- `/sitemap-content.xml` — blog and guide pages

Cancelled events: return `410 Gone`, remove from sitemap. Do not use `404`.

---

## Priority Stack

### Immediate (before anything else)

1. Fix the 4 blocking issues on Authentication PR #11 so it can merge
2. Write the lift-share PRD — add to MVP sequence after volunteer registration

### Technical (in order)

1. Static-generate event pages at publish time (Lambda → S3 → CloudFront)
2. Add `schema.org/Event` JSON-LD to all event pages
3. Submit `sitemap.xml` to Google Search Console on day one
4. Migrate single SQS queue to SNS fan-out (when second consumer is added)
5. Add GSI7 (volunteer-by-skill) when matching engine is built
6. Add idempotency keys (`<type>EmailSentAt`) to all notification flows

### Content (month 1)

1. Publish 3 foundational organiser blog posts
2. Create category pages for running, cycling, charity
3. Implement breadcrumb schema on all event and category pages

### Growth

1. Identify 3–5 named race directors in one county before launch
2. Build the shareable event link as a first-class feature
3. Register `occasionhq.com` (check trademark clearance first)

### Design System Additions

1. `[ALL FILLED]` badge token (`--badge-filled-bg`, `--badge-filled-border`, `--badge-filled-text`)
2. "Readiness" panel on draft event pages (hides publish requirements until met)
3. Volunteer confirmation card expansion (venue details, calendar link, shift time shown on confirm)
4. PENDING copy update: "Your application is with [Org Name] for review."

---

## Appendix: What Each Agent Produced

| Agent | Output |
|-------|--------|
| Branding | Brand analysis of "Occasion" — three semantic registers, tagline, hero copy, visual treatment of `occasionhq.com` |
| Product owner | Orchestration dependency chain; cogs and oil framework; minimum viable occasion; what existing platforms get wrong |
| UX designer | Full organiser and volunteer journey maps; hero moment screen design; dual-audience architecture; Occasion as design language |
| Technical architect | Full publish→confirm→complete event chain; lift-share algorithm and privacy model; 8 infrastructure gaps; new domain events; schema additions |
| Growth strategist | Cold start sequencing; ICP definition; three flywheel model; revenue model; naming risk assessment; sustainability positioning |
| SEO expert | Keyword landscape; server-rendering requirement; Event schema implementation; content programme; competitive gap analysis; robots.txt and sitemap strategy |

---

*Generated 2026-03-26. Platform working name: Gatherly / Occasion HQ. Domain under consideration: occasionhq.com.*
