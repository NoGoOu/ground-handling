import type { NextConfig } from "next";

// Schedule files can be large (a full network export); the import allows
// 25 MB, plus room for the multipart overhead. The proxy buffers request
// bodies up to its own limit and silently cuts the rest, so both are raised.
const UPLOAD_LIMIT = "26mb";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: UPLOAD_LIMIT },
    proxyClientMaxBodySize: UPLOAD_LIMIT,
  },
};

export default nextConfig;
