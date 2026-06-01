/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx,css}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Backgrounds ──────────────────────────────
        darkBg:    '#0a0800',               // pure black-amber base
        deepBg:    '#12100a',               // rich dark panel
        surfaceBg: '#1a1503',               // elevated card surface
        glassBg:   'rgba(18, 14, 2, 0.65)', // glass overlay
        glassBorder: 'rgba(212, 175, 55, 0.12)', // gold border tint

        // ── Gold Accent Palette ───────────────────────
        gold:       '#d4af37',   // classic gold        — primary CTA
        goldDeep:   '#b48c1e',   // antique gold        — secondary
        goldBright: '#ffd750',   // bright gold         — highlights
        goldCopper: '#d4783c',   // burnt copper        — warm accent
        goldSage:   '#a0c850',   // olive gold          — success/green
        goldCream:  '#f5e6c8',   // warm ivory          — text primary

        // ── Text Hierarchy ────────────────────────────
        textPrimary:   '#f5e6c8',                  // warm ivory
        textSecondary: 'rgba(245, 220, 150, 0.70)', // muted gold
        textMuted:     'rgba(200, 175, 100, 0.45)', // faint gold hint

        // ── Light Theme ───────────────────────────────
        creamBg:   '#fdf8ee',   // warm cream base
        creamDeep: '#fffdf5',   // pure cream surface
      },

      fontFamily: {
        sans:    ['"Plus Jakarta Sans"', 'sans-serif'],
        display: ['"Space Grotesk"', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },

      backdropBlur: {
        xs: '2px',
        sm: '8px',
        md: '16px',
        lg: '32px',
      },

      boxShadow: {
        // ── Per-accent glow shadows ───────────────────
        'glow-gold':    '0 0 20px rgba(212, 175, 55, 0.50)',
        'glow-deep':    '0 0 20px rgba(180, 140, 30, 0.45)',
        'glow-bright':  '0 0 20px rgba(255, 215, 80, 0.48)',
        'glow-copper':  '0 0 20px rgba(212, 120, 60, 0.45)',
        'glow-sage':    '0 0 20px rgba(160, 200, 80, 0.42)',

        // ── Intensity variants ────────────────────────
        'glow-gold-sm': '0 0 8px  rgba(212, 175, 55, 0.35)',
        'glow-gold-lg': '0 0 40px rgba(212, 175, 55, 0.60)',

        // ── Utility ───────────────────────────────────
        'glass':      '0 8px  32px 0 rgba(0, 0, 0, 0.55)',
        'glass-lg':   '0 16px 48px 0 rgba(0, 0, 0, 0.65)',
        'glass-hover':'0 20px 50px 0 rgba(212, 175, 55, 0.14)',
        'inner-glow': 'inset 0 0 24px rgba(212, 175, 55, 0.10)',
      },

      backgroundImage: {
        // ── Gold mesh gradients ───────────────────────
        'gold-radial':  'radial-gradient(ellipse at 20% 50%, rgba(212,175,55,0.18) 0%, transparent 60%)',
        'copper-radial':'radial-gradient(ellipse at 80% 20%, rgba(212,120,60,0.14) 0%, transparent 55%)',
        'sage-radial':  'radial-gradient(ellipse at 60% 80%, rgba(160,200,80,0.13) 0%, transparent 55%)',

        // ── Full ambient background ───────────────────
        'gold-full': `
          radial-gradient(circle at 15% 15%, rgba(212,175,55,0.14) 0%, transparent 48%),
          radial-gradient(circle at 85% 80%, rgba(180,130,20,0.12) 0%, transparent 48%),
          radial-gradient(circle at 50% 50%, rgba(255,215,80,0.06) 0%, transparent 55%),
          radial-gradient(circle at 75% 20%, rgba(200,160,40,0.10) 0%, transparent 42%)
        `,

        // ── Light theme ambient ───────────────────────
        'cream-full': `
          radial-gradient(circle at 15% 15%, rgba(212,175,55,0.10) 0%, transparent 45%),
          radial-gradient(circle at 85% 85%, rgba(180,130,20,0.08) 0%, transparent 45%),
          radial-gradient(circle at 70% 20%, rgba(200,160,40,0.07) 0%, transparent 40%)
        `,

        // ── Card surface ──────────────────────────────
        'card-surface': 'linear-gradient(135deg, rgba(212,175,55,0.06) 0%, rgba(212,175,55,0.01) 100%)',

        // ── Shimmer for loading states ────────────────
        'shimmer-gold': 'linear-gradient(90deg, transparent 0%, rgba(212,175,55,0.15) 50%, transparent 100%)',
      },

      animation: {
        'float':       'float 7s ease-in-out infinite',
        'glow-gold':   'glowGold 2s ease-in-out infinite alternate',
        'glow-pulse':  'glowPulse 2.5s ease-in-out infinite',
        'shimmer':     'shimmer 2s linear infinite',
        'gold-drift':  'goldDrift 12s ease-in-out infinite alternate',
        'fade-up':     'fadeUp 0.6s ease-out forwards',
        'pulse-slow':  'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },

      keyframes: {
        glowGold: {
          '0%':   { boxShadow: '0 0 5px  rgba(212, 175, 55, 0.22)' },
          '100%': { boxShadow: '0 0 24px rgba(212, 175, 55, 0.70)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)'   },
          '50%':      { transform: 'translateY(-12px)' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.65', transform: 'scale(1)'    },
          '50%':      { opacity: '1',    transform: 'scale(1.03)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition:  '200% center' },
        },
        goldDrift: {
          '0%':   { backgroundPosition: '0%   50%' },
          '100%': { backgroundPosition: '100% 50%' },
        },
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)'    },
        },
      },
    },
  },
  plugins: [],
}