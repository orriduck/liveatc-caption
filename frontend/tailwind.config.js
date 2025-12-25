/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "gemini-base": "#f0f4f8",
        "gemini-sidebar": "#E9EEF6"
      }
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        light: {
          "primary": "#1a73e8",
          "secondary": "#e8f0fe",
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
          "secondary": "#131314",
          "accent": "#8ab4f8",
          "neutral": "#e3e3e3",
          "base-100": "#131314",
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
