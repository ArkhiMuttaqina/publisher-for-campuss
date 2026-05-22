/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: true,
  serverActions: {
    bodySizeLimit: "50mb",
  },
};

export default nextConfig;
