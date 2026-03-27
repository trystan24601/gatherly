# Occasion HQ — Copy Library

> The authoritative copy reference for `occasionhq.com`. Open this document when writing UI text, email subjects, error messages, or marketing copy. Every entry is opinionated. Recommended variants are marked ✓.

---

## 1. Brand Lines

### Hero Headlines

Eight options for landing page A/B testing. All designed for the hero section: Plus Jakarta Sans 800, tight tracking, line break preserved where shown.

| # | Headline | Context / angle | Rec |
|---|---|---|---|
| 1 | Where it all comes together. | Platform-level promise. Warm, confident, slightly cryptic — earns the scroll. Already in the wireframe. | ✓ |
| 2 | Every role filled. Every event ready. | Outcome-led. Speaks directly to the organiser's deepest need. Strong for paid acquisition. | ✓ |
| 3 | The volunteers are out there. Let's find them. | Conversational opener. Organiser-facing. Challenges the WhatsApp-and-hope status quo. | |
| 4 | Your next event. Fully staffed. | Punchy. Mirrors the hero-moment copy in the app. Good for retargeting. | |
| 5 | Stop managing volunteers in spreadsheets. | Problem-first. Highest relevance for warm audiences who know the pain. | ✓ |
| 6 | Volunteering, made worth it. | Volunteer-facing. Positions the platform as a quality signal for their time. | |
| 7 | Built for the occasion. | Tagline-weight. Pairs well with an event photograph as the background visual. | |
| 8 | The platform your volunteers actually want to use. | Social proof angle — validates that the organiser's offer will land well. | |

**Recommended primary test:** Headline 1 (brand moment) vs Headline 2 (outcome-led). Headline 5 for bottom-of-funnel paid channels targeting race directors.

---

### Sub-headlines

The line that follows the hero. Inter 16px, muted colour. One sentence. Explains the product without feature-listing.

| # | Sub-headline | Pairs with hero # | Rec |
|---|---|---|---|
| 1 | Built for the occasion. | 1 | ✓ |
| 2 | Volunteer coordination for events that actually matter. | 2, 4 | ✓ |
| 3 | Structured roles. Real-time fill rates. No spreadsheet required. | 5 | ✓ |
| 4 | From published event to fully staffed team — without the WhatsApp chaos. | 3, 5 | |
| 5 | Find your role. Show up. Make it count. | 6 | |
| 6 | For running clubs, charity events, sportives, and everything in between. | 7 | |

---

### Taglines

Short, repeatable, brand-level. Used in footers, social bios, presentations, and email signatures.

| # | Tagline | Register | Rec |
|---|---|---|---|
| 1 | Built for the occasion. | Confident, platform-level. The primary. | ✓ |
| 2 | Every occasion, fully staffed. | Outcome-focused. Works well alongside event imagery. | ✓ |
| 3 | Rise to the occasion. | Action-oriented. Speaks to both sides simultaneously. | |
| 4 | The events platform for people who give their time. | Descriptive. Good for app store listings and press coverage. | |

---

### Elevator Pitches

One sentence each. These are the answers to "what is it?" — used in bios, the About page, press kit, and investor decks.

**For organisers:**
> Occasion HQ replaces the spreadsheets and WhatsApp groups race directors use to coordinate volunteers — publish your event, define your roles, and confirm your team without leaving the platform.

**For volunteers:**
> Occasion HQ is where you find local events that need your time, apply for a role that fits your schedule, and build a record of every occasion you've shown up for.

**For investors and press:**
> Occasion HQ is the UK's volunteer coordination platform for event-led organisations — the infrastructure layer connecting the 15,000+ running clubs, charity events, and community initiatives that currently manage volunteers in spreadsheets with the people who want to give their weekends to something meaningful.

---

## 2. Organiser Copy

### Event Creation Flow

#### CTA Labels

| Context | Label | Rec |
|---|---|---|
| Start creating an event | Create your first event | ✓ |
| Start creating subsequent events | Create new event | ✓ |
| Save draft and continue later | Save draft | ✓ |
| Add a role to the event | Add a role | ✓ |
| Add another role | Add another role | ✓ |
| Publish the event | Publish event | ✓ |
| Confirm publish in dialog | Yes, publish now | ✓ |
| Edit a draft | Edit event | ✓ |

#### Form Placeholder Text

| Field | Placeholder |
|---|---|
| Event title | e.g. Redhill 10K Fun Run 2026 |
| Event description | Tell volunteers what the event is about and what to expect |
| Venue name | e.g. Redhill Park |
| Postcode | e.g. RH1 2AA |
| Role name | e.g. Water Station Marshal |
| Role description | What will this volunteer be doing? Any experience needed? |
| Headcount | e.g. 8 |
| Shift start time | 08:00 |
| Shift end time | 12:00 |
| Location notes | e.g. Meet at the main car park entrance |
| Decline reason | e.g. This role is now full — we'll let you know if a spot opens up |

#### Confirmation Messages

| Trigger | Message |
|---|---|
| Draft saved | Draft saved |
| Role added | Role added |
| Role deleted | Role removed |
| Event published | Your event is live. Volunteers can now find and apply for roles. |
| Event published (with share prompt) | Your event is live. Share the link to get your first volunteers. |

#### Publish Confirmation Panel

The panel shown before the organiser confirms publication. This is a high-stakes action — the copy must be clear, not just procedural.

```
Publish "Redhill 10K Fun Run"?

Your event will appear in the volunteer discovery feed.
Volunteers can apply for roles immediately.

3 roles · 20 total spots

  [Yes, publish now]   [Not yet]
```

Beneath the buttons, in small muted text:
> You can cancel the event after publishing if your plans change.

---

### Dashboard Empty States

| State | Heading | Body | CTA label |
|---|---|---|---|
| No events yet (first use) | You haven't created an event yet. | Define your roles, publish, and let volunteers find you. | Create your first event |
| No events yet (returning, org just approved) | Your organisation is approved. | You're ready to create your first event and start building your team. | Create your first event |
| No registrations on a newly published event | No applications yet. | Your event is live. Volunteers will start applying as they discover it. | Share your event |
| Event fully staffed (hero panel heading) | All roles filled. | *(See hero moment copy below)* | View full roster |

#### Hero Moment Copy (fully staffed event panel)

```
All roles filled

20 volunteers confirmed across 3 roles

████████████████████████  100%

No further action required.
Your event is fully staffed.
```

Sub-line (muted, below the panel):
> The organiser did not cause this — the platform did. Reflect that in the copy.

#### Partial Fill State (progress panel, not hero)

```
11 of 20 volunteers confirmed

░░░░░░░░░░░░████████████  55%

9 spots still to fill
```

---

### Registration Review

#### Inline Action Buttons

| Button | Label | Variant |
|---|---|---|
| Confirm volunteer | Confirm | Success (green) |
| Decline volunteer | Decline | Danger (red) |
| Cancel (from decline sheet) | Cancel | Ghost |

#### Post-Action Copy

| Action taken | Card copy shown after |
|---|---|
| Confirmed | You confirmed [First Name] for this role. |
| Declined | [First Name]'s application has been declined. |

**Decline bottom sheet heading:**
> Decline [First Name] [Last Name]?

**Decline sheet body:**
> [Role Name] · [Event Name] · [Date]

Reason field label: `Reason (optional)`

**Confirm button in decline sheet:** `Decline application`

**Empty state for pending section (all reviewed):**
> All applications have been reviewed.

---

### Event Cancellation

#### Confirmation Copy (bottom sheet triggered by "Cancel event")

**Heading:**
> Cancel this event?

**Body:**
> Redhill 10K Fun Run · 12 Apr 2026

> All confirmed volunteers will be notified. This cannot be undone.

**Buttons:**

| Button | Label | Variant |
|---|---|---|
| Confirm cancellation | Yes, cancel this event | Danger |
| Go back | Keep it live | Ghost |

#### Post-Cancellation Message (in-app)

> Your event has been cancelled. All volunteers have been notified.

#### Email Subject Line Sent to Volunteers on Cancellation

```
[Event Name] has been cancelled
```

Example: `Redhill 10K Fun Run has been cancelled`

---

### Organiser Error States

| Error | Message |
|---|---|
| Trying to publish with zero roles | Add at least one role before publishing. |
| Trying to edit a published event | Published events can't be edited. Cancel the event and create a new one if your details have changed. |
| Trying to cancel a completed event | Completed events can't be cancelled. |
| Role is already full when confirming a volunteer | This role is already full — you can't confirm any more volunteers. |
| Permission denied (accessing another org's event) | You don't have permission to view this event. |
| Event not found | We couldn't find that event. It may have been removed or you may not have permission to view it. |
| Duplicate org registration | An organisation with this email address already exists. |
| Org rejected — in-app routing message | Your organisation application was not approved. [Verbatim reason shown below.] |

---

## 3. Volunteer Copy

### Discovery Feed

#### Empty States

| State | Heading | Body | CTA label |
|---|---|---|---|
| No events near them (location set) | No events near [Town] right now. | Check back soon — new events are added regularly. | Update my location |
| No events at all (platform early days) | No events yet. | We're just getting started. Check back soon. | — |
| No events matching filters | No events match your filters. | Try removing a filter to see more events. | Clear filters |

#### Filter Chip Labels

| Filter type | Default label | Active state label |
|---|---|---|
| Event type | Event type | [Type name, e.g. Running] |
| Location | Near me | [Town name] |
| Date range | Any date | [e.g. This weekend] |
| Distance | Any distance | [e.g. Within 10 miles] |

**Active filter chips:** The chip label changes to reflect the applied value (e.g. "Running" replaces "Event type"). An × icon appears to clear the individual filter.

#### "X Spots Remaining" Variants

| Spots remaining | Copy | Colour |
|---|---|---|
| > 5 | [N] spots remaining across [N] roles | Muted (#8B8B9A) |
| 3–5 | Only [N] spots left | Warning (#F59E0B) |
| 2 | Only 2 spots left | Warning (#F59E0B) |
| 1 | Last spot — apply now | Warning (#F59E0B) |
| 0 | Fully staffed | Muted (#8B8B9A) |

The fill bar and spot count together communicate urgency. Do not add emoji or exclamation marks to urgency copy — the colour and count do the work.

---

### Event Detail (Volunteer View)

#### Apply CTA

| Context | Label | Rec |
|---|---|---|
| Role has spots | Apply for this role | ✓ |
| Apply CTA in bottom sheet | Yes, apply for this role | ✓ |
| Dismiss sheet without applying | Not right now | ✓ |

#### Role Full Message (replacing the CTA in full role card)

```
All spots filled — see other roles ↑
```

The ↑ arrow is a scroll-affordance hint. Keep it. This is a resolve action, not a dead end.

#### Application Submitted Confirmation (bottom sheet success state)

**Heading:** `Application submitted`

**Body:**
```
You're in the queue for:
[Role Name]

Your application is with [Org Name] for review.
They typically respond within 24 hours.
```

**Primary CTA:** `View my applications`

**Secondary action (text link):** `Close`

---

### Volunteer Dashboard (My Registrations)

#### Section Labels

| API status group | Section heading label |
|---|---|
| CONFIRMED | Confirmed |
| PENDING | Awaiting review |
| COMPLETED | Past events |
| CANCELLED | Cancelled |

Section labels: Inter 11px, 600, uppercase, letter-spacing 0.14em, muted.

#### Status Badge Display Labels

These are the human labels for API statuses. Never expose the raw API value in the UI.

| API status | Badge label | Badge colour |
|---|---|---|
| PENDING | Awaiting review | Amber (#F59E0B) |
| CONFIRMED | Confirmed | Green (#4ADE80) |
| DECLINED | Not accepted | Red (#EF4444) |
| CANCELLED | Cancelled | Muted (#848D97) |
| COMPLETED | Attended | Muted (#848D97) |

#### Confirmed State Copy (RegistrationCard)

```
You're confirmed for this role.
See you on race day.
```

This is a statement of belonging, not a status report. Do not change it to "Your registration has been confirmed."

#### Pending Reassurance Copy (RegistrationCard — most important copy on this screen)

```
Your application is with [Org Name] for review.
They typically respond within 24 hours.
```

At MVP this is generic. When org response-time data is available, replace "24 hours" with the org's actual median. Design the copy slot for it now.

The word "typically" is load-bearing — it sets a realistic expectation without making a promise the platform cannot keep.

#### Completed / Attended State Copy (RegistrationCard)

```
Thanks for volunteering. You gave [N] hours of your time.
```

Hours are derived from shift length (shiftEnd minus shiftStart). If the shift straddles midnight, compute correctly — do not show negative or nonsensical values.

**Upsell CTA on completed card (premium feature):** `Download hours certificate`

This CTA is shown to all users; it triggers an upsell sheet for users not on a qualifying tier. Do not hide it from free-tier users — the visibility is the point.

#### Empty State (no registrations yet)

**Heading:** `You haven't signed up for anything yet.`

**Body:** `Find an event near you and apply for a role to get started.`

**CTA:** `Browse events near you`

---

### Volunteer Cancellation

#### Cancel Confirmation Bottom Sheet

**Heading:** `Cancel your place?`

**Body:**
```
[Role Name]
[Event Name] · [Date]

The organiser will be notified and your spot will be released.
```

**Buttons:**

| Button | Label | Variant |
|---|---|---|
| Confirm cancellation | Yes, cancel my place | Danger |
| Go back | Keep my place | Ghost |

#### Post-Cancellation Message (card state after cancellation)

The registration card remains visible in the Cancelled section with:
```
You cancelled this registration.
```

Do not write "Your registration has been cancelled." The volunteer cancelled it — acknowledge their agency.

---

## 4. Email Subjects

All email subjects follow the formula: **[Specific detail] — [Action or state]**. Never start with "Re:", "Fwd:", or emoji. Subject lines are the first piece of copy the recipient reads — they must earn the open.

```
Registration confirmed (to volunteer):
[Event Name] — you're confirmed as [Role Name]

Example: Redhill 10K Fun Run — you're confirmed as Water Station Marshal
```

```
New registration (to organiser):
New application for [Role Name] — [Event Name]

Example: New application for Start/Finish Marshal — Redhill 10K Fun Run
```

```
Event fully staffed (to organiser):
[Event Name] is fully staffed

Example: Redhill 10K Fun Run is fully staffed
```

```
Password reset:
Reset your Occasion HQ password
```

```
Organisation approved:
Your organisation has been approved — you're ready to create events
```

```
Organisation declined:
Your Occasion HQ application was not approved
```

```
Event cancelled (to volunteer):
[Event Name] has been cancelled
```

```
Lift-share match proposed (post-MVP — write it now):
Someone near you is heading to [Event Name]
```

**Notes on lift-share subject line:** "Someone near you" deliberately avoids naming the match before the volunteer has opened the email — the privacy model requires anonymity until both parties accept. The subject earns the open through proximity and shared destination, not personal detail.

---

## 5. In-App Microcopy

### Status Badge Labels (in context sentences)

Badges carry the short label (e.g. "Confirmed"). When the status needs to appear in a sentence, use these forms:

| API status | Badge label | In a sentence |
|---|---|---|
| PENDING | Awaiting review | "Your application is awaiting review." |
| CONFIRMED | Confirmed | "You're confirmed for this role." |
| DECLINED | Not accepted | "Your application was not accepted." |
| CANCELLED | Cancelled | "You cancelled this registration." |
| COMPLETED / ATTENDED | Attended | "You attended this event." |
| DRAFT (event) | Draft | "This event is in draft." |
| PUBLISHED (event) | Published | "Your event is live." |
| ALL FILLED (role) | All filled | "This role is fully staffed." |

---

### Loading States (one per main screen)

Loading copy should describe what the platform is doing, not ask the user to wait. Never use "Please wait..." or a generic spinner with no label.

| Screen | Loading copy |
|---|---|
| Discovery feed (initial load) | Finding events near you... |
| Discovery feed (load more) | Loading more events... |
| Event detail | Loading event details... |
| Volunteer dashboard | Loading your registrations... |
| Organiser event dashboard | Loading your event... |
| Registration review | Loading applications... |

---

### Success Toasts

Toasts are brief. They confirm an action was taken. They do not over-congratulate.

| Trigger | Toast copy |
|---|---|
| Applied for a role | Application submitted |
| Volunteer confirmed by organiser | [First Name] confirmed |
| Volunteer declined by organiser | Application declined |
| Volunteer cancelled their registration | Registration cancelled |
| Organiser published event | Event published |
| Draft saved | Draft saved |
| Profile updated | Profile updated |
| Skills updated | Skills saved |

Toast duration: 3 seconds. No dismiss button required on success toasts. Toasts stack from the top on mobile.

---

### Destructive Action Confirmations

These appear in bottom sheets. The copy must state the consequence, not ask "Are you sure?" The consequence is what matters.

#### Cancel event (organiser)

**Heading:** `Cancel this event?`

**Body:** `All confirmed volunteers will be notified. This cannot be undone.`

**Confirm button:** `Yes, cancel this event`

**Dismiss button:** `Keep it live`

---

#### Decline volunteer (organiser)

**Heading:** `Decline [First Name] [Last Name]?`

**Body:** `[Role Name] · [Event Name] · [Date]`

**Optional reason field label:** `Reason (optional)`

**Confirm button:** `Decline application`

**Dismiss button:** `Cancel`

---

#### Cancel registration (volunteer)

**Heading:** `Cancel your place?`

**Body:** `[Role Name] · [Event Name] · [Date]`

**Supporting line:** `The organiser will be notified and your spot will be released.`

**Confirm button:** `Yes, cancel my place`

**Dismiss button:** `Keep my place`

---

### Bottom Nav Tab Labels

Volunteer nav (4 tabs):

| Tab | Label | Icon | Route |
|---|---|---|---|
| 1 | Explore | Calendar outline | `/events` |
| 2 | Saved | Bookmark | `/events/saved` (post-MVP) |
| 3 | My Events | List | `/dashboard/registrations` |
| 4 | Profile | Person | `/profile` |

Organiser nav (3 tabs):

| Tab | Label | Icon | Route |
|---|---|---|---|
| 1 | Events | Calendar outline | `/organisation/dashboard` |
| 2 | New event | Plus circle | `/organisation/events/new` |
| 3 | Account | Person | `/organisation/account` |

**Notes:**
- "Explore" not "Home" — the feed is the action, not a home screen.
- "My Events" not "Registrations" — plain language that matches the screen title.
- "New event" not "Create" — the noun makes the action concrete.
- Saved tab is post-MVP. Show the tab, grey it out, no lock icon. The label remains "Saved" — it describes what will be there, which is more useful than a lock symbol.

---

### Wordmark Alt Text and Aria Labels

The `occasion`/`hq` mark has two weight-distinct parts. Screen readers need a single coherent label.

```html
<!-- Wordmark as a link (in the app header) -->
<a href="/" aria-label="Occasion HQ — go to home">
  <span aria-hidden="true">
    <span class="font-extrabold">occasion</span><span class="font-normal text-sm">hq</span>
  </span>
</a>

<!-- Wordmark as a static identity element (in the footer or email) -->
<span role="img" aria-label="Occasion HQ">
  <span aria-hidden="true">
    <span class="font-extrabold">occasion</span><span class="font-normal text-sm">hq</span>
  </span>
</span>
```

`aria-hidden="true"` on the visual children prevents screen readers from announcing "occasion" and "hq" as separate words. The `aria-label` on the container gives the full intended name.

Never write the wordmark as `occasionhq` (one word) in any copy context. The correct form is `Occasion HQ` in running text and `occasion`+`hq` as the visual mark.

---

## 6. The "Occasion" Copy System

The word "occasion" carries three semantic registers simultaneously: the special moment (this matters), conditional presence (ready when needed), and rising to meet something (doing what is required, fully, when it counts). No invented name achieves this. This section maps how to exploit all three across every surface in the platform.

### Register 1 — The Noun (the event itself)

"Occasion" as the thing being created or attended. Used in contexts where the organiser is building something and the volunteer is joining something.

| Variant | Surface | Notes |
|---|---|---|
| What's your occasion? | Onboarding fork screen, above the role-selection cards | Replaces "I want to..." with something that frames the interaction as ownership ✓ |
| Every occasion needs the right people. | Landing page section header for the organiser value prop | |
| One occasion. Twenty volunteers. Zero spreadsheets. | Social / paid acquisition | |

---

### Register 2 — The Possessive (belonging and ownership)

"Your occasion" frames ownership for organisers and belonging for volunteers simultaneously. The same two words do different emotional work for each audience.

| Variant | Surface | Notes |
|---|---|---|
| Make it your occasion. | Landing page sub-headline or organiser onboarding confirmation | ✓ |
| Your occasion is ready. | Organiser email subject when event is fully staffed | Alternatives: "Your event is fully staffed." Use this variant when the emotional register needs lifting. |
| This is your occasion too. | Volunteer confirmation email, opening line | Reminds the volunteer they are part of the event, not just a resource in it. |

---

### Register 3 — The Quality Marker (aspiration)

"An occasion to remember" sets a standard. It signals that the platform is not just logistics — it is enabling something worth experiencing.

| Variant | Surface | Notes |
|---|---|---|
| An occasion to remember. | Social proof section header on the landing page | Sits naturally above a testimonial quote ✓ |
| Every event deserves to be an occasion. | Marketing email opening line, or pitch deck slide | |
| Make it an occasion worth showing up for. | Organiser empty state, after first event published | Motivational, not transactional. |

---

### Register 4 — The Challenge (rise to the occasion)

"Rise to the occasion" is the machine metaphor — doing what is required, fully, when it counts. This is the platform's internal design philosophy made external.

| Variant | Surface | Notes |
|---|---|---|
| Rise to the occasion. | Volunteer onboarding completion screen, or social tagline | ✓ |
| Built to rise to the occasion. | Investor pitch, About page | |
| Your team rose to the occasion. | Organiser post-event email, subject line variant | Celebrates the outcome. Pairs with hours logged data when available. |

---

### Register 5 — The Verb Phrase (building something together)

"We'll help you build your occasion" puts the platform in a supporting role without being subservient. The organiser is the author; Occasion HQ is the craft tool.

| Variant | Surface | Notes |
|---|---|---|
| We'll help you build your occasion. | Organiser onboarding welcome email, opening line | ✓ |
| Build your occasion in minutes. | Landing page step-by-step section intro | |
| Your occasion is taking shape. | Organiser dashboard when event is partially filled (under the progress bar) | Replaces the neutral "11 of 20 confirmed" with something that acknowledges momentum. |

---

### Register 6 — The Platform as Enabler

The platform makes occasions possible at scale. This register is used for macro positioning — the About page, press coverage, investor narrative.

| Variant | Surface | Notes |
|---|---|---|
| Every occasion, fully staffed. | Tagline. Footer, social bio, app store. | ✓ |
| The infrastructure behind every occasion. | About page, press kit | |
| Occasions don't happen by accident. | Marketing email subject line, blog post intro | Opens a conversation about the coordination work that makes community events work. |

---

## 7. What Not to Say

These are banned words, phrases, and tones. The reason matters as much as the ruling — understanding why a phrase is wrong helps apply the principle to novel copy situations.

| Avoid | Why |
|---|---|
| "Seamless" | An empty claim. Every platform promises "seamless" and means "we tried." Show the smoothness; don't assert it. The fill bar reaching 100% is seamless. The word is not. |
| "Leverage" / "utilise" | Corporate jargon with no place on a platform used by running club volunteers and race directors. Use "use." |
| "Get started" as a standalone CTA | Too vague. Every CTA should say what happens next: "Create your first event", "Browse events near you". "Get started" is acceptable when followed by a clarifying sub-label (as in the landing page hero) but never alone. |
| "Platform" in volunteer-facing copy | Volunteers are not buying software. Refer to "Occasion HQ" or use it implicitly. "Your application is with [Org Name]" — not "The platform has submitted your application." |
| "We're excited to..." | Weak, corporate-warm, and reads as template email. Just say what you're doing. "Your organisation has been approved." Not "We're excited to let you know your organisation has been approved." |
| Gamification language ("level up", "streak", "earn points", "reward") | Volunteering is intrinsically motivated. Imposing a game layer over it is patronising and misreads the audience. The hours certificate is a credential, not a reward. |
| "Eco-friendly" / "sustainable" / any environmental claim in marketing | Do not make environmental claims without data. The lift-share impact figure ("Your event generated 23 lift-share journeys, reducing estimated travel emissions by 18%") is a legitimate retrospective data point. Forward claims are not. |
| Passive voice in CTAs | "Registration can be completed" instead of "Register". "Volunteers can be confirmed" instead of "Confirm your team." Active voice always. |
| "Please note that..." / "At this time..." | Filler. Remove entirely and say the thing directly. |
| Calling the product "Occasion" without "HQ" in written copy | The brand is Occasion HQ. The visual mark separates the two weights, but in body copy, email, and speech it is always "Occasion HQ". "Occasion" alone creates disambiguation risk with competitor products. |

---

*Last updated: 2026-03-26. This document should be updated whenever new copy surfaces are added to the product. Brand questions and copy escalations: raise in the design system channel with the `copy` label.*
