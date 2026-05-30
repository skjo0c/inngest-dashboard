/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: {
          base: "#0f172a",
          subtle: "#1e293b",
          muted: "#334155",
        },
      },
    },
  },
  plugins: [],
};
