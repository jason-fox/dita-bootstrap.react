const path = require("node:path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // don't let `next dev` overwrite this repo's own AGENTS.md/CLAUDE.md
  agentRules: false,
  // pin the workspace root: a stray ~/package-lock.json otherwise makes
  // Turbopack think the monorepo root is the home directory
  turbopack: {
    root: path.resolve(__dirname),
  },
  async redirects() {
    return [
      {
        source: "/docs",
        destination: "/",
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
