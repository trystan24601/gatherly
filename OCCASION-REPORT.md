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

---

## Community & Sponsor Strategy

*Analysis produced 2026-03-26. Two connected ideas evaluated: Idea A — sponsor vouchers for high-scoring volunteers; Idea B — annual regional community events organised by Occasion HQ itself.*

---

### Idea A: Sponsor Vouchers for High-Scoring Volunteers

#### The Case For

The core insight here is accurate and underexploited. Volunteers at running and sports events are a self-selecting group of active, engaged, brand-responsive people. They are not scrolling a banner ad — they gave up a Saturday morning to stand in the rain directing runners. A brand that reaches them at that moment of commitment is reaching them at peak identity alignment: this is who they are, and a brand that recognises it earns disproportionate goodwill.

The comparable in the market is Vitality's integration with parkrun: Vitality rewards volunteers with 5 points per volunteering session, which feed into premium discounts and partner benefits. It is effective precisely because the value exchange feels earned rather than promotional. Brooks Running became parkrun's exclusive global footwear partner in 2023 and extended through 2028 — a five-year commitment to a volunteer-community channel. These are not small decisions. These are major brands structuring long-term commercial relationships around volunteer audiences.

The addressability argument for sponsors is genuinely strong:
- Every volunteer on Occasion HQ has a verified identity, confirmed event attendance, and a logged hours record. This is first-party data with genuine signal, not inferred interest.
- Brands running performance marketing on Meta or Google are reaching people who might be interested in running shoes. Occasion HQ can reach people who confirmed they showed up to a race last Saturday.
- The audience skews active, community-embedded, and digitally literate — high LTV customers for sports nutrition, footwear, apparel, and insurance brands.

The argument for sponsors versus other channels:

| Channel | Reach | Intent signal | Audience qualification |
|---|---|---|---|
| Meta/Google paid | High | Low (interest-based) | Self-reported or inferred |
| Race entry sponsorship | Medium | Medium (event registrant) | Participant only |
| Club sponsorship | Low | High | Member, long-term |
| Occasion HQ volunteer vouchers | Medium (growing) | Very high (verified attendance) | Confirmed volunteer, multi-event |

The Occasion HQ proposition is that it sits in a gap: the qualified commitment of a club member with the reach and measurability of a digital channel.

**England Athletics already runs a "Room to Reward" voucher as part of its Regional Volunteer Awards.** This validates that the concept is neither novel nor offensive to the volunteer community when positioned correctly. The difference is that England Athletics distributes one voucher per regional ceremony winner. Occasion HQ can operationalise this at scale — every volunteer who crosses a defined threshold gets a reward, without a ceremony and without committee selection.

#### The Case Against

There is one genuine risk that must be confronted directly: gamification corruption of motivation.

The copy library is explicit about this — "gamification language ('level up', 'streak', 'earn points', 'reward') — volunteering is intrinsically motivated." This is not just a tone call. There is a body of behavioural economics research (Frey and Jegen's crowding-out effect) showing that introducing extrinsic rewards into previously intrinsically motivated behaviour can reduce that behaviour when the rewards are withdrawn. If Occasion HQ creates a generation of volunteers who volunteer to collect voucher thresholds, the platform has done something harmful to the community it claims to serve.

The risk materialises in a specific failure mode: volunteers who game the system by signing up for roles they do not intend to fill, in order to accumulate event credits, then cancelling at the last minute. A 10K race with 15% last-minute volunteer cancellations is worse than a race where the platform was never used.

The second risk is sponsor dependency. If Occasion HQ positions volunteer rewards as a core feature, organisations and volunteers will expect them to persist. If the sponsor relationship with Nike or Saucony lapses, the platform degrades in perceived value. The architecture of the feature must insulate the core product from sponsor churn.

The third risk is timing. The platform has no volunteer history yet. A voucher threshold of "10+ confirmed events" is meaningless at launch — no volunteer can reach it. Launching the feature too early produces a ghost programme: visible but unreachable, which reads as a broken promise.

#### Recommended Approach for Idea A

**Build the infrastructure now. Do not activate publicly until you have data.**

The volunteer profile and hours record being built into the platform (POST-03) already creates the substrate. Logged hours, confirmed events, role diversity — these are data points the platform will have naturally by month 6 of live operation. The sponsor voucher feature is a layer on top of data that will exist anyway.

**Stage the rollout in three phases:**

Phase 1 (months 1–9, pre-commercial): No vouchers, no scoring visible to volunteers. Silently log volunteer history. Build the scoring model in the background. Identify what threshold distributions actually look like with real data before setting commercial thresholds publicly.

Phase 2 (months 9–18, soft launch): Introduce the "Occasion Record" — a volunteer-facing view of their history. Confirmed events, hours, role diversity. Frame this as a credential, not a game. Language: "Your record" not "Your score." The hours certificate (POST-03 add-on) is the lead feature here. This is the Volunteer Passport concept from the growth strategy — building the data asset before monetising it.

Phase 3 (months 18+, commercial): Approach sponsors with a clear pitch based on real audience data. "We have 2,000 volunteers who have confirmed attendance at 5+ events in the last 12 months. Here is their demographic profile and geographic distribution. Here is a redemption mechanic that puts your discount in front of them at the moment they complete their sixth event." At this point you have something to sell and you are not promising what you cannot deliver.

**Scoring model — when it is built:**

The threshold structure should weight confirmation over registration, and attendance diversity over pure volume. A volunteer who showed up to 8 different events for 3 different organisations is more interesting to a sponsor than a volunteer who confirmed for the same race 8 times.

Proposed scoring dimensions (to be validated against actual volunteer cohort data at phase 2):

| Dimension | Reasoning |
|---|---|
| Confirmed events (base count) | Attendance is the core signal. Registration counts for nothing. |
| Unique organising organisations | Cross-org volunteering signals genuine community commitment |
| Role diversity (unique role types) | "First Aid, Marshal, Finish Line, Photography" is a more active volunteer than 12x "Car Park Marshal" |
| Consecutive event reliability | Volunteering for the same event across multiple years signals an anchor volunteer — high value to both platform and sponsor |
| Hours logged | Raw time investment |

Do not call this an "occasion score" externally. Call it the "volunteer record" or "your contributions." Score-language risks the gamification problem. Present it as a credential, not a ranking.

**Redemption mechanics:**

The mechanism must be frictionless and not require the volunteer to visit a separate sponsor portal. Recommended approach: unique single-use codes issued by Occasion HQ, delivered via email at the point of threshold crossing. The email subject line fits naturally into the existing copy system: "[Your Name] — you've reached a new milestone." The code is redeemable at the sponsor's checkout; the platform does not need to operate a redemption infrastructure beyond code issuance.

Critically: the platform issues the code, not the sponsor. The volunteer never sees a promotional email from the sponsor. Occasion HQ controls the communication surface. The sponsor gets redemption data and brand association; it does not get the volunteer's email address. This maintains the platform's trust relationship with volunteers and creates a clean data boundary.

**Sponsor acquisition strategy:**

Approach in this order:

1. Nutrition and recovery brands first (SiS, Maurten, Precision Fuel & Hydration, Veloforte). Lower commercial stakes, faster decision cycles, founder-accessible. A 10% discount code issued to 500 verified volunteers costs the brand almost nothing while generating genuine brand trial. These brands already sponsor race expos; this is a cheaper and more targeted version of the same thing.

2. Sports footwear and apparel second (Brooks, Saucony, Asics UK, Sweaty Betty). Longer sales cycles and larger legal/commercial process. Brooks' parkrun relationship shows these brands understand volunteer-community channels. The pitch is: "we are building the verified volunteer database that parkrun does not have."

3. Insurance and financial services third (Vitality UK, British Cycling insurance partners). Highest ACV, longest cycle, but the qualification data Occasion HQ holds is genuinely valuable to an insurer — confirmed event attendance is an activity proxy they would otherwise pay to infer.

The pitch deck for sponsors should not lead with audience size (it will be small at first). It should lead with data quality: "verified attendance, not inferred interest." That is the differentiator versus Meta, Google, and race sponsorship. Show the depth of the data model — confirmed status, hours logged, role types, geographic distribution. The pitch is audience precision, not audience scale.

**How Idea A interacts with POST-07 (Sponsor Placement):**

POST-07 as currently defined is event-level: local businesses with regional activation budgets who want to reach event audiences via sponsor slots on published event pages. This is a different commercial motion from volunteer vouchers — it is contextual advertising adjacent to an event, analogous to a race programme advert.

Idea A is a relationship-based commercial channel: brands reach volunteers based on their platform-wide history, not based on a single event. These are complementary, not competing. The distinction matters for positioning and for the sponsor pitch:

- POST-07 is "reach people attending this event" — appropriate for local businesses, race suppliers, geographically constrained brands
- Idea A vouchers are "reach your most committed community of volunteers platform-wide" — appropriate for national brands with athlete-segment marketing budgets

POST-07 should be built as specified. Idea A is a separate commercial product with a later activation timeline. They share a sponsor profile type in the data model (the SPONSOR item type POST-07 requires) — Idea A can extend rather than replace that data model. A single sponsor entity might use both: sponsor a specific event (POST-07) and run a platform-wide volunteer voucher campaign (Idea A).

**Risk summary:**

| Risk | Severity | Mitigation |
|---|---|---|
| Gamification corrupts volunteer motivation | High | Phase 2 framing as credential not game; no score language; reward is a surprise, not a target |
| Volunteer signs up to game the threshold then cancels | Medium | Score only credits confirmed attendance (not registration); cancellations within 48hrs of event reduce score |
| Sponsor churns and feature degrades | Medium | Never promise ongoing rewards; each campaign is time-bounded; product works without sponsor layer |
| Platform at launch has no audience to pitch sponsors | High | Do not approach sponsors until phase 3; build audience first |
| Legal: GDPR and marketing consent on code issuance | Low | Codes are platform-sent, not sponsor-sent; treat as service communication not marketing, given the milestone trigger |

---

### Idea B: Annual Regional Community Events

#### The Case For

This is the most strategically coherent idea on the list, and also the most expensive to execute. The fact that Occasion HQ would be organising an occasion is not just a clever observation — it is a product-market fit demonstration and a brand proof-point simultaneously.

The community flywheel argument is real. Platforms that build in-person moments earn loyalty that pure-digital products cannot replicate. Strava segments are good. But the Strava clubs that run physical meetups have materially higher retention and word-of-mouth. The Figma Config conference, Notion's community events, Airtable Universe — these are not product investments, they are trust investments. The in-person moment creates a cohort of highly engaged users who feel ownership of the platform, refer aggressively, and provide qualitative feedback that no survey captures.

For a volunteer community specifically, this is even more powerful. Volunteers are people who already show up. They are by definition the population most likely to attend a celebration of showing up. The audience is pre-qualified and pre-motivated.

The "best occasion of the year" award drives two behaviours that are commercially valuable:

1. Organisers who want to win it will run better-structured events on Occasion HQ — more defined roles, better volunteer confirmation rates, more complete event pages. Award incentive alignment with platform quality.

2. Nominees create organic marketing. A running club that gets nominated for "Best Occasion — South East 2027" will post about it in their Strava club, their WhatsApp groups, their club newsletter. Every nomination is a platform mention in a community Occasion HQ has not yet reached.

The PR angle is legitimate and underrated. "Platform for volunteer-run events organises its own volunteer celebration" is a genuinely interesting story for running press (Runner's World UK, Athletics Weekly, the endurance community on social), for the charity press (Civil Society, Third Sector), and potentially for national features editors who cover community and volunteering ("the quiet army behind British road racing" etc.). It is not a hard sell for a journalist.

England Athletics already runs regional volunteer award ceremonies across all 9 regions annually, typically September. The format exists and is validated. The gap is that England Athletics' ceremonies are athletics-focused and invite-only (nominated by clubs). Occasion HQ's event would be open to any volunteer who used the platform in the preceding year — a genuinely different scope.

#### The Case Against

The primary risk is premature execution. Running your own event when you have 50 volunteers on the platform means you are organising a dinner party, not a community gathering. The event's success is directly proportional to the size and engagement of the platform community it celebrates. An Occasion HQ community event in year one, before meaningful volunteer volume exists, does not build flywheel — it creates a small awkward gathering that reinforces how nascent the platform is.

The second risk is resource. Physical events require operational capacity that a lean founding team does not have while the product is under active development. Even a modest dinner-format event for 80 people requires: venue sourcing, catering negotiation, sponsor activation, AV, speaker management, award nominations process, collateral design, ticketing, and on-the-day logistics. This is not a weekend project. It is a meaningful capacity commitment at the worst possible moment in the company's lifecycle.

The revenue model question does not have a clean answer at early stage. Sponsor-funded means the event's quality depends on sponsor interest, which depends on audience size, which is the problem. Ticket-funded (say, £25–35/ticket) is possible but creates a pay-to-attend barrier for volunteers who already give their time for free. Free with no revenue model requires the company to absorb the full cost of running an event while it is pre-revenue.

Regional vs national creates a sequencing problem. A single national event in London feels exclusive and geographically inaccessible to a Manchester running club. Four regional events in year one is operationally brutal. The right format at early stage is probably a single well-executed event in the platform's densest geography, presented as a pilot rather than a permanent regional programme.

#### Recommended Approach for Idea B

**Do not run this event until the platform has sufficient community to make it feel earned, not performed.**

The threshold for "sufficient community" is approximately: 500+ verified volunteers who have attended at least one confirmed event on the platform, distributed across at least three geographic clusters, with at least 30 distinct organising organisations represented. This is an estimate — the real signal is whether the event, if announced, would be oversubscribed, not barely-subscribed. Below this threshold, the event is marketing spend without marketing return.

**Target timing: 18–24 months post-launch.** If launch is Q3/Q4 2026, the first community event should be Q1/Q2 2028. This assumes the platform growth curve is on track. The event should not be calendar-fixed — it should be readiness-fixed. If the platform is significantly ahead of projection at month 12, pull the event forward. If behind, delay it. A poorly attended community event is worse than no event.

**Format recommendation: a single annual event, not a regional programme, until year 3.**

Year 1 event: One location — likely London or the Midlands depending on where the densest organiser cluster develops. Dinner format, 80–150 attendees (invitation-based, distributed between volunteer nominees, organising representatives, and community figures). Budget: £8–15k all-in. Revenue model: sponsor-covered (one title sponsor, category exclusivity) — target a sports brand already in the Idea A sponsor pipeline. Ticket-free for volunteers; organisers may have a nominal contribution (£10–15) to signal commitment without creating a price barrier.

Year 2 event: Expand to two locations (South/North split). Introduce the open nomination process for the best occasion award. Target 250–350 total attendees across both events.

Year 3+: Regional cadence (4–5 locations), open awards nomination, press coverage, potential broadcast/streaming for remote community engagement.

**The "Best Occasion of the Year" award — design principles:**

The award categories should map directly to the platform's event taxonomy and be structured to incentivise organiser behaviour on the platform:

| Award | Selection method | Why it works |
|---|---|---|
| Best Occasion (overall) | Platform data + community vote | Premier award; maximum social sharing |
| Best First Occasion | Platform data only (debut events) | Incentivises new organisations to run well from day one |
| Most Occasions (organiser) | Platform data only (event count) | Rewards loyal, recurring organisers |
| Volunteer of the Year | Community nomination | Volunteer-facing recognition; separate from organiser awards |
| Best Volunteer Team | Platform data (fill rate + confirmed count) | Rewards organisers who build strong volunteer relationships |

"Community vote" means Occasion HQ users (both organisers and volunteers) can nominate and vote via the platform. This is in-app engagement in the weeks before the event, which drives platform sessions and referral conversations.

**The meta-argument — Occasion HQ uses its own product:**

The event should be run entirely on Occasion HQ. Role definitions (venue host, registration desk, AV technician, photographer), volunteer sign-up through the platform, the confirmation flow, the event day check-in. This is not just symbolically satisfying — it is a product stress test, a sales demo for every prospective organiser in the room, and a content asset (photographs and quotes from the event seeded back to the content programme).

The event day brief distributed to Occasion HQ community volunteers should use the platform's own copy system. The post-event email should reference the hours they logged. The Occasion Report next year should include the fill rate and confirmation data from the HQ event itself. This closes the loop cleanly.

**Revenue model at first event:**

Single title sponsor, approached as part of the Idea A sponsor pipeline. The sponsor gets:
- Title naming (e.g., "The Saucony Occasion Awards 2028")
- Brand presence at the event (backdrop, welcome slide, goody bag insert)
- Listing on the event page and all event communications
- A short speaking slot (3 minutes maximum — do not give a brand more than 3 minutes at a community event)
- A set of Idea A-style voucher codes to distribute to attendees

In return, the platform receives: full event cost coverage (venue, catering, AV, collateral). Target sponsor value: £8–12k. This is not an ambitious number for a brand with a sports marketing budget. It is an efficient activation for category exclusivity at a curated, qualified audience event.

**PR strategy:**

The media angle is not "platform launches awards ceremony." That is a press release nobody reads.

The angle is: "The volunteers behind British community running are getting their own occasion." Focus the story on specific volunteers — the person who has marshalled the same race for 11 years, the retired GP who does first aid at every local triathlon. These are the voices. Occasion HQ is the infrastructure that found them and got them in a room. Pitch to:
- Runner's World UK (lifestyle, volunteer appreciation angle)
- Athletics Weekly (athletics community angle)
- Third Sector (volunteering/charity angle)
- Local press in the event's city (community interest, named individuals)

A regional winner of "Volunteer of the Year" is a genuinely newsworthy story in their local paper. Occasion HQ does not need to be the headline — it needs to be the origin of the story.

---

### How Ideas A and B Interact With Each Other

The two ideas are more connected than they first appear. Both require the same underlying data asset: a rich, verified volunteer history. Both are more valuable the larger and more active the volunteer community on the platform is. Both have a timing dependency on platform scale that means neither should be activated in the first year.

The interaction structure:

Idea A (voucher programme) builds the volunteer record infrastructure (logged hours, confirmed event count, role diversity) that also powers the award nominations for Idea B. The "Volunteer of the Year" nominee at the Idea B event is identifiable from the Idea A scoring data. The infrastructure is shared.

Idea B (community event) creates the social proof and community warmth that makes Idea A feel earned rather than transactional. A volunteer who attended the Occasion HQ event and watched a peer win an award is a more motivated platform participant than a volunteer who received a discount code in an email. The events build the emotional substrate that makes the voucher programme land correctly.

Idea A sponsors and Idea B sponsors overlap. A brand that runs a platform-wide voucher campaign (Idea A) is a natural title sponsor for the community event (Idea B). This creates a bundled commercial relationship with higher ACV than either product alone.

**Combined sequencing:**

| Stage | Timeline | Action |
|---|---|---|
| Foundation | Launch – month 9 | Build volunteer record infrastructure silently as part of POST-03. No external features. |
| Credential launch | Month 9–18 | Launch "Your Occasion Record" as a volunteer-facing feature. Frame as credential. Approach first Idea A sponsors with audience data. |
| Voucher launch | Month 18 | First sponsor voucher campaign. Single brand, defined threshold, time-bounded. Measure redemption and volunteer reaction carefully. |
| Event announcement | Month 18–20 | Announce first community event for month 24. Open nominations through the platform. |
| First community event | Month 24 | Run the event. Use the platform for its own coordination. Collect content and press coverage. |
| Regional expansion | Month 30+ | Two-location events. Expand Idea A to second sponsor brand. |

---

### Interaction With the Existing Roadmap

**POST-07 (Sponsor Placement)** should proceed as specified — it is a different commercial product serving a different sponsor audience (local/regional businesses, event-level placement). Do not conflate it with Idea A.

However: the SPONSOR item type and sponsor registration flow that POST-07 requires should be designed with Idea A in mind from the start. A sponsor entity that creates a POST-07 event placement should be the same data entity that later runs a platform-wide volunteer voucher campaign. Design the data model once.

**POST-03 (Impact Record & Hour Certificates)** is the dependency for both Idea A and Idea B. It must be in the roadmap before either idea activates. The volunteer hours and confirmed event data are what make the voucher threshold meaningful and what identifies award nominees. POST-03 is scheduled already — this confirms its priority is correctly placed.

**POST-04 (Skill-Based Volunteer Matching)** is less directly connected but relevant: the matching data enriches the volunteer profile, which adds signal to the volunteer record. A volunteer whose skills have been matched and confirmed across multiple events is a more attractive voucher recipient and award nominee than one with only a headcount-fill history.

The recommended roadmap addition is a single new post-MVP item, sitting after POST-03 and before any sponsor commercial activation:

**POST-08 — Volunteer Record & Sponsor Infrastructure**
- Volunteer-facing "Your Occasion Record" screen (confirmed events, hours, role diversity)
- Scoring engine (internal, not yet exposed as a public score)
- Sponsor entity data model extension (building on POST-07 SPONSOR item type)
- Code issuance infrastructure for volunteer vouchers
- Award nomination workflow (for Idea B event)

This keeps the infrastructure work consolidated rather than distributed across three separate PRDs and keeps the commercial activation cleanly separated from the credential launch.

---

### Summary Verdicts

| | Idea A: Sponsor Vouchers | Idea B: Community Events |
|---|---|---|
| Strategic merit | High — genuinely differentiated sponsor channel with strong data story | High — community flywheel, brand proof-point, PR asset |
| Risk level | Medium — gamification risk manageable with careful framing | Low-Medium — timing risk, not concept risk |
| Timing | Activate at month 18, after volunteer record infrastructure live | First event at month 24; do not announce before month 18 |
| Dependency | POST-03 (hours logging), POST-07 data model extension | POST-03 + Idea A infrastructure; sufficient volunteer community volume |
| Revenue type | Direct (sponsor commercial agreements) | Indirect (platform loyalty, PR, sponsor relationship amplification) |
| Recommended action | Build infrastructure now, activate commercially at month 18 | Plan now, build infrastructure with Idea A, run first event at month 24 |

Neither idea should be on the product backlog for the current MVP sprint. Both ideas depend on data and community that do not yet exist. The work to do now is to ensure that the infrastructure being built (POST-03 specifically) is designed with these use cases in mind, so the activation in 18 months does not require a rebuild.

The copy constraint from the copy library bears repeating: do not use gamification language with volunteers. When these features launch, the framing must be credential and recognition, not points and rewards. The word "occasion" does the work here: "Your Occasion Record" is a record of occasions you rose to. That is the right register.
