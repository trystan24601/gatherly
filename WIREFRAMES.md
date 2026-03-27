# Occasion HQ — MVP Wireframes

These six wireframes define the primary mobile screens for Occasion HQ (`occasionhq.com`). Each is designed for a 390px-wide portrait viewport (iPhone 14 Pro) as the primary canvas. The platform uses a dark-first visual language anchored on Ember (`#FF6B35`) as the sole interactive accent, with green (`#4ADE80`) reserved exclusively for achievement and completion states. All wireframes are detailed enough for direct developer implementation without further design input.

**Touch target rule:** Every tappable element has a minimum hit area of 44×44px, enforced via padding. The bottom nav items are 60px tall.

---

# Visual Language Supplement

> Reference specification for all six wireframes. Treat this as the source of truth during implementation. Every value here maps directly to a token in `tailwind.config.js` and the CSS custom properties in `frontend/src/index.css`. Never introduce ad-hoc hex values in a component file.

---

## Colour Tokens

The platform is **dark-first**. Light mode is activated by `data-theme="light"` on `<html>`. All token values below are the dark-mode defaults.

```css
/* ── Core surfaces ─────────────────────────────────────────────────────── */
--color-bg:       #0D1117   /* Page background — body, full-bleed wrappers           */
--color-surface:  #161B22   /* Cards, nav bar, bottom nav, form containers            */
--color-raised:   #1C2128   /* Elevated cards, dropdowns, selected card state         */
--color-overlay:  #21262D   /* Modal content area, tooltip fills                      */

/* ── Brand accent: Ember ───────────────────────────────────────────────── */
--color-accent:        #FF6B35               /* Primary CTA, active nav, fill bar, focus rings */
--color-accent-dim:    rgba(255,107,53,0.55) /* Accent border on interactive cards              */
--color-accent-subtle: rgba(255,107,53,0.08) /* Accent background wash (selected state)         */
--color-accent-mid:    rgba(255,107,53,0.15) /* Focus ring, hover backgrounds                   */

/* ── Text hierarchy ────────────────────────────────────────────────────── */
--color-text-primary:   #E6EDF3   /* Headings, card titles, form values    */
--color-text-secondary: #848D97   /* Body copy, metadata, form labels      */
--color-text-tertiary:  #484F58   /* Timestamps, captions, placeholders    */
--color-text-disabled:  #30363D   /* Disabled inputs, deactivated items    */

/* ── Borders ───────────────────────────────────────────────────────────── */
--color-border:        #21262D   /* Card outlines — hairline */
--color-border-mid:    #30363D   /* Input borders (default) */
--color-border-strong: #444C56   /* Input borders (hover)   */

/* ── Semantic ──────────────────────────────────────────────────────────── */
--color-success: #4ADE80   /* Confirmed, fill bar complete, ALL FILLED badge */
--color-warning: #F59E0B   /* PENDING badge, partial-fill signals             */
--color-danger:  #EF4444   /* CANCELLED badge, errors, destructive actions    */
--color-info:    #3B82F6   /* PUBLISHED badge, informational callouts         */
```

**Rule:** Ember (`#FF6B35`) is the only brand accent. It appears on primary buttons, active nav items, fill bars, and focus rings. It does not appear on headings, decorative icons, or general badges.

---

## Typography

```
Display:  Plus Jakarta Sans — weights 700, 800, 900
          Event names, screen titles, section headings, large stat numerals
          font-display

Body:     Inter — weights 400, 500, 600
          All body copy, labels, nav links, badges, form inputs, captions
          font-body / font-sans
```

| Element | Font | Size | Weight | Notes |
|---|---|---|---|---|
| Screen title (h1) | Plus Jakarta Sans | clamp(1.5–2.25rem) | 800 | `tracking-[-0.02em]` |
| Event name in card | Plus Jakarta Sans | 18px | 700 | `tracking-[-0.01em]`, `line-clamp-2` |
| Section heading (h2) | Plus Jakarta Sans | 20px | 700 | `tracking-[-0.02em]` |
| Body copy | Inter | 14px | 400 | `leading-[1.6]` |
| Form labels | Inter | 14px | 500 | |
| Nav link labels | Inter | 13px | 500 | |
| Status badge text | Inter | 10px | 700 | `tracking-[0.08em]`, `uppercase` |
| CTA button text | Inter | 13px | 600 | |
| Timestamps / captions | Inter | 12px | 400 | `tracking-[0.04em]` |

Apply to all numeric text: `font-variant-numeric: tabular-nums`

---

## The `occasion` / `hq` Mark

```jsx
<span className="font-display font-extrabold text-text-primary tracking-tight">
  occasion
</span>
<span className="font-display font-normal text-text-tertiary" style={{ fontSize: '0.75em' }}>
  hq
</span>
```

- `hq` sits on the same baseline as `occasion` — no superscript
- No separator character between them
- Never render as a single uniform-weight word
- Never use all-caps
- Never apply Ember colour to either part in the app header

---

## Status Badge Vocabulary

All badges: filled pill, 1px border, `text-caption` (10px, weight 700), `letter-spacing: 0.08em`, `uppercase`, `border-radius: 4px`, `padding: 3px 8px`. Never convey status through colour alone — the text label is mandatory.

| Badge | Label | Background | Border | Text |
|---|---|---|---|---|
| PENDING | PENDING | `rgba(245,158,11, 0.12)` | `rgba(245,158,11, 0.35)` | `#F59E0B` |
| CONFIRMED | CONFIRMED | `rgba(74,222,128, 0.09)` | `rgba(74,222,128, 0.25)` | `#4ADE80` |
| CANCELLED | CANCELLED | `rgba(72,79,88, 0.20)` | `rgba(72,79,88, 0.40)` | `#848D97` |
| DRAFT | DRAFT | `rgba(72,79,88, 0.12)` | `rgba(72,79,88, 0.25)` | `#484F58` |
| PUBLISHED | PUBLISHED | `rgba(74,222,128, 0.09)` | `rgba(74,222,128, 0.22)` | `#4ADE80` |
| ALL FILLED | ALL FILLED | `rgba(74,222,128, 0.15)` | `rgba(74,222,128, 0.40)` | `#4ADE80` |
| DECLINED | DECLINED | `rgba(239,68,68, 0.09)` | `rgba(239,68,68, 0.25)` | `#EF4444` |

**New tokens required in `index.css` before build:**
```css
--badge-filled-bg:     rgba(74, 222, 128, 0.15);
--badge-filled-border: rgba(74, 222, 128, 0.40);
--badge-filled-text:   #4ADE80;
```

---

## Card Anatomy

```
Background:    var(--color-surface)          #161B22
Border:        1px solid var(--color-border) #21262D  ← hairline
Border radius: 12px
Shadow:        0 1px 3px rgba(0,0,0,0.4)
Padding:       16px mobile / 24px desktop (≥768px)
```

| Type | Hover | Border on hover | Cursor | Notes |
|---|---|---|---|---|
| Interactive | `bg-raised` | None | pointer | `transition-colors duration-150` |
| Informational | None | None | default | Shadow increases when modal-inset |
| Selected | — | `accent-dim` + `accent-subtle` bg | pointer | — |

---

## Bottom Navigation Bar

Fixed to the viewport bottom on mobile (≤767px). Hidden on desktop — top nav takes over.

```
Height:     60px + env(safe-area-inset-bottom)
Background: var(--color-surface)
Top border: 1px solid var(--color-border)
Grid:       4 equal columns
z-index:    200
```

| Tab | Label | Icon | Route |
|---|---|---|---|
| 1 | Home | House outline | `/` |
| 2 | Events | Calendar outline | `/events` |
| 3 | My Events | Checklist document | `/dashboard/registrations` |
| 4 | Profile | Person silhouette | `/profile` |

All icons: Lucide React, 22×22px, stroke-width 1.5.

- **Inactive:** `#484F58` (tertiary)
- **Active:** `#FF6B35` (Ember) — colour only, no background pill or underline

---

## Ember CTA Button

One primary button per screen, always.

**Full-width (mobile-primary):**
```
Height: 52px  |  Border radius: 8px  |  Background: #FF6B35
Text: #FFFFFF, Inter 14px weight 600
Hover: #FF7D4D  |  Active: #D94E22
Focus: box-shadow 0 0 0 3px rgba(255,107,53,0.5)
Transition: background 180ms ease, box-shadow 180ms ease
```

**Disabled state:**
```
Background: var(--color-raised)  |  Text: var(--color-text-disabled)
Cursor: not-allowed  |  No shadow
```

---

## Motion and Transitions

**Principle:** purposeful motion only — transitions that carry information, not decoration.

| Moment | Duration | Easing | Notes |
|---|---|---|---|
| PENDING → CONFIRMED badge | 300ms | `cubic-bezier(0.16,1,0.3,1)` | Fade out old badge, fade in new — separate DOM elements |
| Fill bar completion | 600ms fill + 200ms colour | `cubic-bezier(0,0,0.2,1)` | Ember → green only at 100%; pulse glow at completion |
| Confirmation card expand | 300ms in / 200ms out | `cubic-bezier(0.16,1,0.3,1)` | `grid-template-rows: 0fr → 1fr` |
| Bottom sheet entry | 300ms in / 200ms out | Spring in, ease-in out | `translateY(100%) → translateY(0)` |

**`prefers-reduced-motion`:** Remove movement transitions; retain opacity/colour transitions at reduced duration (100ms).

---

## Screen 1 — Volunteer Discovery Feed

The volunteer's primary entry point. Goal: find an event worth signing up for. The feed must load fast, communicate available roles at a glance, and remove the friction of geographic and temporal filtering. The user is likely on a mobile device outdoors with limited attention.

```
┌─────────────────────────────────────────────┐  390px
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│  ← Status bar (system, 44px)
├─────────────────────────────────────────────┤
│                                             │  ← Header (56px, bg #0A0A0F)
│  occasion  hq          [🔔]  [○ Jamie]     │    "occasion" Plus Jakarta Sans 700 white
│                                             │    "hq" Plus Jakarta Sans 400 #8B8B9A smaller
├─────────────────────────────────────────────┤
│                                             │  ← Filter bar (56px, bg #0A0A0F, border-b)
│  [Running ▾]  [Redhill ✕]  [Any date ▾]   │    Scrollable horizontally if chips overflow
│                                             │    Active filter chip: Ember bg/12% + Ember border
├─────────────────────────────────────────────┤
│                                             │
│  Events near you                            │  ← Section label: Inter 13px #8B8B9A
│  12 upcoming · sorted by date              │    "12 upcoming" Inter 13px #8B8B9A
│                                             │
│ ┌───────────────────────────────────────┐   │  ← EventCard (surface #1A1A24, radius-lg 12px,
│ │                                       │   │    border 1px #21262D, mx-4, mb-3)
│ │  [Running]                            │   │    [COMPONENT: EventTypeBadge — "Running"
│ │                                       │   │     bg accent-subtle, text accent, 11px Inter 600,
│ │  Redhill 10K Fun Run                  │   │     px-2 py-0.5, radius-full]
│ │  Redhill Harriers                     │   │    Event title: Plus Jakarta Sans 700 17px white
│ │                                       │   │    Org name: Inter 13px #8B8B9A
│ │  Sun 12 Apr · 09:00–17:00            │   │    Date/time: Inter 13px #8B8B9A
│ │  Redhill Park, Surrey                 │   │    Location: Inter 13px #8B8B9A
│ │                                       │   │
│ │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │   │    [COMPONENT: FillBar — 40% filled
│ │  11 spots remaining across 3 roles   │   │     bar height 4px, bg #21262D, fill Ember
│ │                                       │   │     "11 spots remaining" Inter 12px #8B8B9A]
│ └───────────────────────────────────────┘   │
│                                             │
│ ┌───────────────────────────────────────┐   │
│ │                                       │   │
│ │  [Charity]                            │   │
│ │                                       │   │
│ │  Dorking Park Clean-Up                │   │
│ │  Mole Valley Volunteers               │   │
│ │                                       │   │
│ │  Sat 19 Apr · 09:00–13:00            │   │
│ │  Vincent Lane, Dorking                │   │
│ │                                       │   │
│ │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │   │
│ │  4 spots remaining across 2 roles    │   │
│ │                                       │   │
│ └───────────────────────────────────────┘   │
│                                             │
│ ┌───────────────────────────────────────┐   │
│ │                                       │   │
│ │  [Cycling]                            │   │
│ │                                       │   │
│ │  Surrey Hills Sportive 2026           │   │
│ │  Farnham Cyclists                     │   │
│ │                                       │   │
│ │  Sun 26 Apr · 07:00–15:00            │   │
│ │  Farnham Park, GU9 0AG               │   │
│ │                                       │   │
│ │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │   │
│ │  1 spot remaining across 4 roles     │   │    ← Urgency signal: "1 spot" in amber #F59E0B
│ │                                       │   │
│ └───────────────────────────────────────┘   │
│                                             │
│         ┌─────────────────────────┐         │  ← [COMPONENT: LoadMoreButton
│         │    Load more events     │         │     border 1px #21262D, bg transparent,
│         └─────────────────────────┘         │     text #8B8B9A, Inter 14px 500, 44px height]
│                                             │
│  Loading state replaces button:             │    [COMPONENT: LoadingState — "Finding more
│  "Finding events near you..."               │     events…" Inter 14px #8B8B9A, centred,
│                                             │     inline spinner 16px Ember]
├─────────────────────────────────────────────┤
│                                             │  ← [COMPONENT: BottomNav — 60px, bg #0A0A0F,
│  [◎ Explore]  [♥ Saved]  [▦ My Events]    │    border-t 1px #21262D]
│                                             │    Active tab "Explore": icon + label Ember
│                                             │    Inactive tabs: icon + label #8B8B9A
└─────────────────────────────────────────────┘    Each tab hit area: minimum 44x60px

Bottom nav tabs (left to right):
  ◎  Explore    — /events (this screen, active)
  ♥  Saved      — /events/saved (post-MVP, greyed with lock icon until available)
  ▦  My Events  — /dashboard/registrations
  ○  Profile    — /profile
```

**Component annotations:**

```
[COMPONENT: EventCard]
  Surface: bg-surface (#1A1A24), border border-DEFAULT (#21262D), rounded-lg (12px)
  Padding: px-4 pt-3 pb-4 (16px horizontal, 12px top, 16px bottom)
  Touch target: entire card is tappable, min-height 100px
  Tap destination: /events/:eventId
  States: default, hover (border-mid #30363D), pressed (bg-raised #1C2128, 150ms)
  Animation: slide-up 200ms on initial load, staggered 50ms between cards

[COMPONENT: EventTypeBadge]
  Background: var(--color-accent-subtle) = rgba(255, 107, 53, 0.08)
  Border: 1px solid var(--color-accent-mid) = rgba(255, 107, 53, 0.15)
  Text: var(--color-accent) #FF6B35, font-body text-caption (10px, 700, 0.08em tracking)
  Padding: px-2 py-0.5, border-radius: 9999px (full)
  Note: each event type gets the same Ember badge — type differentiation is text only at MVP

[COMPONENT: FillBar]
  Container: h-1 (4px), bg-border (#21262D), rounded-full, w-full, mt-2
  Fill: bg-accent (#FF6B35), height 100%, border-radius inherited
  Width: percentage = (totalHeadcount - totalFilledCount) / totalHeadcount * 100 INVERTED
         i.e. bar shows proportion FILLED, not proportion remaining
  Urgency rule: if spots remaining <= 2, "X spot remaining" text colour changes to
                var(--color-warning) #F59E0B

[COMPONENT: FilterChip]
  Default: bg transparent, border 1px #21262D, text #8B8B9A, rounded-full, px-3, h-8 (32px)
  Active: bg rgba(255,107,53,0.08), border rgba(255,107,53,0.35), text #FF6B35
  Min touch area achieved via vertical margin so tap zone is 44px tall
  Chips scroll horizontally in a no-scrollbar flex row

[COMPONENT: BottomNav]
  Height: 60px (var(--bottom-nav-height)), bg #0A0A0F
  Border top: 1px solid var(--color-border) #21262D
  Safe area: add padding-bottom: env(safe-area-inset-bottom) for notched devices
  Active state: icon fill + label text = Ember #FF6B35
  Inactive: icon stroke + label text = #8B8B9A
  Icon size: 22x22px; label: 10px Inter 500; combined hit area: flex-1 min-h-[44px]
```

**Design rationale:** The feed leads with the event title and organisation at reading weight — the user is scanning for something familiar or appealing, not filtering first. Filters sit between the header and feed, accessible but not dominant. The fill bar communicates urgency through visual fill rather than a fraction, and the "X spots remaining" copy follows the UX principle of derived insight over raw data. The single-column card layout on mobile maximises card height and readability; the type badge uses Ember to signal the platform brand without competing with the primary CTA on the detail screen.

**Landscape adaptation (844px wide, 390px tall):** Filter bar stacks inline with the header. Cards switch to a 2-column grid (`grid-cols-2 gap-3`). Bottom nav is replaced by a left sidebar (`w-[200px]`) with stacked nav items if the viewport is tablet-width or wider (640px+). On true landscape phone (844x390), maintain bottom nav and switch to 2-column feed only.

---

## Screen 2 — Event Detail (Volunteer View)

The volunteer has tapped a card from the discovery feed. Goal: understand the event and commit to a role. The hierarchy is: what is it → when and where → what roles need filling → apply. The apply CTA must be immediately visible without scrolling for at least one role.

```
┌─────────────────────────────────────────────┐  390px
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│  ← Status bar (system)
├─────────────────────────────────────────────┤
│  ‹  Events                                  │  ← Back header (56px, bg #0A0A0F, border-b)
│                                             │    "‹" icon: chevron-left 20px #E6EDF3
│                                             │    "Events" Inter 15px 500 white, links back /events
├─────────────────────────────────────────────┤
│                                             │
│  [Running]                                  │  ← EventTypeBadge (same as feed)
│                                             │
│  Redhill 10K Fun Run                        │  ← Plus Jakarta Sans 700 22px white
│  Redhill Harriers                           │  ← Inter 14px #8B8B9A mt-1
│                                             │
│  ┌─────────────────────────────────────┐    │  ← Meta panel (bg surface #1A1A24,
│  │                                     │    │    border 1px #21262D, rounded-lg, mx-4)
│  │  📅  Sun 12 Apr 2026               │    │    Icon: 16px, text Inter 14px #E6EDF3
│  │  ⏱   09:00 – 17:00                │    │    Row height: 36px min
│  │  📍  Redhill Park, Surrey           │    │
│  │      RH1 2AA                        │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  About this event                           │  ← Inter 12px 600 uppercase #8B8B9A
│                                             │    letter-spacing: 0.08em (overline style)
│  Annual charity 10K supporting              │  ← Inter 15px #E6EDF3 line-height 1.6
│  Redhill Food Bank. Marshals help           │
│  keep runners safe and on course.           │
│  All welcome — training provided.           │
│                                             │
├─────────────────────────────────────────────┤  ← Section divider 1px #21262D
│                                             │
│  Volunteer roles (3)                        │  ← Inter 12px 600 uppercase #8B8B9A
│                                             │
│ ┌───────────────────────────────────────┐   │  ← RoleCard (bg surface #1A1A24,
│ │  Water Station Marshal                │   │    border 1px #21262D, rounded-lg, mx-4, mb-3)
│ │  08:00 – 12:00 · 3 spots remaining   │   │    Title: Plus Jakarta Sans 600 16px white
│ │                                       │   │    Meta: Inter 13px #8B8B9A
│ │  Help volunteers stay hydrated at     │   │    Description: Inter 14px #E6EDF3
│ │  mile 3 marker. No experience needed. │   │
│ │                                       │   │
│ │  ┌─────────────────────────────────┐  │   │  ← [COMPONENT: EmberButton — primary CTA]
│ │  │   Apply for this role  →        │  │   │    bg #FF6B35, text white Inter 15px 600
│ │  └─────────────────────────────────┘  │   │    height 48px, rounded-md (8px), w-full
│ └───────────────────────────────────────┘   │    min touch: 48px (exceeds 44px minimum)
│                                             │
│ ┌───────────────────────────────────────┐   │  ← RoleCard (available)
│ │  Start/Finish Marshal                 │   │
│ │  06:30 – 10:30 · 5 spots remaining   │   │
│ │                                       │   │
│ │  Direct runners at start/finish area. │   │
│ │  High-vis jacket provided.            │   │
│ │                                       │   │
│ │  ┌─────────────────────────────────┐  │   │
│ │  │   Apply for this role  →        │  │   │
│ │  └─────────────────────────────────┘  │   │
│ └───────────────────────────────────────┘   │
│                                             │
│ ┌───────────────────────────────────────┐   │  ← RoleCard (full — disabled state)
│ │  Finish Line Photographer   ╔═══════╗ │   │    [COMPONENT: AllFilledBadge —
│ │                             ║ FULL ║ │   │     bg rgba(74,222,128,0.12),
│ │  12:00 – 16:00 · 0 remaining         │   │     border 1px rgba(74,222,128,0.3),
│ │                             ╚═══════╝ │   │     text #4ADE80, 11px Inter 600]
│ │  All spots have been filled for       │   │    Card opacity: 0.7 when full
│ │  this role.                           │   │    CTA replaced with informational text
│ │                                       │   │
│ │  See other roles for this event ↑     │   │  ← Error-resolve link: Inter 13px Ember
│ └───────────────────────────────────────┘   │    (implements UX principle: errors explain
│                                             │    and resolve, never strand)
├─────────────────────────────────────────────┤
│                                             │  ← BottomNav (same as Screen 1,
│  [◎ Explore]  [♥ Saved]  [▦ My Events]    │    "Explore" tab active — user navigated
│                                             │    from feed so feed tab remains active)
└─────────────────────────────────────────────┘
```

**Apply confirmation bottom sheet (triggered by "Apply for this role →"):**

```
┌─────────────────────────────────────────────┐
│                                             │  ← Scrim overlay: rgba(0,0,0,0.6)
│                                             │    Tap outside = dismiss
│                                             │
│                                             │
│ ┌─────────────────────────────────────────┐ │  ← [COMPONENT: BottomSheet]
│ │  ──────                                 │ │    bg #1A1A24, rounded-t-xl (16px top only)
│ │                                         │ │    animation: sheet-in 300ms spring
│ │  Confirm your application               │ │    Drag handle: 32x4px, bg #30363D, centred
│ │                                         │ │
│ │  Water Station Marshal                  │ │    Role name: Plus Jakarta Sans 600 18px white
│ │  Redhill 10K Fun Run                    │ │    Event: Inter 14px #8B8B9A
│ │  Sun 12 Apr · 08:00–12:00              │ │    Date/shift: Inter 14px #8B8B9A
│ │                                         │ │
│ │  By applying you confirm you're         │ │    Body: Inter 14px #8B8B9A line-height 1.6
│ │  available for this shift. The          │ │
│ │  organiser will review and confirm      │ │
│ │  your place.                            │ │
│ │                                         │ │
│ │  ┌─────────────────────────────────┐    │ │  ← [COMPONENT: EmberButton — primary]
│ │  │   Yes, apply for this role      │    │ │    Same spec as above, h-48px
│ │  └─────────────────────────────────┘    │ │
│ │                                         │ │
│ │  ┌─────────────────────────────────┐    │ │  ← [COMPONENT: GhostButton — secondary]
│ │  │         Not right now           │    │ │    bg transparent, border 1px #21262D
│ │  └─────────────────────────────────┘    │ │    text #8B8B9A, h-44px
│ │                                         │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

**Post-application success state (replaces sheet content, not a new screen):**

```
│ ┌─────────────────────────────────────────┐ │
│ │  ──────                                 │ │
│ │                                         │ │
│ │        ✓                                │ │  ← Success icon: 48px circle
│ │                                         │ │    bg rgba(74,222,128,0.12), text #4ADE80
│ │  Application submitted                  │ │    Plus Jakarta Sans 700 20px white
│ │                                         │ │
│ │  You're in the queue for:               │ │    Inter 14px #8B8B9A
│ │  Water Station Marshal                  │ │    Inter 600 15px white
│ │                                         │ │
│ │  Your application is with               │ │    Inter 14px #8B8B9A (PENDING copy register —
│ │  Redhill Harriers for review.           │ │    speaks to person, addresses confirmation
│ │  They typically respond within          │ │    anxiety per OCCASION-REPORT.md)
│ │  24 hours.                              │ │
│ │                                         │ │
│ │  ┌─────────────────────────────────┐    │ │
│ │  │   View my applications →        │    │ │  ← Routes to /dashboard/registrations
│ │  └─────────────────────────────────┘    │ │
│ │                                         │ │
│ │         Close                           │ │  ← Text link, Inter 14px #8B8B9A
│ │                                         │ │    dismisses sheet, returns to event detail
│ └─────────────────────────────────────────┘ │
```

**Component annotations:**

```
[COMPONENT: EmberButton — primary CTA]
  bg: #FF6B35 (var(--color-accent))
  text: #FFFFFF, Plus Jakarta Sans 600, 15px
  height: 48px (min touch target exceeded)
  border-radius: 8px (var(--radius-md))
  width: 100% within card padding
  states:
    default — bg #FF6B35
    hover   — bg #E55A28 (10% darker), transition 150ms fast
    active  — bg #CC4F22 (20% darker), scale 0.98, transition 150ms fast
    loading — spinner 16px white centred, text hidden, cursor not-allowed
    disabled — bg rgba(255,107,53,0.35), cursor not-allowed

[COMPONENT: RoleCard]
  Expandable: tapping card header expands description if collapsed (progressive disclosure)
  Full state: opacity-70 on entire card, CTA area replaced with:
    "All spots filled — see other roles ↑"
    text: Inter 13px var(--color-accent) (links up the page as affordance)
  Skill tags: if role has skillIds, render below description as grey chips
    bg #21262D, text #8B8B9A, 11px, radius-full, px-2

[COMPONENT: BottomSheet]
  z-index: 500 (var(--z-modal))
  backdrop: fixed inset-0 bg-black/60 (scrim)
  sheet: fixed bottom-0 left-0 right-0, max-h-[85vh], overflow-y-auto
  animation entrance: translateY(100%) → translateY(0), 300ms spring easing
  animation exit: translateY(0) → translateY(100%), 200ms out easing
  safe area: pb-[env(safe-area-inset-bottom)]
  drag-to-dismiss: drag handle at top, velocity threshold 300px/s to dismiss
```

**Design rationale:** The role cards are the primary decision-making surface. Each role is self-contained with its own CTA — the user does not need to scroll to a bottom-of-page button after reading role details. Full roles remain visible with a resolve link rather than being hidden, following the principle that errors and blockers should always direct the user to the next available action. The bottom sheet for confirmation keeps the user in context rather than navigating away, reducing the perceived cost of applying.

**Landscape adaptation:** Meta panel and roles switch to a 2-column layout. Left column: event meta + description. Right column: roles list. Bottom nav persists. Sheet behaviour unchanged.

---

## Screen 3 — Volunteer Dashboard (My Events)

The volunteer's living record of all their registrations. Goal: know at a glance what is confirmed, what is pending, and what is done. The most emotionally sensitive screen — confirmation anxiety is highest here. The design must reduce anxiety through clear status communication and honest copy.

```
┌─────────────────────────────────────────────┐  390px
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
├─────────────────────────────────────────────┤
│                                             │  ← Header (56px, bg #0A0A0F, border-b)
│  My events                                  │    Plus Jakarta Sans 700 20px white
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  ── CONFIRMED  ────────────────────────    │  ← Section label: Inter 11px 600 uppercase
│                                             │    #8B8B9A, letter-spacing 0.14em, mx-4
│ ┌───────────────────────────────────────┐   │  ← RegistrationCard (CONFIRMED state)
│ │  ╔══════════════╗                     │   │    [COMPONENT: StatusBadge — "Confirmed"
│ │  ║  Confirmed   ║                     │   │     bg badge-confirmed-bg rgba(74,222,128,0.09)
│ │  ╚══════════════╝                     │   │     border badge-confirmed-border
│ │                                       │   │     text #4ADE80, Inter 11px 700 uppercase]
│ │  Redhill 10K Fun Run                  │   │    Plus Jakarta Sans 600 16px white
│ │  Water Station Marshal                │   │    Inter 13px #8B8B9A
│ │                                       │   │
│ │  Sun 12 Apr · 08:00–12:00            │   │    Inter 13px #8B8B9A
│ │  Redhill Park, Surrey                 │   │    Inter 13px #8B8B9A
│ │                                       │   │
│ │  You're confirmed for this role.      │   │    Inter 14px #E6EDF3 (plain language
│ │  See you on race day.                 │   │    confirmation — not "Status: CONFIRMED")
│ │                                       │   │
│ │  [Add to calendar]   [Cancel place]   │   │    [COMPONENT: AddToCalendarLink
│ │                                       │   │     Inter 13px Ember, no underline by default,
│ └───────────────────────────────────────┘   │     underline on hover]
│                                             │    [COMPONENT: CancelLink — danger tertiary
│                                             │     Inter 13px #EF4444, triggers confirm sheet]
│  ── PENDING  ──────────────────────────    │
│                                             │
│ ┌───────────────────────────────────────┐   │  ← RegistrationCard (PENDING state)
│ │  ╔══════════════╗                     │   │    [COMPONENT: StatusBadge — "Awaiting review"
│ │  ║  Awaiting    ║                     │   │     bg badge-pending-bg rgba(245,158,11,0.12)
│ │  ║  review      ║                     │   │     border badge-pending-border
│ │  ╚══════════════╝                     │   │     text #F59E0B, Inter 11px 700 uppercase]
│ │                                       │   │
│ │  Surrey Hills Sportive 2026           │   │    Note: badge label is "Awaiting review"
│ │  Route Marshal — Stage 2              │   │    not "PENDING" — copy register principle
│ │                                       │   │
│ │  Sun 26 Apr · 07:30–11:00            │   │
│ │  Guildford Road, Farnham              │   │
│ │                                       │   │
│ │  Your application is with             │   │    ← PENDING copy — addresses confirmation
│ │  Farnham Cyclists for review.         │   │      anxiety (per OCCASION-REPORT.md)
│ │  They typically respond within        │   │      Inter 14px #E6EDF3
│ │  24 hours.                            │   │
│ │                                       │   │
│ │  Applied 3 days ago          [Cancel] │   │    Inter 12px #8B8B9A · [Cancel] text link
│ │                                       │   │    danger colour #EF4444
│ └───────────────────────────────────────┘   │
│                                             │
│ ┌───────────────────────────────────────┐   │  ← RegistrationCard (second PENDING)
│ │  ╔══════════════╗                     │   │
│ │  ║  Awaiting    ║                     │   │
│ │  ║  review      ║                     │   │
│ │  ╚══════════════╝                     │   │
│ │                                       │   │
│ │  Dorking Park Clean-Up                │   │
│ │  Litter Pick Team Lead                │   │
│ │                                       │   │
│ │  Sat 19 Apr · 09:00–13:00            │   │
│ │  Vincent Lane, Dorking                │   │
│ │                                       │   │
│ │  Your application is with             │   │
│ │  Mole Valley Volunteers for review.   │   │
│ │  Applied 1 hour ago          [Cancel] │   │
│ │                                       │   │
│ └───────────────────────────────────────┘   │
│                                             │
│  ── COMPLETED  ────────────────────────    │
│                                             │
│ ┌───────────────────────────────────────┐   │  ← RegistrationCard (COMPLETED state)
│ │  ╔══════════════╗                     │   │    [COMPONENT: StatusBadge — "Attended"
│ │  ║  Attended    ║                     │   │     bg rgba(139,139,154,0.1), border rgba(139,139,154,0.2)
│ │  ╚══════════════╝                     │   │     text #8B8B9A, Inter 11px 700 uppercase]
│ │                                       │   │    Card opacity: 1, colour slightly muted
│ │  Reigate Triathlon 2026               │   │
│ │  Transition Zone Marshal              │   │
│ │                                       │   │
│ │  Sun 15 Mar · 07:00–13:00            │   │
│ │  Reigate Priory Park                  │   │
│ │                                       │   │
│ │  Thanks for volunteering. You gave    │   │    Inter 14px #8B8B9A — retrospective thanks,
│ │  6 hours of your time.               │   │    hours derived from shift length
│ │                                       │   │
│ │  [Download hours certificate]         │   │    Inter 13px Ember (premium feature CTA —
│ │                                       │   │    shown but triggers upsell if not on plan)
│ └───────────────────────────────────────┘   │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  [◎ Explore]  [♥ Saved]  [▦ My Events]    │  ← BottomNav: "My Events" tab active (Ember)
│                                             │
└─────────────────────────────────────────────┘
```

**Empty state (no registrations yet):**

```
│                                             │
│                                             │
│            ◎                               │  ← Icon: calendar-search, 48px, #30363D
│                                             │
│     You haven't signed up              │  ← Plus Jakarta Sans 600 18px white, centred
│     for anything yet                        │
│                                             │
│  Find an event near you and apply          │  ← Inter 15px #8B8B9A, centred, max-w-[260px]
│  for a volunteer role to get started.      │
│                                             │
│     ┌──────────────────────────────┐        │  ← EmberButton (full treatment)
│     │   Browse events near you     │        │    Routes to /events
│     └──────────────────────────────┘        │
│                                             │
```

**Cancel confirmation bottom sheet:**

```
│ ┌─────────────────────────────────────────┐ │
│ │  ──────                                 │ │
│ │                                         │ │
│ │  Cancel your place?                     │ │  ← Plus Jakarta Sans 700 18px white
│ │                                         │ │
│ │  Water Station Marshal                  │ │  ← Inter 15px white
│ │  Redhill 10K Fun Run · 12 Apr           │ │  ← Inter 14px #8B8B9A
│ │                                         │ │
│ │  The organiser will be notified and     │ │  ← Inter 14px #8B8B9A
│ │  your spot will be released.            │ │
│ │                                         │ │
│ │  ┌─────────────────────────────────┐    │ │  ← DangerButton: bg #EF4444, text white
│ │  │   Yes, cancel my place          │    │ │    h-48px, rounded-md, w-full
│ │  └─────────────────────────────────┘    │ │    States: default, hover (#DC2626), loading
│ │                                         │ │
│ │  ┌─────────────────────────────────┐    │ │  ← GhostButton
│ │  │      Keep my place              │    │ │
│ │  └─────────────────────────────────┘    │ │
│ └─────────────────────────────────────────┘ │
```

**Component annotations:**

```
[COMPONENT: StatusBadge]
  Shape: pill (border-radius: 9999px)
  Padding: px-2.5 py-1 (10px horizontal, 4px vertical)
  Font: Inter 11px 700 uppercase, letter-spacing 0.04em
  Display: inline-flex align-items-center gap-1
  Minimum height: 24px (visually; not a touch target so 44px not required)

  Variants:
    "Confirmed"      — bg badge-confirmed-bg, border badge-confirmed-border, text #4ADE80
    "Awaiting review"— bg badge-pending-bg,   border badge-pending-border,   text #F59E0B
    "Attended"       — bg rgba(139,139,154,0.1), border rgba(139,139,154,0.2), text #8B8B9A
    "Cancelled"      — bg badge-cancelled-bg, border badge-cancelled-border, text (per token)

  Note on copy: badge uses "Awaiting review" not "PENDING". The API status is PENDING;
  the display label is human. Map in a displayLabel lookup object:
    PENDING   → "Awaiting review"
    CONFIRMED → "Confirmed"
    COMPLETED → "Attended"
    CANCELLED → "Cancelled"
    DECLINED  → "Not accepted"

[COMPONENT: RegistrationCard]
  Same surface/border/radius as EventCard
  Section grouping: registrations sorted into CONFIRMED (top), PENDING (middle), COMPLETED/CANCELLED (bottom)
  CONFIRMED cards: full colour treatment
  PENDING cards: full colour treatment with amber badge
  COMPLETED cards: opacity-80, all text slightly muted but readable
  CANCELLED cards: opacity-60, strike-through on role name only, badge "Cancelled"
```

**Design rationale:** Sections are sorted by emotional urgency — confirmed placements give confidence first, pending registrations surface the anxiety state where the platform's reassurance copy is most needed, completed registrations anchor the volunteer's growing history. The copy register throughout avoids administrative language: "You're confirmed for this role. See you on race day." is a statement of belonging, not a status report. The hours certificate CTA on completed cards is a deliberate upsell hook — the value (documented volunteer hours) exists regardless of tier, but the download is a premium feature that makes itself known at the natural moment.

**Landscape adaptation:** 2-column card layout when viewport >= 640px. Section labels span full width above each column group.

---

## Screen 4 — Organiser Event Dashboard (The Hero Moment)

The organiser has been managing this event for weeks. They open the dashboard and every role is filled. Goal: communicate completion with clarity and satisfaction. No further action is required — the platform must say so explicitly. This is the "well-oiled machine" moment: the organiser did not cause the completion, the platform did.

```
┌─────────────────────────────────────────────┐  390px
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
├─────────────────────────────────────────────┤
│  ‹  My events                               │  ← Back header (56px, bg #0A0A0F, border-b)
│                                             │    Routes back to organiser event list
├─────────────────────────────────────────────┤
│                                             │
│  Redhill 10K Fun Run                        │  ← Plus Jakarta Sans 700 22px white, px-4
│                                             │
│  Sun 12 Apr 2026 · Redhill, Surrey          │  ← Inter 14px #8B8B9A, px-4
│                                             │
│  [PUBLISHED]                                │  ← [COMPONENT: EventStatusBadge — "Published"
│                                             │    bg badge-published-bg, border/text per token
│                                             │    Inter 11px 700 uppercase, px-4]
│                                             │
│ ┌───────────────────────────────────────┐   │  ← [COMPONENT: HeroCompletionPanel]
│ │                                       │   │    bg rgba(74,222,128,0.06)
│ │  ╔═══════════════════════════════╗    │   │    border 1px rgba(74,222,128,0.20)
│ │  ║   All roles filled            ║    │   │    rounded-xl (16px), mx-4, p-4
│ │  ╚═══════════════════════════════╝    │   │
│ │                                       │   │    [COMPONENT: AllFilledBadge]
│ │  20 volunteers confirmed              │   │    bg rgba(74,222,128,0.12)
│ │  across 3 roles                       │   │    border 1px rgba(74,222,128,0.30)
│ │                                       │   │    text #4ADE80, Inter 11px 700 uppercase
│ │  ████████████████████████   100%      │   │
│ │                                       │   │    [COMPONENT: CompletionBar]
│ │  No further action required.          │   │    height 8px, bg rgba(74,222,128,0.15)
│ │  Your event is fully staffed.         │   │    fill #4ADE80, rounded-full, w-full
│ │                                       │   │    "100%" Inter 13px #4ADE80 700, right-aligned
│ └───────────────────────────────────────┘   │
│                                             │    Resolver copy: Inter 15px white
│                                             │    "No further action required." on its own line
│                                             │    "Your event is fully staffed." Inter 14px #8B8B9A
│                                             │
│  Roles                                      │  ← Section label: Inter 12px 600 uppercase #8B8B9A
│                                             │
│ ┌───────────────────────────────────────┐   │  ← RoleStatusRow (filled state)
│ │  Start/Finish Marshal                 │   │    bg surface #1A1A24, border #21262D
│ │                                       │   │    rounded-lg, mx-4, mb-2, px-4 py-3
│ │  06:30–10:30                ╔══════╗  │   │
│ │                             ║ FULL ║  │   │    [COMPONENT: AllFilledBadge — compact
│ │  8 / 8 confirmed            ╚══════╝  │   │    Same green badge spec as HeroPanel]
│ │                                       │   │
│ │  ████████████████████████   100%      │   │    MiniProgressBar: h-3px, green fill
│ └───────────────────────────────────────┘   │
│                                             │
│ ┌───────────────────────────────────────┐   │
│ │  Water Station (Mile 3)               │   │
│ │                                       │   │
│ │  08:00–12:00                ╔══════╗  │   │
│ │                             ║ FULL ║  │   │
│ │  4 / 4 confirmed            ╚══════╝  │   │
│ │                                       │   │
│ │  ████████████████████████   100%      │   │
│ └───────────────────────────────────────┘   │
│                                             │
│ ┌───────────────────────────────────────┐   │
│ │  Finish Line Photographer             │   │
│ │                                       │   │
│ │  12:00–17:00                ╔══════╗  │   │
│ │                             ║ FULL ║  │   │
│ │  8 / 8 confirmed            ╚══════╝  │   │
│ │                                       │   │
│ │  ████████████████████████   100%      │   │
│ └───────────────────────────────────────┘   │
│                                             │
│  ── ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │  ← Divider (1px dashed #21262D or solid)
│                                             │
│  ┌───────────────────────────────────────┐  │  ← Secondary action (below the hero moment,
│  │   View full roster                    │  │    not dominant — the hero state is the CTA)
│  └───────────────────────────────────────┘  │    [COMPONENT: OutlineButton — secondary]
│                                             │    bg transparent, border 1px #30363D
│                                             │    text #E6EDF3, Inter 15px 500, h-48px
│  ┌───────────────────────────────────────┐  │
│  │   Share event link                    │  │  ← Same outline button treatment
│  └───────────────────────────────────────┘  │    Routes to shareable public event link
│                                             │
│  ⚠  Cancel event                           │  ← Destructive tertiary: Inter 14px #EF4444
│                                             │    min 44px tap area via padding
│                                             │    Sits at bottom, visually de-emphasised
│                                             │    Triggers cancel confirmation sheet
├─────────────────────────────────────────────┤
│                                             │  ← BottomNav (organiser variant)
│  [◎ Events]  [＋ New event]  [○ Account]   │    Organiser tabs: Events / New Event / Account
│                                             │    "Events" active (Ember)
└─────────────────────────────────────────────┘
```

**Intermediate state (partially filled — for contrast with hero moment):**

```
Note: shown here for developer reference only. Same screen, different data.

│ ┌───────────────────────────────────────┐   │  ← ProgressPanel (not hero state)
│ │                                       │   │    bg surface, border #21262D (no green tint)
│ │  11 of 20 volunteers confirmed        │   │
│ │                                       │   │
│ │  ░░░░░░░░░░░░░░░████████████  55%     │   │    Fill bar: Ember (#FF6B35) not green
│ │                                       │   │    (Green is reserved for achievement state)
│ │  9 spots still to fill               │   │    "9 spots still to fill" Inter 14px #8B8B9A
│ │                                       │   │
│ └───────────────────────────────────────┘   │
```

**Component annotations:**

```
[COMPONENT: HeroCompletionPanel]
  Trigger: rendered when ALL roles on the event have filledCount === headcount
  Background: rgba(74, 222, 128, 0.06) — very subtle green wash
  Border: 1px solid rgba(74, 222, 128, 0.20)
  Border-radius: 16px (var(--radius-xl))
  This panel replaces the standard ProgressPanel component (same position, same layout slot)
  Animation: fade-in 400ms slow — the transformation should feel like a resolution, not a pop

[COMPONENT: AllFilledBadge — new design token required]
  CSS custom properties to add to :root:
    --badge-filled-bg:      rgba(74, 222, 128, 0.12)
    --badge-filled-border:  rgba(74, 222, 128, 0.30)
    --badge-filled-text:    #4ADE80
  Tailwind classes: bg-[var(--badge-filled-bg)] border-[var(--badge-filled-border)] text-[var(--badge-filled-text)]
  Shape: pill (same as StatusBadge)
  Text: "All filled" (not "FULL" — "All filled" is an achievement; "FULL" is a barrier)
  Usage distinction:
    AllFilledBadge — role-level achievement, green, positive
    StatusBadge[CONFIRMED] — per-registration state, also green but different context
    EventStatusBadge[PUBLISHED] — event-level lifecycle state, separate token

[COMPONENT: CompletionBar / ProgressBar]
  Two variants driven by same component, prop: variant="achievement" | "progress"
  achievement: fill colour #4ADE80 (green), bg rgba(74,222,128,0.15)
  progress:    fill colour #FF6B35 (ember), bg rgba(255,107,53,0.10)
  Height: 8px in hero panel, 3px in role rows
  Percentage label: right-aligned, Inter 12px 700, colour matches fill
```

**Design rationale:** The hero moment is the same screen the organiser has been visiting daily — the data has changed and the design reflects it. Green is used only here and never elsewhere for Ember-accent states, making the completion unmistakably positive. The "No further action required. Your event is fully staffed." copy is a direct implementation of the platform's voice: resolved language, not administrative language. The fill bar reaching 100% carries narrative weight because the organiser has watched it fill incrementally over time. Destructive actions (Cancel event) are present but visually de-prioritised below the completion moment.

**Landscape adaptation:** Hero panel spans full width. Roles render in a 2-column grid (each role row becomes a card). Secondary actions move to a right-aligned column beside the hero panel.

---

## Screen 5 — Organiser Registration Review

The organiser is reviewing volunteers who have applied for roles. Goal: confirm or decline individual applicants quickly, with enough context to make a good decision. The most action-dense screen in the organiser flow. Inline approve/decline removes the need to navigate away.

```
┌─────────────────────────────────────────────┐  390px
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
├─────────────────────────────────────────────┤
│  ‹  Redhill 10K Fun Run                     │  ← Back header (56px, bg #0A0A0F, border-b)
│                                             │    "Redhill 10K Fun Run" truncated at ~24 chars
│                                             │    Routes back to event dashboard
├─────────────────────────────────────────────┤
│                                             │
│  Registration review                        │  ← Plus Jakarta Sans 700 20px white, px-4
│                                             │
│  3 pending · 12 confirmed · 8/20 filled     │  ← Inter 13px #8B8B9A, px-4
│                                             │    (derived summary, not raw counts)
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  ── PENDING REVIEW (3)  ───────────────    │  ← Section label: Inter 11px 600 uppercase #8B8B9A
│                                             │    "3" in amber #F59E0B — urgency signal
│                                             │
│ ┌───────────────────────────────────────┐   │  ← RegistrationReviewCard (PENDING)
│ │                                       │   │    bg surface #1A1A24, border #21262D
│ │  ○  Jamie Thornton                    │   │    rounded-lg, mx-4, mb-3
│ │     Applied 2 hours ago               │   │
│ │                                       │   │    Avatar: 36x36px circle, initials fallback
│ │  Water Station Marshal                │   │    bg #30363D, text #E6EDF3, Inter 13px 700
│ │  08:00 – 12:00                        │   │    Role: Inter 14px white 600
│ │                                       │   │    Shift: Inter 13px #8B8B9A
│ │  ┌─────────────────┐ ┌─────────────┐  │   │
│ │  │  ✓  Confirm     │ │  ✗  Decline │  │   │    [COMPONENT: ConfirmButton — inline]
│ │  └─────────────────┘ └─────────────┘  │   │    bg rgba(74,222,128,0.12)
│ └───────────────────────────────────────┘   │    border 1px rgba(74,222,128,0.30)
│                                             │    text #4ADE80, Inter 14px 600
│                                             │    height 44px, flex-1 (equal width), rounded-md
│                                             │
│                                             │    [COMPONENT: DeclineButton — inline]
│                                             │    bg rgba(239,68,68,0.09)
│                                             │    border 1px rgba(239,68,68,0.25)
│                                             │    text #EF4444, Inter 14px 600
│                                             │    height 44px, flex-1, rounded-md
│                                             │
│ ┌───────────────────────────────────────┐   │
│ │                                       │   │
│ │  ○  Sarah Okafor                      │   │
│ │     Applied 5 hours ago               │   │
│ │                                       │   │
│ │  Water Station Marshal                │   │
│ │  08:00 – 12:00                        │   │
│ │                                       │   │
│ │  ┌─────────────────┐ ┌─────────────┐  │   │
│ │  │  ✓  Confirm     │ │  ✗  Decline │  │   │
│ │  └─────────────────┘ └─────────────┘  │   │
│ └───────────────────────────────────────┘   │
│                                             │
│ ┌───────────────────────────────────────┐   │
│ │                                       │   │
│ │  ○  Marcus Webb                       │   │
│ │     Applied 1 day ago                 │   │
│ │                                       │   │
│ │  Start/Finish Marshal                 │   │
│ │  06:30 – 10:30                        │   │
│ │                                       │   │
│ │  ┌─────────────────┐ ┌─────────────┐  │   │
│ │  │  ✓  Confirm     │ │  ✗  Decline │  │   │
│ │  └─────────────────┘ └─────────────┘  │   │
│ └───────────────────────────────────────┘   │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  ── CONFIRMED (12)  ───────────────────    │  ← Collapsible section: expanded by default
│                                             │    Tap section label to collapse
│ ┌───────────────────────────────────────┐   │
│ │  ○  Alex Patel          ╔══════════╗  │   │    [COMPONENT: StatusBadge — "Confirmed"
│ │                         ║Confirmed ║  │   │     compact variant, same green spec]
│ │  Start/Finish Marshal   ╚══════════╝  │   │
│ │  06:30 – 10:30                        │   │    No action buttons — already confirmed
│ └───────────────────────────────────────┘   │    Tap card to expand volunteer detail (future)
│                                             │
│ ┌───────────────────────────────────────┐   │
│ │  ○  Priya Singh         ╔══════════╗  │   │
│ │                         ║Confirmed ║  │   │
│ │  Water Station Marshal  ╚══════════╝  │   │
│ │  08:00 – 12:00                        │   │
│ └───────────────────────────────────────┘   │
│                                             │
│  + 10 more  ▾                              │  ← Collapsed — show remaining count
│                                             │    Inter 13px Ember, tap to expand inline
│                                             │
├─────────────────────────────────────────────┤
│                                             │  ← BottomNav (organiser variant)
│  [◎ Events]  [＋ New event]  [○ Account]   │
│                                             │
└─────────────────────────────────────────────┘
```

**Confirm inline — post-confirmation state (card transforms in place):**

```
│ ┌───────────────────────────────────────┐   │  ← Card transitions: buttons disappear,
│ │  ○  Jamie Thornton    ╔══════════╗    │   │    StatusBadge fades in
│ │                       ║Confirmed ║    │   │    animation: fade-in 200ms
│ │  Water Station Marshal╚══════════╝    │   │    Card moves to CONFIRMED section
│ │  08:00 – 12:00                        │   │    after 800ms delay (so user sees the
│ │                                       │   │    confirmation before reorder)
│ │  You confirmed Jamie for this role.   │   │    Inter 13px #8B8B9A — humanised confirm
│ └───────────────────────────────────────┘   │
```

**Decline — bottom sheet triggered by "Decline" button:**

```
│ ┌─────────────────────────────────────────┐ │
│ │  ──────                                 │ │
│ │                                         │ │
│ │  Decline Jamie Thornton?                │ │  ← Plus Jakarta Sans 700 18px white
│ │                                         │ │
│ │  Water Station Marshal                  │ │  ← Inter 14px white
│ │  Redhill 10K Fun Run · 12 Apr           │ │  ← Inter 14px #8B8B9A
│ │                                         │ │
│ │  Reason (optional)                      │ │  ← Inter 13px #8B8B9A label
│ │  ┌─────────────────────────────────┐    │ │
│ │  │  e.g. Role is now full...       │    │ │  ← [COMPONENT: TextArea]
│ │  │                                 │    │ │    bg #0A0A0F, border 1px #21262D
│ │  │                                 │    │ │    text #E6EDF3, placeholder #8B8B9A
│ │  └─────────────────────────────────┘    │ │    rounded-md, p-3, min-h-[80px]
│ │                                         │ │    focus: border Ember, shadow-accent
│ │  ┌─────────────────────────────────┐    │ │
│ │  │   Decline application           │    │ │  ← DangerButton: bg #EF4444, text white
│ │  └─────────────────────────────────┘    │ │
│ │                                         │ │
│ │  ┌─────────────────────────────────┐    │ │
│ │  │         Cancel                  │    │ │  ← GhostButton
│ │  └─────────────────────────────────┘    │ │
│ └─────────────────────────────────────────┘ │
```

**Component annotations:**

```
[COMPONENT: RegistrationReviewCard]
  Primary action area: ConfirmButton + DeclineButton in a flex row with gap-2
  Each button: flex-1, h-44px (exact minimum touch target)
  Button row padding: px-0 (full width within card padding), mt-3

  Loading state (after Confirm/Decline tap):
    Both buttons show spinner, pointer-events-none
    Duration: while API request is in flight
    On success: buttons hidden, StatusBadge fades in, card moves to appropriate section

  Error state (if API returns 409 "This role is full"):
    Buttons restored
    Inline error below buttons:
      [COMPONENT: InlineError]
      Icon: exclamation-circle 14px #EF4444
      Text: "This role is already full — you can't confirm any more volunteers."
      Inter 13px #EF4444, mt-2

[COMPONENT: Avatar — initials fallback]
  Size: 36x36px, rounded-full
  Background: deterministic colour from volunteerId hash (choose from 6 muted palette colours)
  Text: first initial + last initial, Inter 13px 700 white
  If photo URL exists: render img with alt="Jamie Thornton"
  Border: none at MVP

[SECTION: Pending Review]
  Sort order: oldest application first (most urgent — person has been waiting longest)
  Empty state for this section: "No pending applications" — section label still shown,
  followed by Inter 14px #8B8B9A "All applications have been reviewed."
  Section header displays count — count updates live as cards are actioned

[SECTION: Confirmed]
  Collapsed to first 2 + "N more" for events with many confirmed volunteers
  Expansion loads inline (no navigation)
  Sort order: most recently confirmed first
```

**Design rationale:** The PENDING section leads because it requires action — sorting confirmed volunteers above pending would bury the organiser's actual job. The inline confirm/decline pattern removes navigation entirely; the organiser never leaves this screen to process a registration. The post-confirmation card transformation (buttons vanish, badge appears, card migrates to the confirmed section after a brief delay) gives the organiser satisfying tactile feedback that their action was registered without disrupting their rhythm. The decline reason is optional — forcing a reason adds friction and most organisations do not have a formal process for it at MVP.

**Landscape adaptation:** 2-column layout. Left column: pending review cards. Right column: confirmed section. Both columns scroll independently.

---

## Screen 6 — Landing / Onboarding Splash

The first screen a new visitor sees. Dual audience: organisers (the paying customer) and volunteers (the supply that makes the platform work). Goal: communicate the value proposition clearly to both audiences within the first scroll, and direct each to the appropriate sign-up path without confusion.

```
┌─────────────────────────────────────────────┐  390px
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│  ← Status bar (system)
├─────────────────────────────────────────────┤
│  occasion  hq               [Sign in]       │  ← Nav bar (56px, bg #0A0A0F)
│                                             │    "occasion" Plus Jakarta Sans 800 white
│                                             │    "hq" Plus Jakarta Sans 400 #8B8B9A 0.85em
│                                             │    "Sign in": Inter 14px #8B8B9A
├─────────────────────────────────────────────┤
│                                             │
│                                             │  ← Hero section (full width, bg #0A0A0F)
│  Where it all                               │  ← Plus Jakarta Sans 800 clamp(2rem,8vw,6rem)
│  comes together.                            │    white, tight letter-spacing (-0.03em)
│                                             │    Line break preserved: "comes together."
│  Built for the occasion.                    │  ← Inter 16px #8B8B9A mt-3
│                                             │
│  ┌───────────────────────────────────────┐  │  ← [COMPONENT: EmberButton — primary, full width]
│  │   Get started — it's free     →       │  │    bg #FF6B35, text white Plus Jakarta Sans 600
│  └───────────────────────────────────────┘  │    16px, h-52px, rounded-md, mx-4
│                                             │    "it's free" — trust signal, part of label
│  Already have an account?  Sign in          │  ← Inter 14px #8B8B9A, centred
│                                             │    "Sign in" Ember, links to /login
│                                             │
├─────────────────────────────────────────────┤  ← Section break (role split)
│                                             │
│  Two sides of the same occasion             │  ← Inter 12px 600 uppercase #8B8B9A
│                                             │    letter-spacing 0.08em, centred, mx-4
│                                             │
│ ┌───────────────────────────────────────┐   │  ← AudienceCard — Organiser
│ │                                       │   │    bg #1A1A24, border #21262D, rounded-xl
│ │  ▦  For organisers                    │   │    mx-4, mb-3, p-4
│ │                                       │   │    Icon: 24px, #FF6B35 (Ember)
│ │  Stop coordinating volunteers         │   │    Headline: Plus Jakarta Sans 700 17px white
│ │  in spreadsheets.                     │   │
│ │                                       │   │
│ │  Create your event, define roles,     │   │    Body: Inter 14px #8B8B9A, line-height 1.6
│ │  and let Occasion HQ fill them.       │   │
│ │  See who's confirmed in real time.    │   │
│ │                                       │   │
│ │  ┌─────────────────────────────────┐  │   │  ← [COMPONENT: OutlineButton]
│ │  │   Create your first event       │  │   │    border 1px #FF6B35 (Ember),
│ │  └─────────────────────────────────┘  │   │    text #FF6B35, h-44px, rounded-md
│ └───────────────────────────────────────┘   │    Routes to /register?role=organiser
│                                             │
│ ┌───────────────────────────────────────┐   │  ← AudienceCard — Volunteer
│ │                                       │   │    Same surface/border spec
│ │  ◎  For volunteers                    │   │    Icon: 24px, #8B8B9A (neutral — volunteer
│ │                                       │   │    CTA is secondary to organiser at landing)
│ │  Find events that need you.           │   │    Headline: Plus Jakarta Sans 700 17px white
│ │                                       │   │
│ │  Browse local events, sign up for     │   │    Body: Inter 14px #8B8B9A
│ │  a role that fits your schedule,      │   │
│ │  and build a record of your           │   │
│ │  volunteer hours.                     │   │
│ │                                       │   │
│ │  ┌─────────────────────────────────┐  │   │  ← [COMPONENT: GhostButton]
│ │  │   Browse events near you        │  │   │    border 1px #21262D, text #E6EDF3
│ │  └─────────────────────────────────┘  │   │    h-44px, rounded-md
│ └───────────────────────────────────────┘   │    Routes to /events (public feed)
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  How it works                               │  ← Plus Jakarta Sans 700 20px white, px-4
│                                             │
│ ┌───────────────────────────────────────┐   │  ← StepCard (3 steps, stacked)
│ │  01                                   │   │    Step number: Plus Jakarta Sans 800 32px
│ │                                       │   │    rgba(255,107,53,0.25) — Ember ghost
│ │  Publish your event                   │   │    Step title: Plus Jakarta Sans 600 16px white
│ │  with roles and shifts                │   │    Body: Inter 14px #8B8B9A
│ │                                       │   │    Left border: 2px solid #FF6B35 (Ember)
│ │  Define exactly what help you need    │   │    pl-4 for content offset
│ │  — role names, shift times, and       │   │
│ │  how many people per role.            │   │
│ └───────────────────────────────────────┘   │
│                                             │
│ ┌───────────────────────────────────────┐   │
│ │  02                                   │   │
│ │                                       │   │
│ │  Volunteers discover and apply        │   │
│ │                                       │   │
│ │  Your event appears in the discovery  │   │
│ │  feed. Volunteers apply for roles     │   │
│ │  that fit their schedule.             │   │
│ └───────────────────────────────────────┘   │
│                                             │
│ ┌───────────────────────────────────────┐   │
│ │  03                                   │   │
│ │                                       │   │
│ │  Confirm with one tap                 │   │
│ │                                       │   │
│ │  Review applications and confirm      │   │
│ │  your team. Watch the roles fill.     │   │
│ │  No spreadsheet required.             │   │
│ └───────────────────────────────────────┘   │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  ┌───────────────────────────────────────┐  │  ← SocialProof panel (bg #1A1A24, mx-4)
│  │                                       │  │
│  │  "We filled all 23 volunteer spots    │  │    Blockquote: Plus Jakarta Sans 500 italic
│  │  for our 10K without a single         │  │    16px white, line-height 1.6
│  │  WhatsApp message."                   │  │
│  │                                       │  │
│  │  — Tom Briggs                         │  │    Attribution: Inter 13px #8B8B9A
│  │    Race Director, Redhill Harriers    │  │
│  │                                       │  │
│  └───────────────────────────────────────┘  │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  Ready to run a smoother event?             │  ← Plus Jakarta Sans 700 20px white, centred, px-4
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │   Get started — it's free     →       │  │  ← EmberButton (repeated at bottom of page)
│  └───────────────────────────────────────┘  │    Same spec as hero CTA
│                                             │
│  Free for up to 3 events per year.          │  ← Inter 13px #8B8B9A, centred
│  No credit card required.                   │    Addresses pricing anxiety at conversion point
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  occasion  hq                               │  ← Footer (bg #0A0A0F, border-t #21262D)
│                                             │    Logo left
│  Privacy · Terms · Contact                 │    Links: Inter 13px #8B8B9A, right-aligned
│                                             │
└─────────────────────────────────────────────┘

No bottom nav on landing page — this is a marketing surface, not an app screen.
Bottom nav appears only after authentication.
```

**Role-selection registration fork (reached from "Get started" CTA):**

```
┌─────────────────────────────────────────────┐
│  ‹  Back                                    │  ← Header (56px)
├─────────────────────────────────────────────┤
│                                             │
│  Join Occasion HQ                           │  ← Plus Jakarta Sans 700 22px white, px-4
│                                             │
│  I want to...                               │  ← Inter 16px #8B8B9A, px-4
│                                             │
│ ┌───────────────────────────────────────┐   │  ← RoleSelectionCard (tappable, full row)
│ │  ▦  Organise events                   │   │    bg #1A1A24, border #21262D, rounded-xl
│ │                                       │   │    px-4 py-5, min-h-[80px]
│ │     Coordinate volunteers for my      │   │    Chevron right: 16px #8B8B9A right edge
│ │     events and races            ›     │   │    Touch: entire card, min-height satisfied
│ └───────────────────────────────────────┘   │
│                                             │
│ ┌───────────────────────────────────────┐   │
│ │  ◎  Volunteer                         │   │
│ │                                       │   │
│ │     Find local events and sign up     │   │
│ │     for roles that fit me       ›     │   │
│ └───────────────────────────────────────┘   │
│                                             │
│  Not sure? Start as a volunteer —           │  ← Inter 14px #8B8B9A, centred
│  you can switch later.                      │    De-risks the decision for ambivalent users
│                                             │
└─────────────────────────────────────────────┘
```

**Component annotations:**

```
[COMPONENT: AudienceCard — dual variant]
  Organiser variant: icon Ember, outline button with Ember border
  Volunteer variant: icon neutral (#8B8B9A), ghost button with default border
  Hierarchy signal: Organiser card first (the paying customer), Volunteer card second
  Both cards same surface/border — visual parity matters for volunteers; hierarchy
  is established by ordering and CTA colour, not card styling

[COMPONENT: StepCard]
  Step number: not a circle badge — it's a large background numeral (32px, low opacity Ember)
  Left border accent: 2px solid #FF6B35 on left edge of card (or left edge of content area)
  Background: #1A1A24 surface
  No numbering icons or circles — the numeral is the design element

[PAGE: Landing]
  No bottom navigation bar
  Sticky top nav: logo + Sign In
  "Sign in" link persists in top nav for returning users
  On scroll: top nav bg transitions from transparent to bg #0A0A0F (scroll threshold: 20px)
  Top nav transition: opacity 0→1 on background only, duration 150ms

[ONBOARDING FORK: role selection]
  This screen sits between the landing CTA and the registration form
  URL: /join
  Role selection persists in session storage, pre-selects role on subsequent steps
  "Not sure?" copy is important: most volunteers arrive via organiser-shared link and
  may be uncertain — the fallback to volunteer reduces drop-off

[ACCESSIBILITY NOTE — landing page]
  Hero heading must be an <h1>
  Section headings must follow logical h2/h3 hierarchy
  StepCards: numbered lists should use <ol> semantically
  AudienceCards: each card CTA button must have descriptive aria-label:
    aria-label="Create your first event as an organiser"
    aria-label="Browse volunteer events near you"
  Social proof blockquote: use <blockquote> and <cite> semantic elements
```

**Design rationale:** The landing page leads with the tagline ("Where it all comes together") and the single primary CTA before the audience split — a user who already knows they want the platform should not have to read copy to find the button. The dual audience split is placed immediately below so neither organiser nor volunteer feels the page is not for them, but the organiser card leads because organisers are the paying customer and the primary acquisition target. The social proof quote uses the specific platform voice ("without a single WhatsApp message") that speaks directly to the race director ICP's pain. The footer repeats the primary CTA with explicit pricing reassurance — "Free for up to 3 events per year. No credit card required." — which addresses the most common B2B sign-up objection at the lowest friction moment.

**Landscape adaptation (tablet 768px+):** Top nav expands to include "For organisers" and "For volunteers" nav links and a secondary "Sign in" button alongside the primary "Get started" CTA. Hero section becomes 2-column: left half copy and CTA, right half a device mockup (post-MVP asset, placeholder rectangle at MVP). Audience cards switch to a side-by-side flex row. Step cards become a horizontal 3-column grid. Social proof panel widens to full `max-w-content-md` (768px).

---

## Design Token Additions Required

The following tokens are not yet in `tailwind.config.js` or `DESIGN-SYSTEM.md` and must be added before implementing Screens 4 and 5:

```css
/* ── All Filled badge (role-level achievement) ── */
--badge-filled-bg:      rgba(74, 222, 128, 0.12);
--badge-filled-border:  rgba(74, 222, 128, 0.30);
--badge-filled-text:    #4ADE80;

/* ── Hero completion panel ── */
--panel-hero-bg:        rgba(74, 222, 128, 0.06);
--panel-hero-border:    rgba(74, 222, 128, 0.20);
```

Add to `tailwind.config.js` `colors.badge`:
```js
'filled-bg':     'var(--badge-filled-bg)',
'filled-border': 'var(--badge-filled-border)',
'filled-text':   'var(--badge-filled-text)',
```

Add display label lookup (implement in a `statusLabel.ts` utility):
```ts
export const registrationStatusLabel: Record<string, string> = {
  PENDING:   'Awaiting review',
  CONFIRMED: 'Confirmed',
  DECLINED:  'Not accepted',
  CANCELLED: 'Cancelled',
  COMPLETED: 'Attended',
}
```

---

## Cross-Screen Consistency Notes

1. **Back navigation header:** All authenticated app screens use a persistent back header (56px, border-b, back chevron + context label). The context label is the parent screen name, not "Back". This tells the user where they are going, not just that they can go backwards.

2. **Section labels:** All section labels use the same Inter 11–12px 600 uppercase treatment with `#8B8B9A` and `letter-spacing: 0.08–0.14em`. They are never interactive unless they collapse a section, in which case they include a `▾` / `▴` chevron.

3. **Empty states:** Every list or feed must have a directed empty state with a primary CTA pointing to the most likely next action. Generic "No items found" is never acceptable.

4. **Loading states:** Named loading copy throughout: "Finding events near you…" not a generic spinner. The spinner is always 16px, Ember, inline with text.

5. **Ember scarcity:** Ember appears only on interactive elements (primary CTAs, active nav, filter chip active state, text links). It does not appear on decorative elements, headings, or static information. Every Ember element should be tappable or navigable.

6. **Green scarcity:** Green (`#4ADE80`) appears only on achievement and completion states: CONFIRMED status badges, All Filled badges, hero completion panel, success icons post-application. It does not appear on informational elements, progress indicators at non-100% fill, or structural chrome.

7. **Bottom nav:** Present on all authenticated screens. Not present on the landing page, registration flow, or any modal/sheet overlay. The organiser variant has 3 tabs (Events / New Event / Account). The volunteer variant has 4 tabs (Explore / Saved / My Events / Profile). Both use the same BottomNav component with a `tabs` prop.
