# Occasion HQ Community Events — Strategic Analysis

> Written by the Product Owner. Last updated: 2026-03-26.
> Scope: annual regional volunteer celebration gatherings hosted and managed by Occasion HQ itself.

---

## The Meta Point, Stated Plainly

The platform that helps others run occasions should run one itself. This is not a marketing stunt. It is the only credible way to stress-test the platform under real conditions, generate authentic organiser-side testimony, and demonstrate to prospective organisations that Occasion HQ stands behind what it sells. A founder who has never experienced coordinator fatigue cannot credibly claim to have solved it.

Every design decision in what follows should be evaluated against this question: does this make the platform better, or does it just make the event bigger?

---

## 1. What Format Works

### The Core Tension

Three constituencies must leave with something real:

- **Volunteers** want recognition, belonging, and connection with peers
- **Organisers** (the paying side) want proof that the platform delivers and peer-to-peer reassurance from other coordinators
- **Sponsors** want visible association with a community that aligns with their brand values

A single format rarely satisfies all three simultaneously. The mistake is designing for one and tolerating the other two.

### The Recommended Format: The Occasion Gathering

Not a black-tie awards ceremony. Not a volunteer fair. Not a community run. A structured half-day gathering with three interlocking components, each serving a different constituency:

**Component 1 — The Recognition Moment (45–60 minutes)**
A presentation ceremony held in the middle of the event, not at the end. Short, high-signal awards with genuine stories behind them. Categories below. Anchored by a host who is a recognisable figure in the local volunteer or running community — not a corporate MC. The recognition moment is the reason people come; putting it at the end means half the room has left.

**Component 2 — The Community Fair (before and after the ceremony, 90 minutes total)**
Organisations with tables. Not a trade show — no pull-up banners and no sales pitches. Tables with genuine materials: upcoming events, volunteer opportunities, photos from previous occasions. Volunteers browse and sign up for events on the spot through Occasion HQ. This is a live demonstration of the discovery feed working in a room of real people. Sponsors can hold a table here without dominating the room.

**Component 3 — The Coordinator Roundtable (parallel track, 60 minutes)**
While volunteers are at the fair, coordinators sit in a side room for a structured peer session. Moderated discussion: what worked, what failed, what they wish the platform did. Occasion HQ facilitates but does not present. The output is genuine product insight. The side effect is that coordinators leave having met three colleagues who run similar events — this is the supply-side referral flywheel working in person.

### Why Not a Community Run

A community run would serve volunteers well and sponsors adequately, but it excludes coordinators almost entirely. Coordinators attend runs as marshals, not as participants. The gathering format gives coordinators a dedicated track and keeps the event accessible to volunteers who are not runners.

### Why Not a Pure Awards Ceremony

Awards ceremonies without a community layer are transactional. People attend, receive recognition or watch others receive it, and leave. There is no mechanism for relationship formation, which is the outcome with the highest long-term retention value.

---

## 2. Dogfooding the Platform

### The Principle

Every aspect of the Occasion Gathering that can be run on Occasion HQ, must be. This is not optional. If the platform cannot handle its own event, it is not ready for anyone else's.

### What Gets Run Through the Platform

| Event Need | Platform Feature Used | Honest Assessment |
|---|---|---|
| Event creation and publication | MVP-04, MVP-06 | Straightforward. This is the core loop. |
| Role definition (setup crew, registration desk, photography, runner escort, session hosts) | MVP-05 | Good test — more varied role types than a typical race event |
| Volunteer sign-ups and registration management | MVP-08 | Will expose friction in the coordinator confirmation flow at scale |
| Volunteer discovery and matching | MVP-07 | First real test with a motivated audience |
| Day-of check-in | POST-MVP (on-day check-in is out of scope) | This is a gap — see below |
| Post-event hours logging and impact report | POST-MVP | Gap — see below |
| Lift-share matching for attendees travelling in | POST-02 | Ideal first real-world test of the algorithm |

### The Honest Gaps

Two features that are essential for this event format are explicitly out of scope for MVP: on-day check-in and volunteer hours logging. The community event should not be the first occasion to discover these gaps in a stressful context. This is a reason to sequence the first Occasion Gathering no earlier than the post-MVP phase when these features exist.

Do not patch around them with spreadsheets for this event. If you run a community gathering with a spreadsheet for check-in, every coordinator in the room will notice. That is the opposite of what this event is for.

### The Marketing Content This Creates

Run the event on the platform. Screen-capture the coordinator dashboard filling up. Film the moment the fill bar hits 100% on the last role. Interview the volunteer coordinator running the event — who is also an Occasion HQ user — on what the experience was like. This is not manufactured content. It is the real thing.

The shareable event link (POST-01) used to promote the event through social media and running club mailing lists is a live demonstration of the Calendly-style acquisition model working.

### The Role of Occasion HQ Volunteers at the Event Itself

Occasion HQ staff and contracted helpers should be registered on the platform as volunteers, managed through the same coordinator interface as any other event. No back-channel spreadsheet for internal roles. If the head of engineering is doing AV setup, they have a role on the platform with a shift time and a confirmation email. This discipline matters.

---

## 3. Regional Rollout Sequencing

### The Wrong Approach

Do not spread thin. Running three small events in three cities simultaneously in year one will produce three mediocre events and three thin community experiences. The first event must be dense enough to feel like something.

### Criteria for Selecting the First Region

**Primary criterion: existing platform density.** The OCCASION-REPORT identifies the initial ICP as race directors in the south of England. The first event should be in the region where the platform already has the most active organisations and volunteers. There is no value in running a regional gathering in a region where the platform has no presence.

**Secondary criteria, in order of importance:**

1. Venue access — a half-day gathering for 80–150 people requires a community hall, sports club facility, or similar. Not a hotel. The venue should belong to or be connected with a user organisation.
2. Local community anchor — is there a well-networked individual (a parkrun event director, a running club chair, a county volunteer coordinator) who will actively promote the event? This person is not a sponsor. They are a community co-host.
3. Volunteer pool size — the event needs at least 40 confirmed volunteer attendees to feel alive. At 20% no-show rates, that means 50 RSVPs minimum.
4. Geographic concentration — all attendees should be within 30 miles. Beyond that, transport becomes a barrier and the lift-share feature gets its first real test.

### Year One: One Event, One Region

The first year is a pilot. One event, one region, 80–120 attendees. The goal is not scale. The goal is a repeatable playbook: event format that works, platform features stress-tested, content captured, coordinator roundtable insights fed into the backlog.

**Target: Surrey / Hampshire corridor, autumn.** Densest likely concentration of running events and sports clubs in the initial ICP. Enough volunteer community to fill 80 spots without drawing from outside the region.

### Year Two: Two or Three Regions

Once the playbook exists, it can be replicated. The selection criteria are the same — choose regions where platform density is now high enough to support a 100+ person event without manufacturing artificial attendees.

### The Minimum Viable Footprint

First event: 80 attendees, 4–6 volunteer roles, 1 coordinator roundtable track (15–20 organisers), 3–5 award categories, 2–3 sponsors. This is achievable without a full-time events team.

---

## 4. The Awards — Categories and Selection

### What the Awards Must Do

Awards must recognise real, verifiable achievement — not effort or longevity alone. They must be specific enough that a recipient can point to them as meaningful credential, and broad enough that multiple types of organisations have a realistic chance of winning.

### Recommended Categories for Year One

**Best Occasion of the Year — Community Impact**
The event that demonstrably achieved the most for its community. Judged on: number of volunteers mobilised, scope of impact (who benefited and how), and coordinator-reported outcome quality. Not just volunteer count — a 20-person food bank shift that feeds 300 families beats a 100-person 10K fun run on impact grounds.

**Best Volunteer Experience**
Judged on volunteer-reported experience quality. Requires a post-event feedback mechanism on the platform to generate evidence. This is a strong incentive for organisations to use the platform's post-event flow — their nominees must have documented feedback, which means the platform must have collected it.

**Most Innovative Use of Volunteers**
Recognises novel role design, unusual volunteer deployment, or a creative coordination approach. Judges select this one — it cannot be voted on because voters will not know what "innovative" means without context. A panel of 3–5 platform users from diverse organisations.

**First Occasion Award**
The best event from an organisation in its first year on the platform. This is a deliberate retention mechanic: new organisations know there is a category designed for them, which reduces the intimidation of competing against established operators.

**Rising Volunteer of the Year**
An individual volunteer, not an organisation. Nominated by coordinators through the platform. Judged on consistency (number of events attended), reliability (confirmed vs cancelled ratio), and one specific contribution that a coordinator can name. This award is the one that drives volunteer retention because it makes visible the ladder from first-timer to recognised contributor.

### What Not to Do in Year One

Do not have more than five categories. Award inflation devalues all of them. Do not have a "most events" award — it rewards quantity over quality and disadvantages small but excellent organisations. Do not allow pure public voting without a nomination layer — it becomes a popularity contest for whichever organisation has the largest email list.

### Selection Mechanism

**Stage 1 — Nominations (4 weeks before event).** Organisations and volunteers submit nominations through the platform. A nomination form is not a survey — it asks for: the nominee's name, the specific event or contribution being recognised, and a 200-word account of why it qualifies. Generic nominations are rejected.

**Stage 2 — Platform data validation.** Before a nomination reaches judges, the platform checks: is the nominated organisation or volunteer active on Occasion HQ? Do their event records support the nomination claims? This is both quality control and a demonstration of what the platform's data can do.

**Stage 3 — Panel review.** Three to five judges drawn from the coordinator community, not from Occasion HQ staff. Staff should not be judging their own platform's users. Judges score shortlisted nominations against published criteria.

**Stage 4 — Announcement at the event.** Not before. Winners are not notified in advance except through a sealed-envelope process on the day. This is not secrecy theatre — it ensures the ceremony has a genuine moment of revelation.

### Driving Engagement Through the Nomination Process

Opening nominations 8 weeks before the event gives organisations a reason to log back into the platform and submit evidence. This is a re-engagement mechanic disguised as an awards process. A well-designed nomination flow will surface organisations that have drifted and give the Occasion HQ team a reason to reach out to them.

---

## 5. Community Features This Implies

### The Honest Assessment

The community events strategy implies a layer of platform functionality that does not currently exist and is not on the MVP or post-MVP roadmap. These features need to be weighed as a distinct product investment, not assumed to appear automatically.

### Feature 1 — Public Volunteer Profiles

Currently volunteers have profiles but they are not public. A recognition culture requires that verified contribution is visible — at minimum to organisations on the platform, potentially to other volunteers.

What this means in practice: a volunteer profile page at `occasionhq.com/volunteers/<username>` (opt-in, not default) showing: number of events attended, total hours contributed, skills, and a short bio. No personal contact details. No location beyond town.

The awards nomination process cannot work meaningfully without this. A coordinator nominating "Rising Volunteer of the Year" needs to be able to point to a record.

**Complexity to flag:** Privacy-first design required. Discoverability must be opt-in. Under-18 volunteers require parent or guardian consent before any public profile is permitted. This is not optional and it is not trivial.

### Feature 2 — Post-Event Feedback Collection

The "Best Volunteer Experience" award category requires structured volunteer feedback data. This is a post-event flow: 48 hours after event completion, volunteers receive a short (4-question) feedback prompt. Coordinators can see aggregate scores but not individual responses attributed to named volunteers.

This is also a standalone product value: organisations get genuine quality signal, and the platform has data to surface in impact reports.

**Complexity to flag:** Email fatigue is real. This prompt competes with the thank-you email, the impact summary, and any communications from the organisation itself. The timing and copy must be tuned carefully. One prompt, sent once.

### Feature 3 — Volunteer Hours Record and Impact Certificate

Required for the recognition framework to have portable value. A volunteer who attends five events on the platform should be able to download a PDF showing their contribution: events, roles, hours, and a platform-verified signature. Coordinators confirm attendance at event completion — the hours are not self-reported.

This is already identified in the OCCASION-REPORT as the "highest-performing add-on" for the revenue model (£20–30/month). The community events strategy accelerates its priority because the awards programme creates demand for it.

### Feature 4 — Organisation Profiles (Public)

Each approved organisation should have a public page at `occasionhq.com/organisations/<slug>` showing: organisation name, type, upcoming events, and a count of total volunteer hours contributed through the platform. This is what coordinators can point to when nominating for awards and what prospective volunteers use to evaluate whether an organisation is worth their time.

This page should be generated as a static snapshot at organisation approval time and updated whenever the org publishes or completes an event. It is an SEO surface as well as a community one.

### Feature 5 — Nomination and Voting Interface

A dedicated flow within the platform for submitting and managing award nominations. Not a Google Form. The nomination should pull from existing platform data (event records, registration history) to pre-populate evidence, reducing friction for the nominator and guaranteeing data quality for the judges.

### Features That Are Not Needed

**Community feed / social wall:** Not recommended. Occasion HQ is a coordination platform, not a social network. A feed implies a content creation burden on users and a moderation burden on the platform. The community experience at the physical event is the feed. Keep the platform focused on events.

**Leaderboards:** Dangerous if implemented naively. Public ranking of volunteers by event count creates perverse incentives — people will game it, and it will disadvantage occasional but high-quality contributors. If leaderboards exist at all, they should be private to the individual (showing personal progress, not relative ranking) or organisation-scoped.

---

## 6. Timing — When to Run the First Event

### What Must Be True First

This is the single most important section in this document. Running the first Occasion Gathering too early is worse than not running it at all. The event is a demonstration. A demonstration of a half-built machine does not inspire confidence.

**Non-negotiable prerequisites:**

1. **The minimum viable occasion is running reliably.** All five criteria from the OCCASION-REPORT must be met in real conditions, not just in a staging environment: coordinator-created event, volunteer discovery without coordinator-sent links, structured role registrations confirmed without leaving the platform, at least one lift-share match, coordinator using the roster on event day.

2. **At least 10 active organisations on the platform** with a completed event each. "Active" means they published an event, filled roles, and marked it complete. Not organisations who registered and went quiet.

3. **At least 150 volunteer accounts with at least one confirmed attendance.** The event's volunteer audience should be drawn from people who already know what the platform does because they have used it. Inviting people who have never used Occasion HQ to a celebration of Occasion HQ is a logical inversion.

4. **Post-event feedback collection is live.** The "Best Volunteer Experience" award is not credible without it.

5. **Volunteer hours record is live.** The "Rising Volunteer of the Year" award is not credible without verified hours data.

6. **The shareable event link (POST-01) is live.** This is the primary promotion mechanism for the event itself.

### The Earliest Realistic Window

Given the current MVP scope and the post-MVP roadmap, and assuming a focused build pace, the community events prerequisites align approximately with the Phase 2 / Phase 3 transition in the growth strategy: 12–18 months from platform launch. The target for the first Occasion Gathering is autumn of the year following launch — giving the platform one full event season to build the density required.

A platform that has been live for six months and has 10 active organisations is not ready. A platform that has been live for 12–14 months, has 25+ active organisations, and has run a full spring/summer race season has a story worth celebrating.

### The Early-Signal Alternative

Before the first full gathering, Occasion HQ can run a smaller proof-of-concept: a volunteer coordinator meetup (20–30 people, evening format, no awards) in the primary target region. This is not a public-facing event. It is a closed session for the earliest adopters, managed through the platform as an internal event. It stress-tests the event creation and management flow on a low-stakes occasion and gives the team a read on what coordinators actually want from a community event before committing to the full format.

This meetup can happen as early as 6 months after launch, once 8–10 active organisations exist in one region.

---

## 7. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Event is underpopulated — fewer than 50 attendees | Medium | High — a sparse room undermines the community narrative | Set a 60-person go/no-go threshold 3 weeks before the event; postpone rather than run thin |
| Platform has a visible failure on event day (check-in, notifications) | Low (if prerequisites met) | Very high — every coordinator in the room will notice | Do not run the event until on-day check-in is live and tested; have a manual backup plan that is never used |
| Awards process is perceived as biased toward the largest organisations | Medium | High — poisons community trust | Publish judging criteria before nominations open; make the panel composition public |
| Sponsors dominate the experience and it feels commercial | Medium | Medium — deters volunteers and smaller orgs | Sponsors get table presence at the fair only; their branding does not appear in the awards ceremony |
| First-year coordinator roundtable produces backlog requests that conflict with the roadmap | High | Low — this is useful friction | Treat the roundtable as a research session, not a commitment session; publish a summary with honest status |
| Running the event creates a perception that Occasion HQ is competing with its own customers | Low | Medium | Frame the event as a platform showcase and celebration, not as an Occasion HQ-branded event that overshadows org events; orgs should feel they own the community, not Occasion HQ |

---

## Summary: The Sequenced Plan

| Milestone | Timing | Prerequisite |
|---|---|---|
| Coordinator meetup (closed, 20–30 people) | Month 6–8 post-launch | 8+ active organisations in one region |
| Nomination flow built into platform | Month 10–12 post-launch | Post-event feedback and hours logging live |
| First Occasion Gathering announced | Month 12–14 post-launch | 25+ active orgs, 150+ volunteer attendees with confirmed history, all prerequisites met |
| First Occasion Gathering held | Month 14–18 post-launch | All above plus shareable event link live |
| Year two planning begins | Month 6 post-first-event | Playbook documented, platform density assessed in 2–3 candidate regions |

The community events programme earns its place when the platform has earned its reputation. Not before.
