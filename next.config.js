/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.CLOUDFLARE_STATIC_EXPORT === 'true' ? 'export' : undefined,
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
}

module.exports = nextConfig
