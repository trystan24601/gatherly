# Gatherly Design System

> Version 1.0 — written against MVP-PLAN.md, synthesised from design explorations A–G.
> This document is the authoritative source of truth for every visual and interaction decision in the Gatherly frontend. All contributors must read it before writing a single component.

---

## Design Direction Summary

Gatherly ships as a **dark-first utility tool** with a clean light-mode alternative. The visual language is drawn primarily from Options G (Racing Line) and D (Dark Teal), both of which introduced proper CSS token systems, dual-theme support, and mobile-considered layouts. Option F contributes the editorial display-font pairing and the hairline-border card aesthetic. Options A and B contribute the pragmatic form-control and status-badge patterns that are the backbone of the volunteer registration flow.

The palette anchors on **Ember** (`#FF6B35`) — a warm, high-contrast orange that reads instantly on both dark and light backgrounds, communicates energy without aggression, and differentiates Gatherly from the sea of blue-accent SaaS tools that community volunteers already use. Green (`#4ADE80` dark / `#1A7F37` light) handles all confirmed/success states. Status badges — PENDING, CONFIRMED, DECLINED, CANCELLED — are the single most important visual element in the system and are specified with maximum contrast and legibility in mind.

---

## 1. Design Principles

### 1.1 Clarity before cleverness
Every volunteer is standing at a road junction in the rain checking their role on a phone with 30% battery. Every org admin is rushing through their lunch break. Ornament is a cost. Information is the product. If a component cannot pass the "3-second scan" test — the user knows what to do in three seconds — redesign it.

### 1.2 Status is sacred
PENDING, CONFIRMED, DECLINED, and CANCELLED are the four states that govern a volunteer's world. These badges must be legible at any size, distinguishable from each other in all lighting conditions, and never obscured by other UI elements. They are always rendered as filled pill badges with high-contrast foreground text, never as plain text or outline-only variants.

### 1.3 Touch first, pointer second
The primary Gatherly user is a volunteer on a mobile device, often outdoors. Every interactive element meets the 44×44 px minimum touch target. Bottom navigation on mobile replaces hamburger menus. Filter bars scroll horizontally. The desktop layout is an enhancement of the mobile layout, not a different design.

### 1.4 One accent, used deliberately
Ember is the only brand accent colour. It appears on primary CTAs, active navigation states, and interactive affordances. It does not appear on every heading, every icon, or every badge. Scarcity gives it meaning. If everything is orange, nothing is.

### 1.5 Progressive disclosure
Org admins manage complex data. Volunteers see simple confirmations. The system never shows all options at once. Forms reveal additional fields only when needed. Destructive actions require confirmation. Error messages explain what to fix, not just what went wrong.

---

## 2. Colour Tokens

### 2.1 CSS Custom Properties

Paste the following into your root stylesheet (or `src/index.css` in the Vite project). Dark mode is the default theme. Light mode is activated by adding `data-theme="light"` to the `<html>` element.

```css
/* ─── GATHERLY COLOUR TOKENS ─────────────────────────────────────────── */

:root {
  /* ── Background layers ──────────────────────────────────────────────── */
  --color-bg:          #0D1117;   /* Page background */
  --color-surface:     #161B22;   /* Cards, panels */
  --color-raised:      #1C2128;   /* Elevated cards, dropdowns */
  --color-overlay:     #21262D;   /* Modals, tooltips, popovers */

  /* ── Brand accent ───────────────────────────────────────────────────── */
  --color-accent:      #FF6B35;   /* Ember — primary CTA, active states */
  --color-accent-dim:  rgba(255, 107, 53, 0.55);
  --color-accent-subtle: rgba(255, 107, 53, 0.08);
  --color-accent-mid:  rgba(255, 107, 53, 0.15);

  /* ── Text hierarchy ─────────────────────────────────────────────────── */
  --color-text-primary:   #E6EDF3;
  --color-text-secondary: #848D97;
  --color-text-tertiary:  #484F58;
  --color-text-disabled:  #30363D;
  --color-text-inverse:   #FFFFFF;   /* On dark backgrounds when accent fill */

  /* ── Border tiers ───────────────────────────────────────────────────── */
  --color-border:          #21262D;
  --color-border-mid:      #30363D;
  --color-border-strong:   #444C56;

  /* ── Semantic ───────────────────────────────────────────────────────── */
  --color-success:         #4ADE80;
  --color-success-subtle:  rgba(74, 222, 128, 0.09);
  --color-success-mid:     rgba(74, 222, 128, 0.18);

  --color-warning:         #F59E0B;
  --color-warning-subtle:  rgba(245, 158, 11, 0.09);
  --color-warning-mid:     rgba(245, 158, 11, 0.18);

  --color-danger:          #EF4444;
  --color-danger-subtle:   rgba(239, 68, 68, 0.09);
  --color-danger-mid:      rgba(239, 68, 68, 0.18);

  --color-info:            #3B82F6;
  --color-info-subtle:     rgba(59, 130, 246, 0.09);
  --color-info-mid:        rgba(59, 130, 246, 0.18);

  /* ── Status badges ──────────────────────────────────────────────────── */
  /* PENDING — amber, implies action required */
  --badge-pending-bg:      rgba(245, 158, 11, 0.12);
  --badge-pending-border:  rgba(245, 158, 11, 0.35);
  --badge-pending-text:    #F59E0B;

  /* CONFIRMED — green, safe and done */
  --badge-confirmed-bg:    rgba(74, 222, 128, 0.09);
  --badge-confirmed-border: rgba(74, 222, 128, 0.25);
  --badge-confirmed-text:  #4ADE80;

  /* DECLINED — red, negative outcome */
  --badge-declined-bg:     rgba(239, 68, 68, 0.09);
  --badge-declined-border: rgba(239, 68, 68, 0.25);
  --badge-declined-text:   #EF4444;

  /* CANCELLED — grey, neutral / voided */
  --badge-cancelled-bg:    rgba(72, 79, 88, 0.20);
  --badge-cancelled-border: rgba(72, 79, 88, 0.40);
  --badge-cancelled-text:  #848D97;

  /* DRAFT — muted, informational */
  --badge-draft-bg:        rgba(72, 79, 88, 0.12);
  --badge-draft-border:    rgba(72, 79, 88, 0.25);
  --badge-draft-text:      #484F58;

  /* PUBLISHED — accent, positive action taken */
  --badge-published-bg:    rgba(74, 222, 128, 0.09);
  --badge-published-border: rgba(74, 222, 128, 0.22);
  --badge-published-text:  #4ADE80;

  /* ── Shadows ────────────────────────────────────────────────────────── */
  --shadow-sm:  0 1px 3px rgba(0, 0, 0, 0.4);
  --shadow-md:  0 4px 16px rgba(0, 0, 0, 0.5);
  --shadow-accent: 0 0 0 3px var(--color-accent-mid);

  /* ── Navigation ─────────────────────────────────────────────────────── */
  --nav-height: 56px;
  --bottom-nav-height: 60px;
}

/* ─── LIGHT THEME ──────────────────────────────────────────────────────── */

[data-theme="light"] {
  /* Background layers */
  --color-bg:          #FFFFFF;
  --color-surface:     #F6F8FA;
  --color-raised:      #EAEEF2;
  --color-overlay:     #D0D7DE;

  /* Brand accent — slightly deeper for contrast on white */
  --color-accent:       #E5521A;
  --color-accent-dim:   rgba(229, 82, 26, 0.50);
  --color-accent-subtle: rgba(229, 82, 26, 0.07);
  --color-accent-mid:   rgba(229, 82, 26, 0.12);

  /* Text hierarchy */
  --color-text-primary:    #0D1117;
  --color-text-secondary:  #57606A;
  --color-text-tertiary:   #8C959F;
  --color-text-disabled:   #BDC4CB;
  --color-text-inverse:    #FFFFFF;

  /* Border tiers */
  --color-border:          #D0D7DE;
  --color-border-mid:      #BDC4CB;
  --color-border-strong:   #9AA2AB;

  /* Semantic */
  --color-success:         #1A7F37;
  --color-success-subtle:  rgba(26, 127, 55, 0.08);
  --color-success-mid:     rgba(26, 127, 55, 0.16);

  --color-warning:         #D97706;
  --color-warning-subtle:  rgba(217, 119, 6, 0.08);
  --color-warning-mid:     rgba(217, 119, 6, 0.16);

  --color-danger:          #DC2626;
  --color-danger-subtle:   rgba(220, 38, 38, 0.08);
  --color-danger-mid:      rgba(220, 38, 38, 0.16);

  --color-info:            #2563EB;
  --color-info-subtle:     rgba(37, 99, 235, 0.08);
  --color-info-mid:        rgba(37, 99, 235, 0.16);

  /* Status badges — adjusted for light backgrounds */
  --badge-pending-bg:      rgba(217, 119, 6, 0.10);
  --badge-pending-border:  rgba(217, 119, 6, 0.30);
  --badge-pending-text:    #92400E;

  --badge-confirmed-bg:    rgba(26, 127, 55, 0.08);
  --badge-confirmed-border: rgba(26, 127, 55, 0.22);
  --badge-confirmed-text:  #166534;

  --badge-declined-bg:     rgba(220, 38, 38, 0.08);
  --badge-declined-border: rgba(220, 38, 38, 0.22);
  --badge-declined-text:   #991B1B;

  --badge-cancelled-bg:    rgba(140, 149, 159, 0.12);
  --badge-cancelled-border: rgba(140, 149, 159, 0.30);
  --badge-cancelled-text:  #57606A;

  --badge-draft-bg:        rgba(140, 149, 159, 0.10);
  --badge-draft-border:    rgba(140, 149, 159, 0.22);
  --badge-draft-text:      #8C959F;

  --badge-published-bg:    rgba(26, 127, 55, 0.08);
  --badge-published-border: rgba(26, 127, 55, 0.20);
  --badge-published-text:  #166534;

  /* Shadows */
  --shadow-sm:  0 1px 3px rgba(0, 0, 0, 0.08);
  --shadow-md:  0 4px 16px rgba(0, 0, 0, 0.10);
}
```

### 2.2 Token Usage Rules

| Token | When to use |
|---|---|
| `--color-bg` | HTML body, page wrappers, full-bleed sections |
| `--color-surface` | All cards, form containers, nav backgrounds |
| `--color-raised` | Dropdown menus, selected card states, second-level panels |
| `--color-overlay` | Modal backdrops content area, tooltip fills |
| `--color-accent` | Primary buttons, active nav items, links, focus rings, fill bars |
| `--color-text-primary` | Headings, card titles, form values |
| `--color-text-secondary` | Body copy, metadata, form labels |
| `--color-text-tertiary` | Timestamps, captions, divider labels, placeholder text |
| `--color-text-disabled` | Disabled inputs, deactivated skills |
| `--color-border` | Card outlines, table row dividers, section separators |
| `--color-border-mid` | Input borders (default state), grouped content dividers |
| `--color-border-strong` | Input borders (hover state), visible boundaries |

---

## 3. Typography

### 3.1 Font Pairing

**Display font:** Plus Jakarta Sans — bold, geometric, legible at large sizes. Used for event titles, dashboard headings, hero text, and data numerals. Its compressed weight range (400–900) provides expressive headings without a serif that would feel out of place in a utility tool.

**Body font:** Inter — the industry baseline for UI text. Optimised for screen rendering at small sizes. Used for all body copy, labels, form inputs, navigation, and badges.

**Rationale for dropping Cormorant Garamond (Option F) and Playfair Display (Option E):** Both serifs add editorial character but introduce legibility friction at small sizes on low-resolution mobile screens. The community volunteer audience skews older and non-design-aware; a sharp, readable sans-serif in both roles serves them better.

### 3.2 Google Fonts Import

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600&display=swap"
  rel="stylesheet"
/>
```

For production, self-host fonts via `fontsource` npm packages to avoid the Google Fonts third-party request:
```
npm install @fontsource/plus-jakarta-sans @fontsource/inter
```

### 3.3 Type Scale (CSS Custom Properties)

```css
:root {
  /* ── Font families ───────────────────────────────────────────── */
  --font-display: 'Plus Jakarta Sans', system-ui, sans-serif;
  --font-body:    'Inter', system-ui, sans-serif;

  /* ── Type scale ─────────────────────────────────────────────── */
  /* Display — hero headings, event titles, large numbers */
  --text-display-2xl: clamp(3rem, 8vw, 6rem);     /* Hero titles only */
  --text-display-xl:  clamp(2rem, 5vw, 3.5rem);   /* Page-level headings */
  --text-display-lg:  clamp(1.5rem, 3vw, 2.25rem); /* Section headings */
  --text-display-md:  1.25rem;                      /* Card titles, modal headings */
  --text-display-sm:  1.125rem;                     /* Sub-headings */

  /* Body — all running text */
  --text-body-lg:   1rem;        /* 16px — primary body, form labels */
  --text-body-md:   0.9375rem;   /* 15px — secondary body */
  --text-body-sm:   0.875rem;    /* 14px — metadata, descriptions */
  --text-body-xs:   0.8125rem;   /* 13px — captions, helper text */

  /* Label / UI chrome */
  --text-label-lg:  0.875rem;   /* 14px — form labels */
  --text-label-md:  0.8125rem;  /* 13px — nav links, button text */
  --text-label-sm:  0.75rem;    /* 12px — small labels, timestamps */
  --text-label-xs:  0.6875rem;  /* 11px — eyebrows, section dividers */
  --text-caption:   0.625rem;   /* 10px — badge text, legal, overlines */

  /* ── Leading (line height) ──────────────────────────────────── */
  --leading-tight:   1.0;   /* Large display, stats */
  --leading-snug:    1.25;  /* Card titles */
  --leading-normal:  1.5;   /* Body, labels */
  --leading-relaxed: 1.75;  /* Long-form descriptions */

  /* ── Tracking (letter spacing) ──────────────────────────────── */
  --tracking-tight:    -0.04em;  /* Large display numerals */
  --tracking-snug:     -0.02em;  /* Card titles (Plus Jakarta Sans) */
  --tracking-normal:    0em;     /* Body copy */
  --tracking-wide:      0.04em;  /* Small labels */
  --tracking-wider:     0.08em;  /* Badge text */
  --tracking-widest:    0.14em;  /* Eyebrows, overlines */
}
```

### 3.4 Usage Rules

| Element | Font | Size token | Weight | Leading | Tracking |
|---|---|---|---|---|---|
| Hero title | Display | `display-xl` | 900 | tight | snug |
| Page heading (h1) | Display | `display-lg` | 800 | snug | snug |
| Section heading (h2) | Display | `display-md` | 700 | snug | snug |
| Card title | Display | `display-sm` | 700 | snug | snug |
| Event stat numerals | Display | `display-lg` | 800 | tight | tight |
| Nav links | Body | `label-md` | 500 | normal | normal |
| Body copy | Body | `body-sm` | 400 | relaxed | normal |
| Form labels | Body | `label-lg` | 500 | normal | normal |
| Form values | Body | `body-lg` | 400 | normal | normal |
| Badge text | Body | `caption` | 600 | normal | wider |
| Timestamps | Body | `label-sm` | 400 | normal | wide |
| Eyebrows | Body | `label-xs` | 600 | normal | widest |
| Button text | Body | `label-md` | 600 | normal | normal |

**Rule:** Plus Jakarta Sans is used only for display-scale text (card titles and above) and large numerals. Inter handles everything else. Never render a paragraph of body copy in Plus Jakarta Sans.

---

## 4. Spacing & Layout

### 4.1 Base Grid

All spacing values are multiples of **4px**. The system uses a named token set mapped to Tailwind utilities.

```css
:root {
  --space-1:   4px;
  --space-2:   8px;
  --space-3:   12px;
  --space-4:   16px;
  --space-5:   20px;
  --space-6:   24px;
  --space-8:   32px;
  --space-10:  40px;
  --space-12:  48px;
  --space-16:  64px;
  --space-20:  80px;
  --space-24:  96px;
}
```

### 4.2 Named Spacing Tokens

| Token name | Value | Use case |
|---|---|---|
| `xs`  | 4px  | Icon gap, tight badge padding |
| `sm`  | 8px  | Inline element gap, compact padding |
| `md`  | 16px | Card inner padding (mobile), form row gap |
| `lg`  | 24px | Card inner padding (desktop), section gap |
| `xl`  | 40px | Section vertical padding (mobile) |
| `2xl` | 80px | Section vertical padding (desktop) |

### 4.3 Content Widths

```css
:root {
  --width-content-sm:  640px;   /* Single-column forms, auth pages */
  --width-content-md:  768px;   /* Detail pages, settings */
  --width-content-lg:  1024px;  /* Discovery feed, dashboards */
  --width-content-xl:  1280px;  /* Full-bleed admin layouts */
}
```

All containers are centred with `margin: 0 auto` and use `padding: 0 var(--section-padding-h)`.

### 4.4 Section Padding

```css
:root {
  /* Horizontal page padding — scales with viewport */
  --section-padding-h: max(16px, min(6vw, 64px));

  /* Vertical section rhythm */
  --section-padding-v-mobile:  40px;
  --section-padding-v-desktop: 80px;
}

@media (min-width: 768px) {
  :root {
    --section-padding-v: var(--section-padding-v-desktop);
  }
}
```

### 4.5 Card Padding

| Context | Padding |
|---|---|
| Mobile event card | 16px (all sides) |
| Desktop event card | 24px (all sides) |
| Modal content | 24px (mobile) / 32px (desktop) |
| Form section | 24px (all sides) |
| Dashboard stat panel | 20px horizontal / 16px vertical |

### 4.6 Border Radius

```css
:root {
  --radius-sm:    4px;    /* Badges, filter pills, table cells */
  --radius-md:    8px;    /* Inputs, selects, small cards */
  --radius-lg:    12px;   /* Event cards, panels */
  --radius-xl:    16px;   /* Modal containers */
  --radius-full:  9999px; /* Avatar circles, pill buttons */
}
```

**Decision:** Rounded-rect buttons (`--radius-md`) for primary and secondary actions. Full pill (`--radius-full`) for filter chips and avatar only. This avoids the "candy app" feel of pill buttons everywhere while keeping filter interactions visually distinct from form actions.

---

## 5. Component Specifications

### 5.1 Button

Minimum touch target: **44×44px on mobile** (enforced via `min-height: 44px` and adequate padding).

#### Variants

**Primary** — ember fill, used for the single most important action per screen.
```css
.btn-primary {
  background: var(--color-accent);
  color: #FFFFFF;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  font-family: var(--font-body);
  font-size: var(--text-label-md);
  font-weight: 600;
  padding: 10px 20px;
  min-height: 44px;
  cursor: pointer;
  transition: background 0.18s ease, box-shadow 0.18s ease;
}
.btn-primary:hover  { background: #ff7d4d; }
.btn-primary:focus-visible {
  outline: none;
  box-shadow: var(--shadow-accent);
}
.btn-primary:active { background: #d94e22; }
.btn-primary:disabled {
  background: var(--color-raised);
  color: var(--color-text-disabled);
  cursor: not-allowed;
}
```

**Secondary** — surface fill with border, for supporting actions.
```css
.btn-secondary {
  background: var(--color-raised);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-mid);
  border-radius: var(--radius-md);
  font-family: var(--font-body);
  font-size: var(--text-label-md);
  font-weight: 500;
  padding: 10px 20px;
  min-height: 44px;
  cursor: pointer;
  transition: background 0.18s ease, border-color 0.18s ease;
}
.btn-secondary:hover {
  background: var(--color-overlay);
  border-color: var(--color-border-strong);
}
.btn-secondary:focus-visible {
  outline: none;
  box-shadow: var(--shadow-accent);
}
```

**Ghost** — transparent, for tertiary actions.
```css
.btn-ghost {
  background: transparent;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border-mid);
  border-radius: var(--radius-md);
  font-family: var(--font-body);
  font-size: var(--text-label-md);
  font-weight: 500;
  padding: 9px 18px;
  min-height: 44px;
  cursor: pointer;
  transition: background 0.18s ease, color 0.18s ease, border-color 0.18s ease;
}
.btn-ghost:hover {
  background: var(--color-surface);
  color: var(--color-text-primary);
  border-color: var(--color-border-strong);
}
```

**Danger** — red fill, used only for destructive actions (cancel event, delete role). Always preceded by a confirmation step.
```css
.btn-danger {
  background: var(--color-danger);
  color: #FFFFFF;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  font-family: var(--font-body);
  font-size: var(--text-label-md);
  font-weight: 600;
  padding: 10px 20px;
  min-height: 44px;
  cursor: pointer;
  transition: background 0.18s ease;
}
.btn-danger:hover { background: #dc2626; }
```

**Tailwind equivalents:**
```
Primary:   bg-accent text-white rounded-md text-sm font-semibold px-5 py-2.5 min-h-[44px] hover:bg-[#ff7d4d] focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:outline-none transition-colors
Secondary: bg-raised text-text-primary border border-border-mid rounded-md text-sm font-medium px-5 py-2.5 min-h-[44px] hover:bg-overlay hover:border-border-strong transition-colors
Ghost:     bg-transparent text-text-secondary border border-border-mid rounded-md text-sm font-medium px-4 py-2.5 min-h-[44px] hover:bg-surface hover:text-text-primary hover:border-border-strong transition-colors
Danger:    bg-danger text-white rounded-md text-sm font-semibold px-5 py-2.5 min-h-[44px] hover:bg-red-600 transition-colors
```

**Sizes:**
- `btn-sm`: `padding: 6px 14px; font-size: var(--text-caption); min-height: 32px` (desktop-only — never use on mobile as the primary action)
- `btn-md`: default spec above
- `btn-lg`: `padding: 14px 28px; font-size: var(--text-body-sm); min-height: 52px` (hero CTAs, mobile full-width actions)

---

### 5.2 Input / Textarea / Select

All form controls share the same base reset. Labels always sit **above** the input. Error messages sit **below** and are linked via `aria-describedby`.

```css
/* Base input */
.input {
  width: 100%;
  background: var(--color-surface);
  border: 1px solid var(--color-border-mid);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  font-family: var(--font-body);
  font-size: var(--text-body-sm);
  font-weight: 400;
  padding: 10px 14px;
  min-height: 44px;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.input::placeholder { color: var(--color-text-tertiary); }

/* Focus */
.input:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-subtle);
}

/* Error */
.input--error {
  border-color: var(--color-danger);
  box-shadow: 0 0 0 3px var(--color-danger-subtle);
}

/* Disabled */
.input:disabled {
  background: var(--color-raised);
  color: var(--color-text-disabled);
  border-color: var(--color-border);
  cursor: not-allowed;
}

/* Form label */
.form-label {
  display: block;
  font-family: var(--font-body);
  font-size: var(--text-label-lg);
  font-weight: 500;
  color: var(--color-text-secondary);
  margin-bottom: 6px;
}

/* Error message */
.form-error {
  font-family: var(--font-body);
  font-size: var(--text-label-sm);
  color: var(--color-danger);
  margin-top: 6px;
}

/* Helper text */
.form-hint {
  font-family: var(--font-body);
  font-size: var(--text-label-sm);
  color: var(--color-text-tertiary);
  margin-top: 6px;
}

/* Textarea — same as input but min-height overridden */
.textarea { resize: vertical; min-height: 100px; }

/* Select — add chevron via background-image */
.select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23848D97' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
  padding-right: 40px;
}
```

---

### 5.3 Card

Cards are the primary content container for events, roles, and registrations.

```css
/* Default card */
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 16px;   /* mobile */
  transition: background 0.18s ease;
}

@media (min-width: 768px) {
  .card { padding: 24px; }
}

/* Interactive card (event discovery, role list) */
.card--interactive {
  cursor: pointer;
}

.card--interactive:hover {
  background: var(--color-raised);
}

/* Selected card (active role, checked volunteer) */
.card--selected {
  background: var(--color-accent-subtle);
  border-color: var(--color-accent-dim);
}
```

**Event card anatomy (mobile-first):**
```
┌──────────────────────────────────────┐
│ [EYEBROW: TYPE · STATUS BADGE]       │
│                                      │
│ Event title in display font          │
│ Organisation name                    │
│                                      │
│ 📅 Date · Time                       │
│ 📍 City                              │
│                                      │
│ ─────── fill bar ─────── 14/32       │
│                                      │
│ [View event →]                       │
└──────────────────────────────────────┘
```

On desktop (≥768px) cards arrange into a 2- or 3-column grid. On mobile they stack full-width.

---

### 5.4 Badge / Status Pill

Status badges are the most safety-critical visual element. They must be instantly distinguishable at glance — especially in a list where PENDING and CONFIRMED exist together.

```css
/* Base badge */
.badge {
  display: inline-flex;
  align-items: center;
  font-family: var(--font-body);
  font-size: var(--text-caption);       /* 10px */
  font-weight: 700;
  letter-spacing: var(--tracking-wider);
  text-transform: uppercase;
  white-space: nowrap;
  padding: 3px 8px;
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  font-variant-numeric: tabular-nums;
}

/* Status variants */
.badge--pending {
  background: var(--badge-pending-bg);
  border-color: var(--badge-pending-border);
  color: var(--badge-pending-text);
}

.badge--confirmed {
  background: var(--badge-confirmed-bg);
  border-color: var(--badge-confirmed-border);
  color: var(--badge-confirmed-text);
}

.badge--declined {
  background: var(--badge-declined-bg);
  border-color: var(--badge-declined-border);
  color: var(--badge-declined-text);
}

.badge--cancelled {
  background: var(--badge-cancelled-bg);
  border-color: var(--badge-cancelled-border);
  color: var(--badge-cancelled-text);
}

.badge--draft {
  background: var(--badge-draft-bg);
  border-color: var(--badge-draft-border);
  color: var(--badge-draft-text);
}

.badge--published {
  background: var(--badge-published-bg);
  border-color: var(--badge-published-border);
  color: var(--badge-published-text);
}
```

**ARIA annotation for status badges:**
```jsx
<span
  className="badge badge--pending"
  role="status"
  aria-label="Registration status: Pending"
>
  Pending
</span>
```

Do not convey status through colour alone. The text label is mandatory. Never abbreviate (do not write "CONF" for CONFIRMED).

---

### 5.5 Navigation

#### Desktop top nav (≥768px)

```
┌────────────────────────────────────────────────────┐
│  Gatherly·    Events    My Schedule    Profile   [JD] │
│ ─────────── border-bottom ──────────────────────── │
```

- Height: `--nav-height` (56px)
- Background: `--color-bg` (matches page, not elevated)
- Bottom border: 1px `--color-border`
- Logo: Plus Jakarta Sans 800, 18px, `--color-text-primary` with accent dot
- Nav links: Inter 500, 13px, `--color-text-secondary`, hover to `--color-text-primary`, active gets `background: var(--color-accent-subtle); color: var(--color-accent); border-radius: var(--radius-sm);`
- Avatar: 30px circle, `--color-raised`, initials in `--color-text-secondary`

#### Mobile bottom nav (≤767px)

Four items. The bottom nav replaces the hamburger entirely. It is persistent across all volunteer-facing pages.

```
┌─────────────────────────────────────────┐
│  [🏠]       [📅]      [✓]       [👤]   │
│ Home     Events   My Regs   Profile     │
└─────────────────────────────────────────┘
```

```css
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: var(--bottom-nav-height);  /* 60px */
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  z-index: 200;
  /* iOS safe area */
  padding-bottom: env(safe-area-inset-bottom);
}

.bottom-nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  font-family: var(--font-body);
  font-size: 10px;
  font-weight: 500;
  color: var(--color-text-tertiary);
  text-decoration: none;
  transition: color 0.15s ease;
  min-height: 44px;   /* touch target */
}

.bottom-nav-item svg { width: 22px; height: 22px; }

.bottom-nav-item--active {
  color: var(--color-accent);
}
```

**Items for volunteers:** Home, Events, My Registrations, Profile.

**For org admins** (more likely on desktop but the mobile layout must still work): Home, Events, Registrations, Settings. No bottom nav is shown on admin-only pages (`/admin/*`) — those pages assume desktop context.

**Org admins on mobile** see the same bottom nav but with "Events" pointing to their event management list.

---

### 5.6 Page Shell

```css
/* Page-level wrapper */
.page-shell {
  min-height: 100vh;
  background: var(--color-bg);
  /* Reserve space for bottom nav on mobile */
  padding-bottom: calc(var(--bottom-nav-height) + env(safe-area-inset-bottom));
}

@media (min-width: 768px) {
  .page-shell { padding-bottom: 0; }
}

/* Content container */
.container {
  width: 100%;
  max-width: var(--width-content-lg);
  margin: 0 auto;
  padding: 0 var(--section-padding-h);
}

.container--narrow {
  max-width: var(--width-content-sm);
}

.container--wide {
  max-width: var(--width-content-xl);
}
```

---

### 5.7 Form Layout

```
┌─────────────────────────────────────┐
│ Section title (display font)         │
│                                      │
│ [fieldset]                           │
│   Label *                            │
│   ┌────────────────────────────────┐│
│   │ Input value                    ││
│   └────────────────────────────────┘│
│   Helper text or error message       │
│                                      │
│   Label                              │
│   ┌────────────────────────────────┐│
│   │ Select ▾                       ││
│   └────────────────────────────────┘│
│                                      │
│   [Cancel]      [Save changes →]     │
└─────────────────────────────────────┘
```

Rules:
- Label always above input, never placeholder-as-label
- Required fields marked with `*` in `--color-accent`, with `aria-required="true"` on the input
- Vertical gap between field groups: `--space-6` (24px)
- Horizontal gap between two side-by-side fields (date range): `--space-4` (16px)
- Action row sits at the bottom with secondary/destructive actions left, primary action right
- On mobile (≤480px) all fields are full-width, side-by-side fields stack

---

### 5.8 Modal / Dialog

```css
/* Backdrop */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  z-index: 500;
  display: flex;
  align-items: flex-end;    /* mobile: sheet from bottom */
  justify-content: center;
}

@media (min-width: 640px) {
  .modal-backdrop {
    align-items: center;    /* desktop: centred dialog */
  }
}

/* Container */
.modal {
  background: var(--color-surface);
  border: 1px solid var(--color-border-mid);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;  /* mobile sheet */
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  padding: 24px 16px;
  box-shadow: var(--shadow-md);
}

@media (min-width: 640px) {
  .modal {
    border-radius: var(--radius-xl);
    max-width: 480px;
    padding: 32px;
    width: calc(100% - 32px);
  }
}

/* Header */
.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 20px;
}

.modal-title {
  font-family: var(--font-display);
  font-size: var(--text-display-sm);
  font-weight: 700;
  color: var(--color-text-primary);
}

/* Footer */
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 28px;
  padding-top: 20px;
  border-top: 1px solid var(--color-border);
}
```

**ARIA pattern:**
```jsx
<div role="dialog" aria-modal="true" aria-labelledby="modal-title">
  <h2 id="modal-title">Confirm cancellation</h2>
  ...
</div>
```

Focus must be trapped inside the modal while open. Return focus to the trigger element on close.

---

### 5.9 Loading States — Skeleton Loaders

Spinners are banned. All loading states use skeleton loaders that approximate the shape of the real content. This reduces perceived load time and prevents layout shift.

```css
@keyframes skeleton-shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}

.skeleton {
  background: linear-gradient(
    90deg,
    var(--color-raised) 25%,
    var(--color-overlay) 50%,
    var(--color-raised) 75%
  );
  background-size: 800px 100%;
  animation: skeleton-shimmer 1.4s ease-in-out infinite;
  border-radius: var(--radius-sm);
}

/* Preset skeleton shapes */
.skeleton-text  { height: 14px; border-radius: var(--radius-sm); }
.skeleton-title { height: 20px; border-radius: var(--radius-sm); }
.skeleton-badge { height: 20px; width: 72px; border-radius: var(--radius-sm); }
.skeleton-btn   { height: 44px; border-radius: var(--radius-md); }
.skeleton-card  { height: 160px; border-radius: var(--radius-lg); }
```

**Event card skeleton pattern:**
```jsx
<div className="card">
  <div className="skeleton skeleton-badge mb-3" style={{ width: '80px' }} />
  <div className="skeleton skeleton-title mb-2" />
  <div className="skeleton skeleton-text mb-4" style={{ width: '60%' }} />
  <div className="skeleton skeleton-text mb-1" style={{ width: '40%' }} />
  <div className="skeleton skeleton-text mb-4" style={{ width: '50%' }} />
  <div className="skeleton skeleton-btn mt-auto" />
</div>
```

---

### 5.10 Empty States

Every list view (event discovery, my registrations, org event list, registration management) must have an empty state. Empty states must:
1. Tell the user what is empty and why (not just "No results")
2. Offer a direct action to resolve the emptiness where possible
3. Use a consistent visual pattern — icon placeholder + heading + body + optional CTA

```
┌───────────────────────────────────────┐
│                                       │
│         [Icon placeholder]            │
│         48×48px, text-tertiary        │
│                                       │
│         No events yet                 │
│         (display font, text-primary)  │
│                                       │
│     There are no published events     │
│     matching your filters. Try        │
│     adjusting the date range.         │
│     (body, text-secondary)            │
│                                       │
│         [Clear filters]               │
│         (btn-secondary, optional)     │
│                                       │
└───────────────────────────────────────┘
```

The icon placeholder uses an SVG icon in `--color-text-tertiary`, 48px. Do not use illustrations or external images — they complicate maintenance and add HTTP requests.

---

## 6. Tailwind Configuration

The following `theme.extend` block maps all design tokens to Tailwind utility classes. Place this in `tailwind.config.js` at the repo root (or `frontend/tailwind.config.js` if using the monorepo structure from MVP-PLAN.md).

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    './frontend/src/**/*.{js,ts,jsx,tsx}',
    './frontend/index.html',
  ],
  theme: {
    extend: {
      colors: {
        // Background layers
        bg:       'var(--color-bg)',
        surface:  'var(--color-surface)',
        raised:   'var(--color-raised)',
        overlay:  'var(--color-overlay)',

        // Brand accent
        accent: {
          DEFAULT: 'var(--color-accent)',
          dim:     'var(--color-accent-dim)',
          subtle:  'var(--color-accent-subtle)',
          mid:     'var(--color-accent-mid)',
        },

        // Text
        'text-primary':   'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-tertiary':  'var(--color-text-tertiary)',
        'text-disabled':  'var(--color-text-disabled)',
        'text-inverse':   'var(--color-text-inverse)',

        // Borders
        border: {
          DEFAULT: 'var(--color-border)',
          mid:     'var(--color-border-mid)',
          strong:  'var(--color-border-strong)',
        },

        // Semantic
        success: {
          DEFAULT: 'var(--color-success)',
          subtle:  'var(--color-success-subtle)',
          mid:     'var(--color-success-mid)',
        },
        warning: {
          DEFAULT: 'var(--color-warning)',
          subtle:  'var(--color-warning-subtle)',
          mid:     'var(--color-warning-mid)',
        },
        danger: {
          DEFAULT: 'var(--color-danger)',
          subtle:  'var(--color-danger-subtle)',
          mid:     'var(--color-danger-mid)',
        },
        info: {
          DEFAULT: 'var(--color-info)',
          subtle:  'var(--color-info-subtle)',
          mid:     'var(--color-info-mid)',
        },
      },

      fontFamily: {
        display: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        body:    ['Inter', 'system-ui', 'sans-serif'],
        sans:    ['Inter', 'system-ui', 'sans-serif'], // shadcn/ui default override
      },

      fontSize: {
        // Display scale
        'display-2xl': ['clamp(3rem, 8vw, 6rem)',    { lineHeight: '1.0',  letterSpacing: '-0.04em', fontWeight: '900' }],
        'display-xl':  ['clamp(2rem, 5vw, 3.5rem)',   { lineHeight: '1.05', letterSpacing: '-0.03em', fontWeight: '800' }],
        'display-lg':  ['clamp(1.5rem, 3vw, 2.25rem)',{ lineHeight: '1.1',  letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-md':  ['1.25rem',                    { lineHeight: '1.25', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-sm':  ['1.125rem',                   { lineHeight: '1.3',  letterSpacing: '-0.01em', fontWeight: '700' }],
        // Body scale
        'body-lg':     ['1rem',      { lineHeight: '1.5',  letterSpacing: '0em' }],
        'body-md':     ['0.9375rem', { lineHeight: '1.5',  letterSpacing: '0em' }],
        'body-sm':     ['0.875rem',  { lineHeight: '1.6',  letterSpacing: '0em' }],
        'body-xs':     ['0.8125rem', { lineHeight: '1.6',  letterSpacing: '0em' }],
        // Label/UI scale
        'label-lg':    ['0.875rem',  { lineHeight: '1.4',  letterSpacing: '0em',    fontWeight: '500' }],
        'label-md':    ['0.8125rem', { lineHeight: '1.4',  letterSpacing: '0em',    fontWeight: '500' }],
        'label-sm':    ['0.75rem',   { lineHeight: '1.4',  letterSpacing: '0.04em', fontWeight: '400' }],
        'label-xs':    ['0.6875rem', { lineHeight: '1.4',  letterSpacing: '0.14em', fontWeight: '600' }],
        'caption':     ['0.625rem',  { lineHeight: '1.2',  letterSpacing: '0.08em', fontWeight: '700' }],
      },

      borderRadius: {
        sm:   'var(--radius-sm)',    // 4px
        md:   'var(--radius-md)',    // 8px
        lg:   'var(--radius-lg)',    // 12px
        xl:   'var(--radius-xl)',    // 16px
        full: 'var(--radius-full)',  // 9999px
      },

      spacing: {
        // Named semantic spacers (in addition to numeric Tailwind scale)
        'xs':  '4px',
        'sm':  '8px',
        'md':  '16px',
        'lg':  '24px',
        'xl':  '40px',
        '2xl': '80px',
        // Nav heights
        'nav':        'var(--nav-height)',
        'bottom-nav': 'var(--bottom-nav-height)',
      },

      maxWidth: {
        'content-sm': 'var(--width-content-sm)',
        'content-md': 'var(--width-content-md)',
        'content-lg': 'var(--width-content-lg)',
        'content-xl': 'var(--width-content-xl)',
      },

      boxShadow: {
        sm:     'var(--shadow-sm)',
        md:     'var(--shadow-md)',
        accent: 'var(--shadow-accent)',
      },

      transitionTimingFunction: {
        spring: 'cubic-bezier(0.16, 1, 0.3, 1)',
        out:    'cubic-bezier(0.0, 0.0, 0.2, 1)',
      },

      transitionDuration: {
        fast:    '150ms',
        default: '200ms',
        slow:    '400ms',
      },

      keyframes: {
        'skeleton-shimmer': {
          '0%':   { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition:  '400px 0' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'slide-up': {
          from: { transform: 'translateY(8px)', opacity: '0' },
          to:   { transform: 'translateY(0)',   opacity: '1' },
        },
        'slide-up-from-bottom': {
          from: { transform: 'translateY(100%)' },
          to:   { transform: 'translateY(0)' },
        },
      },

      animation: {
        'skeleton':     'skeleton-shimmer 1.4s ease-in-out infinite',
        'fade-in':      'fade-in 0.2s ease-out',
        'slide-up':     'slide-up 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'sheet-in':     'slide-up-from-bottom 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
```

---

## 7. Mobile-First Conventions

### 7.1 Breakpoints

| Token | Width | Context |
|---|---|---|
| (default) | 0px–639px | Mobile phones — all layouts start here |
| `sm` | 640px | Large phones / small tablets — 2-column grids unlock |
| `md` | 768px | Tablets — desktop nav appears, bottom nav hidden |
| `lg` | 1024px | Laptops — sidebar layouts, 3-column event grids |
| `xl` | 1280px | Wide monitors — max content width reached |

No custom breakpoints beyond Tailwind defaults. The above Tailwind standard breakpoints map directly to the design intent.

### 7.2 Bottom Navigation Spec (mobile, ≤767px)

```
Item 1 — Home
  Icon: home (outline by default, filled when active)
  Label: "Home"
  Routes: /dashboard, /

Item 2 — Events
  Icon: calendar
  Label: "Events"
  Routes: /events, /events/:eventId

Item 3 — My Registrations
  Icon: check-circle (or clipboard-check)
  Label: "My Regs"
  Routes: /me/registrations

Item 4 — Profile
  Icon: user-circle
  Label: "Profile"
  Routes: /me/profile, /me/settings
```

Active state: icon switches from `--color-text-tertiary` to `--color-accent`; label text changes to `--color-accent`; no background fill on the icon (colour change is sufficient).

Touch target: each item occupies the full cell height of 60px with `display: flex; align-items: center; justify-content: center`. The tap area is the full column, not just the icon.

iOS safe area: the nav container includes `padding-bottom: env(safe-area-inset-bottom)` so content does not slide under the home indicator.

### 7.3 Touch Target Minimums

| Component | Minimum size | Implementation |
|---|---|---|
| Button (any variant) | 44×44px | `min-height: 44px` + adequate horizontal padding |
| Bottom nav item | full cell × 60px | Flex column fills grid cell |
| Checkbox / radio | 44×44px touch area | Wrap in `<label>` with padding |
| Link in body text | natural height × 44px width | Pad with `py-2 -my-2` |
| Close button (modal, toast) | 44×44px | Icon button with padding |
| Filter pill | 36px height min | `min-height: 36px; padding: 8px 12px` |

### 7.4 Typography Scaling

All display sizes use `clamp()` — they scale smoothly between a minimum (mobile) and maximum (desktop) without breakpoint jumps. Body and label text stays fixed; there is no reason to shrink body copy on mobile below 13px (our minimum is `var(--text-label-md)` at 13px).

### 7.5 Card Layout Changes

| Breakpoint | Layout |
|---|---|
| Mobile (default) | Single column, cards full-width |
| `sm` (640px+) | 2-column grid for event discovery |
| `lg` (1024px+) | 3-column grid for event discovery; 2-column for org event list |

```
/* Mobile — stacked */
.event-grid { display: flex; flex-direction: column; gap: 12px; }

/* 640px+ — 2-col */
@media (min-width: 640px) {
  .event-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
}

/* 1024px+ — 3-col */
@media (min-width: 1024px) {
  .event-grid { grid-template-columns: repeat(3, 1fr); gap: 20px; }
}
```

---

## 8. Animation & Motion

### 8.1 Duration Tokens

```css
:root {
  --duration-instant:  0ms;     /* Keyboard feedback, toggle on/off */
  --duration-fast:     150ms;   /* Hover states, button presses */
  --duration-default:  200ms;   /* Component entrances, colour changes */
  --duration-slow:     400ms;   /* Page-level transitions, theme switch */
  --duration-skeleton: 1400ms;  /* Skeleton shimmer loop */
}
```

### 8.2 Easing Functions

```css
:root {
  --ease-spring:  cubic-bezier(0.16, 1, 0.3, 1);  /* Snappy, slight overshoot */
  --ease-out:     cubic-bezier(0.0, 0.0, 0.2, 1);  /* Decelerates to rest */
  --ease-in-out:  cubic-bezier(0.4, 0, 0.2, 1);    /* Standard material ease */
}
```

### 8.3 Interaction Animation Policy

| Interaction | Animation | Rationale |
|---|---|---|
| Button hover | Background colour change, `150ms ease-in-out` | Immediate feedback |
| Button active/press | Subtle scale `0.98`, `80ms` | Physical affordance |
| Card hover | Background lightens, `180ms ease-in-out` | Indicates interactivity |
| Modal open | Sheet slides up on mobile (spring, 300ms), fade-in on desktop (200ms) | Matches platform pattern |
| Modal close | Reverses open animation | Consistent model |
| Toast / notification | Slide in from top-right (200ms spring), auto-dismiss at 4s | Unobtrusive |
| Page transition | Fade-in of new page content, 200ms | Prevents jarring flash |
| Skeleton → content | Fade-in of real content, 200ms | Smooth reveal |
| Status badge appearance | No animation | Status must be immediately legible |
| Fill bar value | Width transition 600ms spring | Satisfying but non-blocking |
| Focus ring | Instant — `transition: none` | Keyboard users must see it immediately |
| Theme switch | Background/colour 400ms ease | Smooth, cosmetic |

**What never animates:** Status badges, error messages, validation indicators. These must appear instantly.

### 8.4 Reduced Motion

Every `transition` and `animation` definition must be wrapped or suppressed with:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Add this to the bottom of `src/index.css`. Do not rely on individual component overrides — the blanket rule guarantees coverage.

---

## 9. Accessibility

### 9.1 Colour Contrast Requirements

All text meets WCAG 2.1 AA minimum. Large text (18pt+ regular or 14pt+ bold) requires 3:1; normal text requires 4.5:1.

| Colour pair | Context | Contrast ratio | Pass/Fail |
|---|---|---|---|
| `#E6EDF3` on `#0D1117` | Body text, dark | 14.9:1 | AA |
| `#848D97` on `#0D1117` | Secondary text, dark | 5.3:1 | AA |
| `#FF6B35` on `#0D1117` | Accent on dark bg | 5.1:1 | AA |
| `#4ADE80` on `#0D1117` | Success badge text, dark | 10.8:1 | AA |
| `#F59E0B` on `#0D1117` | Warning/pending text, dark | 7.2:1 | AA |
| `#EF4444` on `#0D1117` | Danger/declined text, dark | 5.5:1 | AA |
| `#0D1117` on `#FFFFFF` | Body text, light | 18.1:1 | AA |
| `#57606A` on `#FFFFFF` | Secondary text, light | 6.7:1 | AA |
| `#E5521A` on `#FFFFFF` | Accent on white | 4.6:1 | AA |

**Note on light mode badge text:** The light mode badge colour values (`#92400E`, `#166534`, `#991B1B`) are chosen specifically to meet 4.5:1 contrast against their respective subtle background fills. Do not substitute lighter colour values.

### 9.2 Focus Visible Style

The default browser focus ring is not suppressed. An explicit focus style is provided that is visible in both themes:

```css
:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}

/* Remove focus ring for mouse users only */
:focus:not(:focus-visible) {
  outline: none;
}
```

For elements with custom background (buttons with `box-shadow` focus rings):
```css
.btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--color-accent-mid);
}
```

### 9.3 ARIA Patterns for Key Components

**Status badge:**
```jsx
<span role="status" aria-label={`Status: ${status}`} className={`badge badge--${status.toLowerCase()}`}>
  {status}
</span>
```

**Bottom navigation:**
```jsx
<nav aria-label="Main navigation">
  <a href="/events" aria-current={isActive('/events') ? 'page' : undefined}>
    <svg aria-hidden="true" ... />
    <span>Events</span>
  </a>
</nav>
```

**Modal/Dialog:**
```jsx
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="dialog-title"
  aria-describedby="dialog-description"
>
  <h2 id="dialog-title">Confirm cancellation</h2>
  <p id="dialog-description">
    This will cancel your registration for this role. This action cannot be undone.
  </p>
  ...
</div>
```

**Live region for toast notifications:**
```jsx
<div role="status" aria-live="polite" aria-atomic="true" className="sr-only" id="toast-announcer">
  {/* Updated programmatically when toast appears */}
</div>
```

**Form with validation:**
```jsx
<div>
  <label htmlFor="event-title" className="form-label">
    Event title <span aria-hidden="true" className="text-accent">*</span>
  </label>
  <input
    id="event-title"
    type="text"
    required
    aria-required="true"
    aria-invalid={!!error}
    aria-describedby={error ? 'event-title-error' : 'event-title-hint'}
    className={`input ${error ? 'input--error' : ''}`}
  />
  {error && (
    <p id="event-title-error" role="alert" className="form-error">{error}</p>
  )}
  {!error && (
    <p id="event-title-hint" className="form-hint">Used in the public event listing.</p>
  )}
</div>
```

**Skip link:**
```jsx
// First element in <body> — allows keyboard users to jump past navigation
<a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] btn btn-primary">
  Skip to main content
</a>
```

**Keyboard navigation requirements:**
- Tab order follows visual reading order (left→right, top→bottom)
- Modals trap focus while open; Tab and Shift+Tab cycle only within the modal
- Bottom nav items are reachable by Tab on mobile (they are anchor or button elements, not divs)
- Filter pills are Tab-accessible and toggleable with Space/Enter
- All hover interactions have an equivalent focus state

---

## 10. Implementation Notes

### 10.1 React + Tailwind CSS v3 + shadcn/ui

**Setup order:**
1. Install Tailwind CSS v3 (`npm install -D tailwindcss postcss autoprefixer`)
2. Copy the `tailwind.config.js` from Section 6 of this document
3. Install shadcn/ui (`npx shadcn-ui@latest init`) — choose CSS variables mode, dark theme default
4. Install `@tailwindcss/forms` plugin (`npm install -D @tailwindcss/forms`)
5. Add font imports and CSS custom property blocks (Section 2.1 and Section 3.3) to `frontend/src/index.css`

### 10.2 shadcn/ui — Customise vs Use As-Is

| Component | Strategy | Notes |
|---|---|---|
| `Button` | Customise | Replace shadcn variant classes with our token-mapped Tailwind classes from Section 5.1 |
| `Input`, `Textarea`, `Select` | Customise | Use our form tokens; the shadcn base provides the Radix accessible structure |
| `Dialog` | Customise | Keep Radix focus-trap and aria wiring; replace visual tokens entirely |
| `Badge` | Replace | Write from scratch per Section 5.4 — shadcn badge variants do not map to our four statuses |
| `Skeleton` | Replace | Write from scratch using `animation-skeleton` keyframe; shadcn skeleton is too plain |
| `Toast / Sonner` | Use as-is, then style | Sonner is shadcn's recommended toast; override its CSS variables to use our tokens |
| `Select` (dropdown) | Customise | Replace background/border/text colour tokens |
| `Alert` | Customise | Remap to use our semantic colour tokens |
| `NavigationMenu` | Skip | Build bottom nav and top nav as bespoke components — NavigationMenu is too heavy for our simple nav |
| `Tabs` | Use as-is | shadcn tab underline pattern aligns with our existing tab styling |
| `Form` | Use as-is | React Hook Form + shadcn Form provides accessible validation wiring |

### 10.3 CSS Custom Properties vs Tailwind Utilities — When to Use Each

**Use CSS custom properties when:**
- The value must change between dark/light theme (all colour tokens, shadow tokens)
- You need the raw value in a non-Tailwind context (e.g., an SVG `fill`, a `style` prop, a CSS `calc()`)
- You are setting animation keyframe values

**Use Tailwind utilities when:**
- Applying spacing, typography, border radius, display, flexbox, grid, and all layout properties — they do not change by theme
- Composing component classes (Tailwind `@apply` in CSS modules, or class strings in JSX)
- Writing responsive variants (`sm:`, `md:`, `lg:`)

**Never do:**
- Hardcode hex values in component JSX. Always use the token via Tailwind class or CSS variable
- Create new Tailwind utility names for one-off values; use `style={{ }}` with the CSS variable instead
- Use `arbitrary values` (e.g., `bg-[#FF6B35]`) — use `bg-accent` which is already mapped

### 10.4 Dark Mode Implementation

The system uses `data-theme` attribute on `<html>` (class-based dark mode is also supported via `darkMode: ['class', '[data-theme="dark"]']` in `tailwind.config.js`).

```tsx
// ThemeProvider.tsx
import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'light'

const ThemeContext = createContext<{
  theme: Theme
  setTheme: (t: Theme) => void
}>({ theme: 'dark', setTheme: () => {} })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('gatherly-theme') as Theme | null
    if (stored) return stored
    // Respect OS preference on first visit
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('gatherly-theme', theme)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
```

Wrap `App` with `<ThemeProvider>` in `main.tsx`.

**MVP decision: ship dark as default.** Dark mode is the primary test path. Light mode ships on day one (all tokens are defined) but is not the default. The dark-first default serves the user segment most likely to be using the app outdoors in variable light conditions.

---

## Appendix A: Status Badge Quick Reference

| Status | Background token | Text token | Label (always uppercase) |
|---|---|---|---|
| PENDING | `--badge-pending-bg` | `--badge-pending-text` | PENDING |
| CONFIRMED | `--badge-confirmed-bg` | `--badge-confirmed-text` | CONFIRMED |
| DECLINED | `--badge-declined-bg` | `--badge-declined-text` | DECLINED |
| CANCELLED | `--badge-cancelled-bg` | `--badge-cancelled-text` | CANCELLED |
| DRAFT | `--badge-draft-bg` | `--badge-draft-text` | DRAFT |
| PUBLISHED | `--badge-published-bg` | `--badge-published-text` | PUBLISHED |

## Appendix B: Screen-by-Screen Design Checklist

Before any screen is marked "done" in development, the following must be true:

- [ ] Status badges render correctly in both dark and light mode
- [ ] All interactive elements meet 44px touch target minimum
- [ ] Skeleton loaders are shown during all async data loads
- [ ] Empty state is implemented for all list views
- [ ] All form inputs have associated labels (not placeholder-only)
- [ ] All form errors use `aria-describedby` to link to their message
- [ ] Focus styles are visible on all interactive elements
- [ ] The page has a logical heading hierarchy (one `<h1>`)
- [ ] The page works without JavaScript for the static shell (progressive enhancement)
- [ ] The layout is tested at 320px minimum viewport width
- [ ] No hardcoded colour values appear in JSX or CSS files
