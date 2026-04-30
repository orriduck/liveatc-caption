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
    <html lang="en" data-theme="dark" suppressHydrationWarning>
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
