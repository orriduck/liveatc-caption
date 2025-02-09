/** @type {import('next').NextConfig} */
const nextConfig = {
  rewrites: async () => {
    return [
      {
        source: "/api/:path*",
        destination:
          process.env.VERCEL_ENV
            ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}/api/:path*`
            : `http://${process.env.NEXT_PUBLIC_LOCAL_ENDPOINT_URL}/api/:path*`,
      },
    ];
  },
  output: "standalone"
};

module.exports = nextConfig;