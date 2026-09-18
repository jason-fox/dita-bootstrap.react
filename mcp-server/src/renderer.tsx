import { PRISM_THEME_CSS } from "./vendor/prism-theme";
import { BOOTSTRAP_ICONS_WOFF2_BASE64 } from "./vendor/bootstrap-icons-font";
import { BOOTSTRAP_BUNDLE_JS_BASE64 } from "./vendor/bootstrap-bundle-js";
import { CLIENT_BUNDLE_JS_BASE64 } from "./vendor/client-bundle";

const BOOTSTRAP_BUNDLE_JS = Buffer.from(BOOTSTRAP_BUNDLE_JS_BASE64, "base64").toString("utf-8");
const CLIENT_BUNDLE_JS = Buffer.from(CLIENT_BUNDLE_JS_BASE64, "base64").toString("utf-8");

// Static MCP App shell (registered once via registerAppResource, see index.ts). Topic content
// is rendered client-side in client-entry.tsx once the app connects and receives tool-result
// data - this shell carries no per-topic data itself.
export function renderAppShellHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>DITA Docs Topic Viewer</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
  <style>
    /* Self-hosted override: sandboxed MCP-UI hosts can block the cross-origin font fetch
       that the bootstrap-icons.min.css @font-face above depends on, leaving glyphs as tofu. */
    @font-face {
      font-family: "bootstrap-icons";
      src: url(data:font/woff2;base64,${BOOTSTRAP_ICONS_WOFF2_BASE64}) format("woff2");
    }
    ${PRISM_THEME_CSS}
    body { font-family: system-ui, -apple-system, sans-serif; background: transparent; }
    .shortdesc { font-weight: 400; color: var(--bs-secondary-color); }
    pre, pre.alert, pre.alert-secondary, pre.bg-light {
      background-color: #1e1e2e !important;
      color: #cdd6f4 !important;
      border: 1px solid #313244 !important;
      border-radius: 0.375rem !important;
      padding: 1rem !important;
      margin: 0.75rem 0 !important;
    }
    pre code {
      display: block;
      padding: 0 !important;
      border: none !important;
      border-radius: 0;
      background: transparent !important;
      color: inherit !important;
      white-space: pre;
    }
    .note { margin-top: 1rem; margin-bottom: 1rem; }
    .tabbed-dialog { border-bottom: 1px solid var(--bs-border-color); margin-bottom: 1rem; }
  </style>
</head>
<body class="p-2">
  <div id="mcp-ui-root" class="container-fluid">
    <div class="p-4 text-body-secondary">Loading…</div>
  </div>
  <script>
    // Host sandboxes give no devtools access, so a script error otherwise fails silently
    // into a dead, unstyled page with no signal why.
    window.addEventListener("error", function (e) {
      var root = document.getElementById("mcp-ui-root");
      if (root && !root.dataset.mcpUiErrorShown) {
        root.dataset.mcpUiErrorShown = "1";
        var banner = document.createElement("div");
        banner.className = "alert alert-danger m-3";
        banner.textContent = "Interactive rendering failed to load (" + e.message + ").";
        root.prepend(banner);
      }
    });
  </script>
  <script>${BOOTSTRAP_BUNDLE_JS}</script>
  <script>${CLIENT_BUNDLE_JS}</script>
</body>
</html>`;
}
