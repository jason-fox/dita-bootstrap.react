import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import cluster from "node:cluster";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { McpClientService } from "./mcp.js";
import { LlmService } from "./llm.js";

dotenv.config();

const port = Number(process.env.PORT || 3200);

const envWorkers = process.env.WEB_CONCURRENCY || process.env.WORKERS;
const numWorkers = envWorkers
  ? Math.max(1, Number.parseInt(envWorkers, 10))
  : process.env.CLUSTER_MODE === "true"
    ? Math.max(1, os.availableParallelism ? os.availableParallelism() : os.cpus().length)
    : 1;

if (numWorkers > 1 && cluster.isPrimary) {
  console.log(`Primary process ${process.pid} running. Forking ${numWorkers} mcp-client workers...`);
  for (let i = 0; i < numWorkers; i++) {
    cluster.fork();
  }
  cluster.on("exit", (worker, code, signal) => {
    console.warn(`Worker process ${worker.process.pid} exited (code: ${code}, signal: ${signal}). Spawning replacement...`);
    cluster.fork();
  });
} else {
  startWorker();
}

async function startWorker() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  const DARK_ONLY_THEMES = new Set([
    "cyborg",
    "darkly",
    "slate",
    "solar",
    "superhero",
    "vapor",
  ]);

  const rawTheme = (process.env.BOOTSTRAP_THEME || "default").trim();
  const themeName = rawTheme.toLowerCase();
  const isDarkOnly = DARK_ONLY_THEMES.has(themeName);
  const useBootswatch = themeName !== "" && themeName !== "default" && themeName !== "none";

  const docsTitle = "AI Assistant";
  const docsDescription = "AI Assisted Documentation Search";

  const navTextRaw = (process.env.NAVBAR_TEXT || "dark").trim();
  const navThemeRaw = (process.env.NAVBAR_THEME || "dark").trim();

  const textVal = navTextRaw.replace(/^navbar-/, "");
  const navColorScheme = `navbar-${textVal}`;
  const navBsTheme = textVal === "light" ? "light" : "dark";
  const navBgColor = navThemeRaw.startsWith("bg-") ? navThemeRaw : `bg-${navThemeRaw}`;

  const bootstrapCssUrl = useBootswatch
    ? `https://cdn.jsdelivr.net/npm/bootswatch@5.3.3/dist/${themeName}/bootstrap.min.css`
    : "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css";

  const customCssPath = (process.env.CUSTOM_CSS_PATH || "").trim();
  let customCssElement = "";
  if (customCssPath) {
    if (fs.existsSync(customCssPath)) {
      try {
        const content = fs.readFileSync(customCssPath, "utf-8");
        customCssElement = `<style>/* CUSTOM_CSS_PATH */\n${content}\n</style>`;
      } catch {}
    } else {
      customCssElement = `<link rel="stylesheet" href="${customCssPath}">`;
    }
  }

  const mcpClient = new McpClientService();
  const llmService = new LlmService();

  // Connect to MCP Server asynchronously on startup
  mcpClient.connect().catch((err) => {
    console.warn("Initial MCP connection failed, will retry on demand:", err.message);
  });

  const showToolInvocations =
    process.env.SHOW_TOOL_INVOCATIONS === "true" ||
    process.env.SHOW_TOOLS === "true" ||
    process.env.DEBUG_TOOLS === "true";

  // Health check endpoint
  app.get("/api/health", async (_req, res) => {
    const tools = await mcpClient.listTools();
    let docSets: any[] = [];
    try {
      const docSetsResult: any = await mcpClient.callTool("list_documentation_sets", {});
      const jsonText = docSetsResult?.content?.find((c: any) => c.type === "text")?.text;
      if (jsonText) {
        docSets = JSON.parse(jsonText);
      }
    } catch (e) {
      console.warn("Could not fetch doc sets for health endpoint:", e);
    }

    res.json({
      status: "ok",
      pid: process.pid,
      isWorker: cluster.isWorker,
      provider: llmService.activeConfig.provider,
      model: llmService.activeConfig.model,
      mcpConnected: tools.length > 0,
      toolsCount: tools.length,
      showToolInvocations,
      docSets,
      theme: themeName,
      isDarkOnly,
      docsTitle,
      docsDescription,
      navbarText: textVal,
      navbarTheme: navThemeRaw,
      navbarColorScheme: navColorScheme,
      navbarBgColor: navBgColor,
    });
  });

  // List MCP tools
  app.get("/api/mcp/tools", async (_req, res) => {
    const tools = await mcpClient.listTools();
    res.json({ tools });
  });

  // Chat completion endpoint
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, history = [] } = req.body;
      if (!message) {
        res.status(400).json({ error: "Missing required 'message' in request body." });
        return;
      }

      const response = await llmService.generateResponse(message, history, mcpClient);
      res.json({
        reply: response.text,
        toolResults: response.toolResults,
        provider: llmService.activeConfig.provider,
        model: llmService.activeConfig.model,
      });
    } catch (error: any) {
      console.error("Error in /api/chat:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // Serve static frontend files from public/ with dynamic theme & navbar injection
  const publicDir = path.resolve(__dirname, "../public");

  function renderIndexHtml(): string {
    const indexPath = path.join(publicDir, "index.html");
    let html = fs.readFileSync(indexPath, "utf-8");

    if (useBootswatch) {
      html = html.replace(
        "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css",
        bootstrapCssUrl
      );
    }

    // Replace default navbar color scheme and background
    const defaultNavClass = 'class="navbar navbar-expand-lg bg-dark navbar-dark border-bottom shadow-sm py-2 sticky-top flex-shrink-0" data-bs-theme="dark"';
    const customNavClass = `class="navbar navbar-expand-lg ${navBgColor} ${navColorScheme} border-bottom shadow-sm py-2 sticky-top flex-shrink-0" data-bs-theme="${navBsTheme}"`;
    html = html.replace(defaultNavClass, customNavClass);

    const defaultLang = (process.env.DEFAULT_LANGUAGE || "en").trim();
    const bsTheme = isDarkOnly ? "dark" : "light";
    html = html.replace(/<html lang="[^"]*"\s*(data-bs-theme="[^"]*")?>/, `<html lang="${defaultLang}" data-bs-theme="${bsTheme}">`);

    if (docsTitle) {
      html = html.replace("<title>AI Assistant</title>", `<title>${docsTitle}</title>`);
      html = html.replace('<span id="nav-brand-title">AI Assistant</span>', `<span id="nav-brand-title">${docsTitle}</span>`);
      html = html.replace("Welcome to AI Assistant", `Welcome to ${docsTitle}`);
    }

    if (customCssElement) {
      html = html.replace("</head>", `${customCssElement}\n</head>`);
    }

    return html;
  }

  app.get(["/", "/index.html"], (_req, res) => {
    res.setHeader("Content-Type", "text/html");
    res.send(renderIndexHtml());
  });

  app.use(express.static(publicDir));

  app.get("*", (_req, res) => {
    res.setHeader("Content-Type", "text/html");
    res.send(renderIndexHtml());
  });

  app.listen(port, () => {
    console.log(`DITA Docs MCP Client worker ${process.pid} running at http://localhost:${port} (standalone mode, chrome.json reading disabled)`);
    console.log(`Active Provider: ${llmService.activeConfig.provider} (${llmService.activeConfig.model})`);
    console.log(`Bootswatch Theme: ${themeName} (darkOnly: ${isDarkOnly})`);
    console.log(`Navbar Styling: NAVBAR_THEME=${navThemeRaw} (${navBgColor}), NAVBAR_TEXT=${textVal} (${navColorScheme})`);
  });
}
