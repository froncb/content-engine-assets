import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      colors: {
        ink: {
          50: "#f7f7f8",
          100: "#ececef",
          200: "#d4d4dc",
          300: "#a6a6b3",
          400: "#6e6e7f",
          500: "#4a4a5a",
          600: "#34343f",
          700: "#23232c",
          800: "#16161c",
          900: "#0b0b10",
        },
        accent: {
          DEFAULT: "#a5f3a0",
          dim: "#7fc97c",
        },
      },
    },
  },
  plugins: [],
};

export default config;
