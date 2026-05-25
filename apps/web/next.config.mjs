/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@karate/ui', '@karate/domain', '@karate/schemas', '@karate/db'],
};

export default nextConfig;
