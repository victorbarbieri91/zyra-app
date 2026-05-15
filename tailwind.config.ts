import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // Paleta Zyra Legal - Teal/Aqua + Slate
        teal: {
          50: '#f0f9f9',
          100: '#cbe2e2',
          200: '#aacfd0',
          300: '#89bcbe',
          400: '#6ba9ab',
          500: '#4d9698',
          600: '#3d7879',
          700: '#2e5a5b',
          800: '#1f3c3d',
          900: '#0f1e1f',
        },
        slate: {
          50: '#f8f9fa',
          100: '#e9ecef',
          200: '#dee2e6',
          300: '#ced4da',
          400: '#adb5bd',
          500: '#6c757d',
          600: '#46627f',
          700: '#34495e',
          800: '#2c3e50',
          900: '#1a252f',
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        surface: {
          0: "hsl(var(--surface-0))",
          1: "hsl(var(--surface-1))",
          2: "hsl(var(--surface-2))",
          3: "hsl(var(--surface-3))",
        },
        // ─── Paleta WARM (novo dashboard) ───────────────────────
        // Coexiste com slate. Usar via classes: bg-page-warm, bg-rail,
        // bg-card-warm, border-warm, border-warm-subtle, text-ink,
        // text-warm-primary, text-warm-secondary, text-warm-muted.
        "page-warm": "hsl(var(--page-warm))",
        rail: "hsl(var(--rail))",
        "card-warm": "hsl(var(--card-warm))",
        "border-warm": "hsl(var(--border-warm))",
        "border-warm-subtle": "hsl(var(--border-warm-subtle))",
        ink: "hsl(var(--text-ink))",
        "warm-primary": "hsl(var(--text-warm-primary))",
        "warm-secondary": "hsl(var(--text-warm-secondary))",
        "warm-muted": "hsl(var(--text-warm-muted))",
        "rail-bar-inactive": "hsl(var(--rail-bar-inactive))",
        "rail-divider": "hsl(var(--rail-divider))",
        // ─── Cores semânticas MUTED ─────────────────────────────
        // sage/sand/brick/slate-blue. Use {state}-{bg,fg} para
        // backgrounds e foregrounds de contraste.
        "state-success": "hsl(var(--state-success))",
        "state-success-bg": "hsl(var(--state-success-bg))",
        "state-success-fg": "hsl(var(--state-success-fg))",
        "state-warning": "hsl(var(--state-warning))",
        "state-warning-bg": "hsl(var(--state-warning-bg))",
        "state-warning-fg": "hsl(var(--state-warning-fg))",
        "state-danger": "hsl(var(--state-danger))",
        "state-danger-bg": "hsl(var(--state-danger-bg))",
        "state-danger-fg": "hsl(var(--state-danger-fg))",
        "state-info": "hsl(var(--state-info))",
        "state-info-bg": "hsl(var(--state-info-bg))",
        "state-info-fg": "hsl(var(--state-info-fg))",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui"],
        serif: ["var(--font-fraunces)", "Georgia", "serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
