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
    },
  },
  plugins: [],
};
