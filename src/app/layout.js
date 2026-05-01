/* eslint-disable @next/next/no-page-custom-font */
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "leaflet/dist/leaflet.css";
import "../style.css";

export const metadata = {
  title: "ADSBao",
  description:
    "Airport lookup, METAR context, and nearby aircraft overlays.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ThemeBootScript />
        <div className="min-h-screen bg-atc-bg text-atc-text">{children}</div>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

function ThemeBootScript() {
  const script = `
    (() => {
      const themes = new Set(["light", "dark", "system"]);
      const stored = window.localStorage.getItem("theme");
      const preference = themes.has(stored) ? stored : "system";
      const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.setAttribute(
        "data-theme",
        preference === "system" ? (systemDark ? "dark" : "light") : preference
      );
    })();
  `;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
