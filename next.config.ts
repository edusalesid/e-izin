import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'infosmait.ihsanulfikri.sch.id',
        port: '',
        pathname: '/**',
      },
    ],
  },
  transpilePackages: ['motion'],
  async redirects() {
    return [
      {
        source: '/wali',
        destination: '/',
        permanent: true,
      },
      {
        source: '/wali-santri/:path*',
        destination: '/',
        permanent: true,
      },
      {
        source: '/petugas',
        destination: '/',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
