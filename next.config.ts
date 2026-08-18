import type { NextConfig } from "next";

import { withPayload } from "@payloadcms/next/withPayload";

const nextConfig: NextConfig = {
  // Pin the file-tracing root to THIS project. Without it Next walks up to a
  // stray parent lockfile and nests the output under .next/standalone/<dir>/.
  outputFileTracingRoot: import.meta.dirname,

  /**
   * Ship a self-contained server for the container image.
   *
   * Without this the runtime image needs the whole node_modules tree — for
   * this project roughly 1.4 GB, most of it build-time only. `standalone`
   * traces the modules actually reached at runtime and copies just those, so
   * the image is a fraction of the size and starts faster. It is also what
   * makes the Dockerfile's final stage able to skip `npm install` entirely.
   */
  output: "standalone",
};

export default withPayload(nextConfig, { devBundleServerPackages: false });
