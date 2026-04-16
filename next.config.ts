import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  reactCompiler: true,
  typedRoutes: true,
  serverExternalPackages: ["@duckdb/node-api"],
  logging: {
    browserToTerminal: true,
  },
};

export default nextConfig;
