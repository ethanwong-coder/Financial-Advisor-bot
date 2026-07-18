/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // No ESLint config is bundled in this MVP; don't fail `next build` on lint.
  // Type-checking stays ON.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
