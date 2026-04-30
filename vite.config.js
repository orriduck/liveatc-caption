import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), vue()],
  server: {
    watch: {
      usePolling: true,
    },
    proxy: {
      "/api/proxy/metar": {
        target: "https://aviationweather.gov",
        changeOrigin: true,
        rewrite: (path) =>
          path.replace(
            /^\/api\/proxy\/metar\/([^/]+)$/,
            "/api/data/metar?ids=$1&format=json",
          ),
      },
      "/api/proxy/aircraft/positions": {
        target: "https://api.adsb.lol",
        changeOrigin: true,
        rewrite: (path) =>
          path.replace(
            /^\/api\/proxy\/aircraft\/positions\/([^/]+)\/([^/]+)\/([^/]+)$/,
            "/v2/lat/$1/lon/$2/dist/$3",
          ),
      },
      "/api/proxy/flight-routes/callsign": {
        // In dev, proxy to the Vercel serverless function running locally.
        // `vercel dev` will handle this; for plain `vite dev`, we fall back
        // to the production function at the deployed Vercel URL.
        // Change this target to 'http://localhost:3000' if running `vercel dev`.
        target: process.env.VERCEL_DEV
          ? "http://localhost:3000"
          : process.env.VITE_FLIGHT_ROUTE_PROXY || "https://adsbao.vercel.app",
        changeOrigin: true,
        rewrite: (path) =>
          path.replace(
            /^\/api\/proxy\/flight-routes\/callsign\/([^/]+)$/,
            "/api/proxy/flight-routes/callsign/$1",
          ),
      },
    },
  },
});
