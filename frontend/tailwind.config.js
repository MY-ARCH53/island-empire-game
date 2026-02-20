/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e0f7ff',
          100: '#b3ebff',
          200: '#80ddff',
          300: '#4dd0ff',
          400: '#26c5ff',
          500: '#00baff',
          600: '#00a8e6',
          700: '#0093cc',
          800: '#007fb3',
          900: '#005c80',
        },
        tropical: {
          cyan: '#22d3ee',
          blue: '#3b82f6',
          green: '#10b981',
          orange: '#f97316',
          yellow: '#fbbf24',
        }
      },
    },
  },
  plugins: [],
}