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
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['"Hanken Grotesk"', 'system-ui', 'sans-serif'],
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
      },
      animation: {
        "fade-rise": "fade-rise 0.18s ease-out both",
        "fade-in": "fade-in 0.18s ease-out both",
      },
    },
  },
  plugins: [],
};
