/** @type {import('next').NextConfig} */
const nextConfig = {
  rewrites: async () => {
    return [
      {
        source: "/api/:path*",
        destination:
          process.env.NEXT_PUBLIC_VERCEL_ENV
            ? `/api/`
            : `http://${process.env.NEXT_PUBLIC_LOCAL_ENDPOINT_URL}/api/:path*`,
      },
    ];
  },
  output: "standalone"
};

module.exports = nextConfig;