import type { NextConfig } from "next";

import { withPayload } from "@payloadcms/next/withPayload";

const nextConfig: NextConfig = {
  // Pin the file-tracing root to THIS project. Without it Next walks up to a
  // stray parent lockfile and nests the output under .next/standalone/<dir>/.
  outputFileTracingRoot: import.meta.dirname,
};

export default withPayload(nextConfig, { devBundleServerPackages: false });
