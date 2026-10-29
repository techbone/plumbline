import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native module and a bundled binary: load them from node_modules at runtime.
  serverExternalPackages: ["better-sqlite3", "ffmpeg-static"],
  output: "standalone",
};

export default nextConfig;
