/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Google Sans Flex"', '"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"Google Sans Code"', '"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
