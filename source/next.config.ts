import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/hvac-field-calculator",
  assetPrefix: "/hvac-field-calculator",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
