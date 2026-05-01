import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compiler: {
    styledComponents: {
      displayName: true,  // adds component name to class: e.g. GlassCard-sc-abc123
      fileName: true,     // prepends filename: e.g. GlassCard__Wrapper-sc-abc123
    },
  },
};

export default nextConfig;
