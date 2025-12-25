/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "gemini-base": "var(--gemini-base)",
        "gemini-sidebar": "var(--gemini-sidebar)"
      }
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        light: {
          "primary": "#fff",
          "secondary": "#f9f9f9",
          "accent": "#1a73e8",
          "neutral": "#1f1f1f",
          "base-100": "#ffffff",
          "base-200": "#f0f4f8",
          "base-300": "#dfe3e7",
          "base-content": "#1f1f1f",
          "info": "#1a73e8",
          "success": "#1e8e3e",
          "warning": "#e37400",
          "error": "#d93025",
        },
        dark: {
          "primary": "#8ab4f8",
          "secondary": "#1e1f20",
          "accent": "#8ab4f8",
          "neutral": "#e3e3e3",
          "base-100": "#1d232b",
          "base-200": "#1f1f1f",
          "base-300": "#2d2e30",
          "base-content": "#e3e3e3",
          "info": "#8ab4f8",
          "success": "#81c995",
          "warning": "#fcad70",
          "error": "#f28b82",
        }
      },
    ],
  },
}
