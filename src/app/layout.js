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
      <body>
        <div className="min-h-screen bg-atc-bg text-atc-text">{children}</div>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
