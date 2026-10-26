import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@empresa/ui", "@empresa/auth"],
};

export default nextConfig;
