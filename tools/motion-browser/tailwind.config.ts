import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

/**
 * Tailwind theme mapping for tokens extracted from Figma.
 * Colors reference CSS custom properties defined in ./src/styles/tokens.css
 * so a single source of truth drives both raw utilities and shadcn/ui components.
 */
const config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: "var(--font-family-sans)",
      },
      colors: {
        // shadcn/ui semantic
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
          light: "var(--color-primary-light)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",

        // raw Figma primitives (escape hatch)
        info: {
          dark: "var(--color-info-dark)",
        },
        grey: {
          200: "var(--color-grey-200)",
          300: "var(--color-grey-300)",
          500: "var(--color-grey-500)",
          600: "var(--color-grey-600)",
          800: "var(--color-grey-800)",
          900: "var(--color-grey-900)",
        },
        neutral: {
          700: "var(--color-neutral-700)",
          900: "var(--color-neutral-900)",
        },
        common: {
          white: "var(--color-common-white)",
          black: "var(--color-common-black)",
        },
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        lg: "var(--radius-lg)",
        full: "var(--radius-full)",
      },
      fontSize: {
        h4: [
          "var(--font-h4-size)",
          { lineHeight: "var(--font-h4-line)", fontWeight: "700" },
        ],
        h6: [
          "var(--font-h6-size)",
          { lineHeight: "var(--font-h6-line)", fontWeight: "600" },
        ],
        body2: [
          "var(--font-body2-size)",
          { lineHeight: "var(--font-body2-line)", fontWeight: "400" },
        ],
        caption: [
          "var(--font-caption-size)",
          { lineHeight: "var(--font-caption-line)", fontWeight: "400" },
        ],
        "button-medium": [
          "var(--font-button-medium-size)",
          { lineHeight: "var(--font-button-medium-line)", fontWeight: "500" },
        ],
        "button-small": [
          "var(--font-button-small-size)",
          { lineHeight: "var(--font-button-small-line)", fontWeight: "500" },
        ],
        "input-label": [
          "var(--font-input-label-size)",
          { lineHeight: "var(--font-input-label-line)", fontWeight: "600" },
        ],
      },
      boxShadow: {
        card: "var(--shadow-card)",
        dropdown: "var(--shadow-dropdown)",
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
  plugins: [tailwindcssAnimate],
} satisfies Config;

export default config;
