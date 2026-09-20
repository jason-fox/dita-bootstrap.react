const path = require("node:path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // pin the workspace root: a stray ~/package-lock.json otherwise makes
  // Turbopack think the monorepo root is the home directory
  turbopack: {
    root: path.resolve(__dirname),
  },
};

module.exports = nextConfig;
