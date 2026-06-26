/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#faf6f0", // warm canvas
        terracotta: "#c06e52",
        sage: "#8a9a7b",
        ink: "#3a342f",
      },
    },
  },
  plugins: [],
};
