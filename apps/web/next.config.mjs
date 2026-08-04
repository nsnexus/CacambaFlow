/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@cacambaflow/ui', '@cacambaflow/types', '@cacambaflow/validation'],
  images: {
    remotePatterns: [
      {
        // Supabase Storage - substitua pela URL do seu projeto
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/sign/**',
      },
    ],
  },
};

export default nextConfig;
