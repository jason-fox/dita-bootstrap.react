// Bundles the MCP server entry into a single CommonJS file; dependencies stay external
// (installed at runtime) while local sources and the vendored client bundle are inlined.
import esbuild from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

await esbuild.build({
  entryPoints: [path.join(root, "src/server/index.ts")],
  outfile: path.join(root, "dist/index.js"),
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node22",
  packages: "external",
  sourcemap: true,
  banner: { js: "#!/usr/bin/env node" },
});

console.log("Wrote dist/index.js");
