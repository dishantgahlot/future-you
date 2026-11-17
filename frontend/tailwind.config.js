/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          light: 'hsl(var(--primary-light))',
          muted: 'hsl(var(--primary-muted))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        peach: {
          DEFAULT: 'hsl(var(--peach))',
          muted: 'hsl(var(--peach-muted))',
        },
        lavender: {
          DEFAULT: 'hsl(var(--lavender))',
          muted: 'hsl(var(--lavender-muted))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        leaf: {
          1: 'hsl(var(--leaf-1))',
          2: 'hsl(var(--leaf-2))',
          3: 'hsl(var(--leaf-3))',
          4: 'hsl(var(--leaf-4))',
          5: 'hsl(var(--leaf-5))',
          6: 'hsl(var(--leaf-6))',
          7: 'hsl(var(--leaf-7))',
          pill: 'hsl(var(--leaf-pill))',
          pillText: 'hsl(var(--leaf-pill-text))',
          darkText: 'hsl(var(--leaf-dark-text))',
        },
        botanical: {
          cream: 'hsl(var(--botanical-cream))',
          surface: 'hsl(var(--botanical-surface))',
          card: 'hsl(var(--botanical-card))',
          border: 'hsl(var(--botanical-border))',
          mutedText: 'hsl(var(--botanical-muted))',
          headerText: 'hsl(var(--botanical-header))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        xl: 'var(--radius-lg)',
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        serif: ['DM Serif Display', 'Georgia', 'serif'],
      },
      fontSize: {
        'display-xl': ['4rem', { lineHeight: '1.1', letterSpacing: '-0.03em' }],
        'display-lg': ['3rem', { lineHeight: '1.15', letterSpacing: '-0.025em' }],
        'display-md': ['2.25rem', { lineHeight: '1.2', letterSpacing: '-0.02em' }],
        'display-sm': ['1.75rem', { lineHeight: '1.25', letterSpacing: '-0.015em' }],
        'heading-xl': ['1.5rem', { lineHeight: '1.3', letterSpacing: '-0.01em' }],
        'heading-lg': ['1.25rem', { lineHeight: '1.35', letterSpacing: '-0.01em' }],
        'heading-md': ['1.125rem', { lineHeight: '1.4', letterSpacing: '-0.005em' }],
        'heading-sm': ['1rem', { lineHeight: '1.45' }],
        'body-lg': ['1.125rem', { lineHeight: '1.6' }],
        'body': ['1rem', { lineHeight: '1.6' }],
        'body-sm': ['0.875rem', { lineHeight: '1.55' }],
        'caption': ['0.75rem', { lineHeight: '1.5' }],
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '30': '7.5rem',
      },
      boxShadow: {
        'soft': '0 2px 8px -2px hsl(var(--primary) / 0.08), 0 4px 16px -4px hsl(var(--primary) / 0.06)',
        'card': '0 1px 3px hsl(var(--foreground) / 0.04), 0 4px 12px -2px hsl(var(--foreground) / 0.03)',
        'card-hover': '0 4px 20px -4px hsl(var(--primary) / 0.1), 0 8px 32px -8px hsl(var(--primary) / 0.08)',
        'elevated': '0 8px 32px -8px hsl(var(--foreground) / 0.08), 0 16px 48px -16px hsl(var(--foreground) / 0.06)',
      },
      transitionDuration: {
        '200': '200ms',
        '300': '300ms',
        '400': '400ms',
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'ease-out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
}