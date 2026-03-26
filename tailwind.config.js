/** @type {import('tailwindcss').Config} */
module.exports = {
  // Supports both class-based dark mode and data-theme attribute
  darkMode: ['class', '[data-theme="dark"]'],

  content: [
    './frontend/src/**/*.{js,ts,jsx,tsx}',
    './frontend/index.html',
  ],

  theme: {
    extend: {

      // ─── COLOURS ──────────────────────────────────────────────────────────
      //
      // All colour values reference CSS custom properties defined in
      // frontend/src/index.css. This means:
      //   - Dark / light themes work by swapping --color-* variable values
      //   - No Tailwind dark: variant is needed for most colour utilities
      //   - You can always use `var(--color-*)` in a `style` prop if needed
      //
      colors: {

        // Background layers
        bg:       'var(--color-bg)',
        surface:  'var(--color-surface)',
        raised:   'var(--color-raised)',
        overlay:  'var(--color-overlay)',

        // Brand accent — Ember orange
        accent: {
          DEFAULT: 'var(--color-accent)',
          dim:     'var(--color-accent-dim)',
          subtle:  'var(--color-accent-subtle)',
          mid:     'var(--color-accent-mid)',
        },

        // Text hierarchy
        'text-primary':   'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-tertiary':  'var(--color-text-tertiary)',
        'text-disabled':  'var(--color-text-disabled)',
        'text-inverse':   'var(--color-text-inverse)',

        // Border tiers
        border: {
          DEFAULT: 'var(--color-border)',
          mid:     'var(--color-border-mid)',
          strong:  'var(--color-border-strong)',
        },

        // Semantic colours
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

        // Status badge surface colours
        // Usage: bg-badge-pending text-badge-pending-text etc.
        badge: {
          'pending-bg':         'var(--badge-pending-bg)',
          'pending-border':     'var(--badge-pending-border)',
          'pending-text':       'var(--badge-pending-text)',

          'confirmed-bg':       'var(--badge-confirmed-bg)',
          'confirmed-border':   'var(--badge-confirmed-border)',
          'confirmed-text':     'var(--badge-confirmed-text)',

          'declined-bg':        'var(--badge-declined-bg)',
          'declined-border':    'var(--badge-declined-border)',
          'declined-text':      'var(--badge-declined-text)',

          'cancelled-bg':       'var(--badge-cancelled-bg)',
          'cancelled-border':   'var(--badge-cancelled-border)',
          'cancelled-text':     'var(--badge-cancelled-text)',

          'draft-bg':           'var(--badge-draft-bg)',
          'draft-border':       'var(--badge-draft-border)',
          'draft-text':         'var(--badge-draft-text)',

          'published-bg':       'var(--badge-published-bg)',
          'published-border':   'var(--badge-published-border)',
          'published-text':     'var(--badge-published-text)',
        },
      },

      // ─── TYPOGRAPHY ───────────────────────────────────────────────────────

      fontFamily: {
        // Plus Jakarta Sans — display headings, card titles, large numerals
        display: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        // Inter — all body copy, labels, form inputs, nav, badges
        body:    ['Inter', 'system-ui', 'sans-serif'],
        // Override Tailwind's default `font-sans` so shadcn/ui components
        // inherit the body font automatically
        sans:    ['Inter', 'system-ui', 'sans-serif'],
      },

      fontSize: {
        // Display scale — use font-display class alongside these sizes
        'display-2xl': ['clamp(3rem, 8vw, 6rem)',     { lineHeight: '1.0',  letterSpacing: '-0.04em', fontWeight: '900' }],
        'display-xl':  ['clamp(2rem, 5vw, 3.5rem)',    { lineHeight: '1.05', letterSpacing: '-0.03em', fontWeight: '800' }],
        'display-lg':  ['clamp(1.5rem, 3vw, 2.25rem)', { lineHeight: '1.1',  letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-md':  ['1.25rem',                     { lineHeight: '1.25', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-sm':  ['1.125rem',                    { lineHeight: '1.3',  letterSpacing: '-0.01em', fontWeight: '700' }],

        // Body scale — use font-body or font-sans (same font)
        'body-lg':     ['1rem',       { lineHeight: '1.5',  letterSpacing: '0em'    }],
        'body-md':     ['0.9375rem',  { lineHeight: '1.5',  letterSpacing: '0em'    }],
        'body-sm':     ['0.875rem',   { lineHeight: '1.6',  letterSpacing: '0em'    }],
        'body-xs':     ['0.8125rem',  { lineHeight: '1.6',  letterSpacing: '0em'    }],

        // Label / UI chrome scale
        'label-lg':    ['0.875rem',   { lineHeight: '1.4',  letterSpacing: '0em',    fontWeight: '500' }],
        'label-md':    ['0.8125rem',  { lineHeight: '1.4',  letterSpacing: '0em',    fontWeight: '500' }],
        'label-sm':    ['0.75rem',    { lineHeight: '1.4',  letterSpacing: '0.04em', fontWeight: '400' }],
        'label-xs':    ['0.6875rem',  { lineHeight: '1.4',  letterSpacing: '0.14em', fontWeight: '600' }],

        // Caption — badge text, legal, overlines
        'caption':     ['0.625rem',   { lineHeight: '1.2',  letterSpacing: '0.08em', fontWeight: '700' }],
      },

      // ─── BORDER RADIUS ────────────────────────────────────────────────────

      borderRadius: {
        // Overrides and extends Tailwind's radius scale
        sm:   'var(--radius-sm)',    // 4px  — badges, table cells, small chips
        md:   'var(--radius-md)',    // 8px  — inputs, buttons, small cards
        lg:   'var(--radius-lg)',    // 12px — event cards, panels, containers
        xl:   'var(--radius-xl)',    // 16px — modals, large cards
        full: 'var(--radius-full)',  // 9999px — avatars, pill filter chips
      },

      // ─── SPACING ──────────────────────────────────────────────────────────
      //
      // Extends (does not replace) Tailwind's numeric spacing scale.
      // Use named tokens for semantic spacers; use numeric scale (4, 6, 8 etc.)
      // for density tuning.
      //
      spacing: {
        // Named semantic spacers
        xs:   '4px',   // icon gap, tight badge padding
        sm:   '8px',   // inline element gap, compact padding
        md:   '16px',  // card inner padding (mobile), form row gap
        lg:   '24px',  // card inner padding (desktop), section gap
        xl:   '40px',  // section vertical padding (mobile)
        '2xl': '80px', // section vertical padding (desktop)

        // Persistent layout heights (useful for sticky positioning)
        nav:         'var(--nav-height)',          // 56px
        'bottom-nav': 'var(--bottom-nav-height)',  // 60px
      },

      // ─── MAX WIDTHS ───────────────────────────────────────────────────────

      maxWidth: {
        'content-sm': 'var(--width-content-sm)',   // 640px  — auth, narrow forms
        'content-md': 'var(--width-content-md)',   // 768px  — detail pages
        'content-lg': 'var(--width-content-lg)',   // 1024px — dashboards, feeds
        'content-xl': 'var(--width-content-xl)',   // 1280px — admin full-bleed
      },

      // ─── SHADOWS ──────────────────────────────────────────────────────────

      boxShadow: {
        sm:     'var(--shadow-sm)',
        md:     'var(--shadow-md)',
        accent: 'var(--shadow-accent)',  // 3px ring in accent/50 — for focus
      },

      // ─── TRANSITIONS & EASING ─────────────────────────────────────────────

      transitionTimingFunction: {
        spring: 'cubic-bezier(0.16, 1, 0.3, 1)',  // Snappy with slight overshoot
        out:    'cubic-bezier(0.0, 0.0, 0.2, 1)',  // Decelerates cleanly
      },

      transitionDuration: {
        fast:    '150ms',   // Hover states, button presses
        DEFAULT: '200ms',   // Component entrances, colour changes (Tailwind default)
        slow:    '400ms',   // Page-level, theme switch
      },

      // ─── KEYFRAMES & ANIMATIONS ───────────────────────────────────────────

      keyframes: {
        // Skeleton loader shimmer — always-running background sweep
        'skeleton-shimmer': {
          '0%':   { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition:  '400px 0' },
        },

        // General fade-in — skeleton → content, page entry
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },

        // Slide up — card and list item entry
        'slide-up': {
          from: { transform: 'translateY(8px)', opacity: '0' },
          to:   { transform: 'translateY(0)',   opacity: '1' },
        },

        // Bottom sheet — mobile modal entry
        'sheet-in': {
          from: { transform: 'translateY(100%)' },
          to:   { transform: 'translateY(0)' },
        },

        // Toast / notification — slide in from top-right
        'toast-in': {
          from: { transform: 'translateX(100%)', opacity: '0' },
          to:   { transform: 'translateX(0)',    opacity: '1' },
        },
      },

      animation: {
        'skeleton':    'skeleton-shimmer 1.4s ease-in-out infinite',
        'fade-in':     'fade-in 0.2s ease-out both',
        'slide-up':    'slide-up 0.2s cubic-bezier(0.16, 1, 0.3, 1) both',
        'sheet-in':    'sheet-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) both',
        'toast-in':    'toast-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) both',
      },

      // ─── Z-INDEX SCALE ────────────────────────────────────────────────────
      //
      // Named z-index values to prevent collision. Extend Tailwind's
      // default numeric values with semantic names.
      //
      zIndex: {
        nav:         '100',   // Top navigation bar
        'bottom-nav': '200',  // Mobile bottom nav (above content, below modals)
        modal:       '500',   // Modal dialogs
        toast:       '600',   // Toast notifications (above modals)
        skip:        '9999',  // Skip-to-content link
      },

    }, // end theme.extend
  }, // end theme

  plugins: [
    // Provides better form control styling reset that works with our tokens
    require('@tailwindcss/forms'),
  ],
}
