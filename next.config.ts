import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compiler: {
    styledComponents: {
      displayName: true,  // adds component name to class: e.g. GlassCard-sc-abc123
      fileName: true,     // prepends filename: e.g. GlassCard__Wrapper-sc-abc123
    },
  },
  async redirects() {
    return [
      { source: "/superlative/most-games",       destination: "/stats/games",             permanent: true },
      { source: "/superlative/best-top4",        destination: "/stats/top4-rate",          permanent: true },
      { source: "/superlative/most-wins",        destination: "/stats/win-rate",           permanent: true },
      { source: "/superlative/most-time",        destination: "/stats/playtime",           permanent: true },
      { source: "/superlative/highest-lp",       destination: "/stats/highest-lp",         permanent: true },
      { source: "/superlative/best-lp-per-game", destination: "/stats/best-lp-per-game",   permanent: true },
    ];
  },
};

export default nextConfig;
