/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#f6f7f9",
          100: "#eceff3",
          200: "#d5dbe3",
          300: "#aeb8c6",
          400: "#7d8ba0",
          500: "#5b6b81",
          600: "#475567",
          700: "#3a4554",
          800: "#1f2632",
          900: "#0f141d",
          950: "#070a10",
        },
        accent: {
          400: "#22d3ee",
          500: "#06b6d4",
          600: "#0891b2",
        },
        pulse: {
          400: "#f97316",
          500: "#ef4444",
          600: "#dc2626",
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
