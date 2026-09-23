import fs from "node:fs";
import { PRISM_THEME_CSS } from "./vendor/prism-theme";
import { DITA_STYLES_CSS } from "./vendor/dita-styles";
import { BOOTSTRAP_ICONS_WOFF2_BASE64 } from "./vendor/bootstrap-icons-font";
import { BOOTSTRAP_BUNDLE_JS_BASE64 } from "./vendor/bootstrap-bundle-js";
import { CLIENT_BUNDLE_JS_BASE64 } from "./vendor/client-bundle";

const BOOTSTRAP_BUNDLE_JS = Buffer.from(BOOTSTRAP_BUNDLE_JS_BASE64, "base64").toString("utf-8");
const CLIENT_BUNDLE_JS = Buffer.from(CLIENT_BUNDLE_JS_BASE64, "base64").toString("utf-8");

const DARK_ONLY_THEMES = new Set([
  "cyborg",
  "darkly",
  "slate",
  "solar",
  "superhero",
  "vapor",
]);

// Helper to resolve custom CSS injection with explicit null check
function getCustomCssElement(): string {
  const customCssPath = (process.env.CUSTOM_CSS_PATH ?? "").trim();
  // Null check: default is add nothing
  if (!customCssPath) {
    return "";
  }

  // If customCssPath is a local file, inline its contents
  if (fs.existsSync(customCssPath)) {
    try {
      const content = fs.readFileSync(customCssPath, "utf-8");
      return `<style>/* CUSTOM_CSS_PATH */\n${content}\n</style>`;
    } catch {
      // Return empty if reading fails
      return "";
    }
  }

  // Otherwise, render as a stylesheet link
  return `<link rel="stylesheet" href="${customCssPath}">`;
}

// Static MCP App shell (registered via registerAppResource in index.ts) - carries no per-topic
// data itself, since client-entry.tsx fills it in once the app connects and gets a tool result.
export function renderAppShellHtml(themeOverride?: string, langOverride?: string): string {
  const rawTheme = (themeOverride || process.env.BOOTSTRAP_THEME || "default").trim();
  const themeName = rawTheme.toLowerCase();
  const isDarkOnly = DARK_ONLY_THEMES.has(themeName);
  const useBootswatch = themeName !== "" && themeName !== "default" && themeName !== "none";

  const defaultLang = (process.env.DEFAULT_LANGUAGE || "en").trim();
  const lang = (langOverride || defaultLang).trim() || "en";

  const navTextRaw = (process.env.NAVBAR_TEXT || process.env.NAVBAR_COLOR_SCHEME || "dark").trim();
  const navThemeRaw = (process.env.NAVBAR_THEME || process.env.NAVBAR_BG_COLOR || "dark").trim();
  const textVal = navTextRaw.replace(/^navbar-/, "");
  const navColorScheme = `navbar-${textVal}`;
  const navBgColor = navThemeRaw.startsWith("bg-") ? navThemeRaw : `bg-${navThemeRaw}`;

  const bootstrapCssUrl = useBootswatch
    ? `https://cdn.jsdelivr.net/npm/bootswatch@5.3.3/dist/${themeName}/bootstrap.min.css`
    : "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css";

  const darkAttr = isDarkOnly ? ' data-bs-theme="dark"' : '';
  const customCssElement = getCustomCssElement();

  return `<!DOCTYPE html>
<html lang="${lang}"${darkAttr}>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>DITA Docs Topic Viewer</title>
  <script>
    if (typeof process === "undefined") {
      window.process = { env: { NODE_ENV: "production" } };
    }
  </script>
  <link rel="stylesheet" href="${bootstrapCssUrl}">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
  ${customCssElement}
  <style>
    /* Self-hosted override: sandboxed MCP-UI hosts can block the cross-origin font fetch
       that the bootstrap-icons.min.css @font-face above depends on, leaving glyphs as tofu. */
    @font-face {
      font-family: "bootstrap-icons";
      src: url(data:font/woff2;base64,${BOOTSTRAP_ICONS_WOFF2_BASE64}) format("woff2");
    }
    ${DITA_STYLES_CSS}
    ${PRISM_THEME_CSS}
    body { font-family: system-ui, -apple-system, sans-serif; background: transparent; }
    .shortdesc { font-weight: 400; color: var(--bs-secondary-color); }
    pre, pre.alert, pre.alert-secondary, pre.bg-light, pre[class*="language-"] {
      background: var(--prism-background, var(--bs-tertiary-bg));
      color: var(--prism-maintext, var(--bs-body-color));
      border: 1px solid var(--bs-border-color);
      border-radius: 0.375rem;
      padding: 1rem;
      margin: 0.75rem 0;
      overflow-x: auto;
    }
    pre code {
      display: block;
      padding: 0;
      border: none;
      border-radius: 0;
      background: transparent;
      color: inherit;
      white-space: pre;
    }
    .note { margin-top: 1rem; margin-bottom: 1rem; }
    .tabbed-dialog { border-bottom: 1px solid var(--bs-border-color); margin-bottom: 1rem; }
  </style>
  <script>
    window.__NAVBAR_CONFIG__ = {
      colorScheme: "${navColorScheme}",
      bgColor: "${navBgColor}"
    };
  </script>
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
