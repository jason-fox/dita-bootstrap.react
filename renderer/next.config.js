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
  async rewrites() {
    // Rewrites are disabled by default (OFF) for standard microservice/multi-container deployments.
    // Explicitly enable only when running in single-container all-in-one demo environments (ENABLE_PROXY_REWRITES=true).
    if (process.env.ENABLE_PROXY_REWRITES !== "true") {
      return [];
    }

    const apiBackend = process.env.INTERNAL_API_URL || "http://127.0.0.1:4000/api";
    const dataBackend = process.env.INTERNAL_DATA_URL || "http://127.0.0.1:4000/data";
    const mcpBackend = process.env.INTERNAL_MCP_URL || process.env.MCP_SERVER_URL || "http://127.0.0.1:4001/mcp";
    return [
      {
        source: "/api/:path*",
        destination: `${apiBackend}/:path*`,
      },
      {
        source: "/data/:path*",
        destination: `${dataBackend}/:path*`,
      },
      {
        source: "/mcp",
        destination: mcpBackend,
      },
      {
        source: "/mcp/:path*",
        destination: `${mcpBackend}/:path*`,
      },
      {
        source: "/viewer",
        destination: `${mcpBackend.replace(/\/mcp\/?$/, "")}/viewer`,
      },
    ];
  },
};

module.exports = nextConfig;
