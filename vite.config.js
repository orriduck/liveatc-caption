import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), vue()],
  server: {
    watch: {
      usePolling: true
    },
    proxy: {
      '/api/proxy/metar': {
        target: 'https://aviationweather.gov',
        changeOrigin: true,
        rewrite: (path) => path.replace(
          /^\/api\/proxy\/metar\/([^/]+)$/,
          '/api/data/metar?ids=$1&format=json',
        ),
      },
      '/api/proxy/aircraft/positions': {
        target: 'https://api.adsb.lol',
        changeOrigin: true,
        rewrite: (path) => path.replace(
          /^\/api\/proxy\/aircraft\/positions\/([^/]+)\/([^/]+)\/([^/]+)$/,
          '/v2/lat/$1/lon/$2/dist/$3',
        ),
      },
      '/api/proxy/flight-routes/callsign': {
        target: 'https://api.adsbdb.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(
          /^\/api\/proxy\/flight-routes\/callsign\/([^/]+)$/,
          '/v0/callsign/$1',
        ),
      },
    }
  }
})
