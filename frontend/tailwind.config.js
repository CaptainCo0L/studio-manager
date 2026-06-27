/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#f3ecdf", // warm paper ground
        paper: "#fffdf8", // card / surface
        terracotta: "#bd5b3d", // primary — fired clay
        clay: "#8f3f28", // deep clay — hovers, wordmark
        sage: "#7e8b68", // secondary
        ochre: "#d9a04e", // pigment accent
        ink: "#2b2521", // sepia near-black text
        muted: "#6f6557", // secondary text
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
