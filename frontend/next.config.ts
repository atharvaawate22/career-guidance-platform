import path from "path";
import type { NextConfig } from "next";

const frontendRoot = path.resolve(__dirname);

const nextConfig: NextConfig = {
  outputFileTracingRoot: frontendRoot,
  turbopack: {
    root: frontendRoot,
  },
};

export default nextConfig;
