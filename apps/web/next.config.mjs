/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.clerk.com",
      },
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    // Opciones experimentales si se necesitan
  },
};

export default nextConfig;
