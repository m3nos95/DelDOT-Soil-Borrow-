import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#071525",
          900: "#0b2545",
          800: "#123056",
          700: "#1a3f6b",
          600: "#24548a",
        },
        deldot: {
          blue: "#0b5cab",
          gold: "#f27036",
          green: "#1f7a4d",
          amber: "#c47b17",
          orange: "#f27036",
        },
      },
      fontFamily: {
        sans: ["Public Sans", "Segoe UI", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(11, 37, 69, 0.06), 0 8px 24px rgba(11, 37, 69, 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
