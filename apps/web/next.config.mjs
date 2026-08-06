/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@cacambaflow/ui', '@cacambaflow/types', '@cacambaflow/validation'],
  images: {
    remotePatterns: [
      {
        // Firebase Storage
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        pathname: '/v0/b/**',
      },
    ],
  },
};

export default nextConfig;
