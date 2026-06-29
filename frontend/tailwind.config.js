/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // CSS vars (RGB channels) so light/dark swap with no markup changes; <alpha-value> keeps /opacity modifiers working
        canvas: "rgb(var(--canvas) / <alpha-value>)", // warm paper ground
        paper: "rgb(var(--paper) / <alpha-value>)", // card / surface
        terracotta: "rgb(var(--terracotta) / <alpha-value>)", // primary — fired clay
        clay: "rgb(var(--clay) / <alpha-value>)", // deep clay — hovers, wordmark
        sage: "rgb(var(--sage) / <alpha-value>)", // secondary
        ochre: "rgb(var(--ochre) / <alpha-value>)", // pigment accent
        ink: "rgb(var(--ink) / <alpha-value>)", // sepia near-black text
        muted: "rgb(var(--muted) / <alpha-value>)", // secondary text
      },
      fontFamily: {
        // One grotesk throughout for a clean, modern dashboard feel; display = heavier weight.
        display: ['"Hanken Grotesk"', 'system-ui', 'sans-serif'],
        sans: ['"Hanken Grotesk"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        // Soft, layered elevation for light surfaces (dark mode leans on borders instead).
        card: "0 1px 2px rgb(15 23 42 / 0.04), 0 1px 3px rgb(15 23 42 / 0.06)",
        "card-hover": "0 4px 12px rgb(15 23 42 / 0.08), 0 2px 4px rgb(15 23 42 / 0.06)",
      },
      keyframes: {
        "fade-rise": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "toast-in": {
          "0%": { opacity: "0", transform: "translateY(-8px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
      animation: {
        "fade-rise": "fade-rise 0.18s ease-out both",
        "fade-in": "fade-in 0.18s ease-out both",
        "toast-in": "toast-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) both",
      },
    },
  },
  plugins: [],
};
