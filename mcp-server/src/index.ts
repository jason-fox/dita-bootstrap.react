import path from "node:path";
import { randomUUID } from "node:crypto";
import net from "node:net";
import cluster from "node:cluster";
import type { Worker } from "node:cluster";
import os from "node:os";
import express from "express";
import cors from "cors";
import { Command } from "commander";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { registerAppTool, registerAppResource, RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import { DocProvider } from "./provider";
import { renderAppShellHtml } from "./renderer";
import type { TopicPageProps } from "./TopicPage";
import type { TocDoc } from "../../renderer/lib/api";

const TOPIC_VIEWER_RESOURCE_URI = "ui://dita-docs/topic-viewer.html";

const program = new Command();

program
  .name("dita-docs-mcp")
  .description("MCP Server for Technical Documentation search, content extraction, and UI rendering")
  .option("-t, --transport <type>", "Transport type: stdio or http", "stdio")
  .option("-p, --port <number>", "Port to run HTTP server on", "4001")
  .option("-d, --data-dir <path>", "Path to backend data directory", process.env.DATA_DIR || path.resolve(__dirname, "../../data-store/data"))
  .option("-c, --cluster [workers]", "Enable multi-core cluster mode")
  .option("-w, --workers <number>", "Number of worker processes in cluster mode");

program.parse(process.argv);
const options = program.opts();

const provider = new DocProvider(options.dataDir);

function createMcpServer(): McpServer {
  const mcpServer = new McpServer({
    name: "dita-docs-mcp",
    version: "1.0.0",
  });

  // --- MCP TOOLS ---

  // 1. list_documentation_sets
  mcpServer.tool(
    "list_documentation_sets",
    "Lists all available documentation sets along with their titles, descriptions, categories, and topic counts. Use this tool first to discover available document collections before querying specific topics.",
    {},
    async () => {
      const docSets = provider.findDocSets();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(docSets, null, 2),
          },
        ],
      };
    },
  );

  // 2. get_toc
  mcpServer.tool(
    "get_toc",
    "Retrieves the hierarchical Table of Contents (TOC) structure for a documentation set. Use this to inspect document organization, section headers, and available topic paths.",
    {
      docId: z.string().describe("ID of the target documentation set (e.g., 'dita-ot-docs', 'dita-bootstrap-sample')"),
    },
    async ({ docId }) => {
      try {
        const toc = provider.getToc(docId);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(toc, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: "text", text: error.message }],
        };
      }
    },
  );

  // 3. search_documentation
  mcpServer.tool(
    "search_documentation",
    "Performs full-text keyword search across documentation sets and returns ranked topic matches with relevant snippets. Use this to find specific topics or concepts when the exact path is unknown.",
    {
      query: z.string().describe("Search query string (keywords, error messages, or feature names)"),
      docId: z.string().optional().describe("Optional documentation set ID to scope the search to a single document collection"),
      lang: z.string().optional().describe("Optional IETF BCP 47 language code filter (e.g., 'en', 'de', 'fr')"),
    },
    async ({ query, docId, lang }) => {
      const hits = provider.search(query, docId, lang);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(hits, null, 2),
          },
        ],
      };
    },
  );

  // 4. get_topic_content
  mcpServer.tool(
    "get_topic_content",
    "Retrieves the full content of a documentation topic formatted in clean Markdown. Use this tool to fetch detailed technical information required for reasoning, analysis, or answering user questions.",
    {
      docId: z.string().describe("ID of the target documentation set"),
      topicPath: z.string().describe("Relative topic path without file extension (e.g., 'release-notes/index' or 'color')"),
    },
    async ({ docId, topicPath }) => {
      try {
        const doc = provider.getTopicDoc(docId, topicPath);
        const markdown = provider.astToMarkdown(doc.content);
        const title = (doc.meta.title as string) || topicPath;
        const shortdesc = (doc.meta.shortdesc as string) || "";

        const breadcrumbs = Array.isArray(doc.meta.breadcrumbs)
          ? (doc.meta.breadcrumbs as Array<{ title: string; href?: string }>)
          : undefined;
        const breadcrumbHeader = breadcrumbs && breadcrumbs.length > 0
          ? `*Location: ${breadcrumbs.map((b) => b.title).join(" > ")}*\n\n`
          : "";

        const fullOutput = `${breadcrumbHeader}# ${title}\n\n${shortdesc ? `*${shortdesc}*\n\n` : ""}${markdown}`;

        return {
          content: [
            {
              type: "text",
              text: fullOutput,
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: "text", text: error.message }],
        };
      }
    },
  );

  // 5. render_topic_ui
  registerAppTool(
    mcpServer,
    "render_topic_ui",
    {
      title: "Render Topic UI",
      description:
        "Renders an interactive, styled visual view of a documentation topic (including layout components, code blocks, and table of contents) for inline user display.",
      inputSchema: z.object({
        docId: z.string().describe("ID of the target documentation set"),
        topicPath: z.string().describe("Relative topic path to render (e.g., 'release-notes/index' or 'color')"),
        theme: z.enum(["light", "dark"]).optional().default("light").describe("Color theme for the rendered UI ('light' or 'dark')"),
      }),
      _meta: { ui: { resourceUri: TOPIC_VIEWER_RESOURCE_URI } },
    },
    async ({ docId, topicPath, theme }: { docId: string; topicPath: string; theme: "light" | "dark" }) => {
      try {
        const doc = provider.getTopicDoc(docId, topicPath);
        const toc = provider.getToc(docId) as TocDoc | undefined;
        const payload: TopicPageProps = { docId, topicPath, doc, toc, theme };

        return {
          content: [{ type: "text", text: JSON.stringify(payload) }],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: "text", text: error.message }],
        };
      }
    },
  );

  // The MCP App's own iframe shell - a static, topic-agnostic HTML page.
  registerAppResource(
    mcpServer,
    "topic-viewer",
    TOPIC_VIEWER_RESOURCE_URI,
    {},
    async () => ({
      contents: [{ uri: TOPIC_VIEWER_RESOURCE_URI, mimeType: RESOURCE_MIME_TYPE, text: renderAppShellHtml() }],
    }),
  );

  // --- MCP RESOURCES ---

  mcpServer.resource(
    "library",
    "docs://library",
    {
      description: "JSON catalog listing metadata for all available documentation sets",
      mimeType: "application/json",
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(provider.findDocSets(), null, 2),
        },
      ],
    }),
  );

  mcpServer.resource(
    "summary",
    "docs://summary",
    {
      description: "Human-readable summary of available documentation sets and descriptions",
      mimeType: "text/plain",
    },
    async (uri) => {
      if (process.env.CORPUS_SUMMARY_OVERRIDE) {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "text/plain",
              text: process.env.CORPUS_SUMMARY_OVERRIDE.trim(),
            },
          ],
        };
      }
      const docSets = provider.findDocSets();
      const maxShown = 3;
      const shownSets = docSets.slice(0, maxShown);
      const summaryText = shownSets
        .map((ds) => `* ${ds.title} (${ds.id})${ds.description ? `: ${ds.description}` : ""}`)
        .join("\n");
      const extraText = docSets.length > maxShown
        ? `\n* ...etc (${docSets.length - maxShown} more documentation sets available. Use list_documentation_sets or search_documentation to discover more.)`
        : "";
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "text/plain",
            text: `Available Documentation Sets (${docSets.length} total):\n${summaryText}${extraText}`,
          },
        ],
      };
    }
  );

  return mcpServer;
}

// --- SERVER TRANSPORT INITIALIZATION ---

async function main() {
  const transportType = options.transport.toLowerCase();

  const isCluster =
    options.cluster !== undefined ||
    options.workers !== undefined ||
    process.env.CLUSTER_MODE === "true" ||
    process.env.WEB_CONCURRENCY !== undefined;

  let workerCount = 1;
  if (options.workers) {
    workerCount = Math.max(1, Number.parseInt(options.workers, 10));
  } else if (typeof options.cluster === "string") {
    workerCount = Math.max(1, Number.parseInt(options.cluster, 10));
  } else if (process.env.WEB_CONCURRENCY) {
    workerCount = Math.max(1, Number.parseInt(process.env.WEB_CONCURRENCY, 10));
  } else if (isCluster) {
    workerCount = Math.max(1, os.availableParallelism ? os.availableParallelism() : os.cpus().length);
  }

  if (isCluster && workerCount > 1 && cluster.isPrimary) {
    console.log(`dita-docs-mcp primary process ${process.pid} running. Spawning ${workerCount} sticky worker processes...`);
    const workers: Worker[] = [];

    for (let i = 0; i < workerCount; i++) {
      workers.push(cluster.fork());
    }

    cluster.on("exit", (worker, code, signal) => {
      console.warn(`Worker process ${worker.process.pid} exited (code: ${code}, signal: ${signal}). Spawning replacement...`);
      const idx = workers.indexOf(worker);
      const newWorker = cluster.fork();
      if (idx !== -1) {
        workers[idx] = newWorker;
      } else {
        workers.push(newWorker);
      }
    });

    if (transportType === "http") {
      const port = Number(options.port || 4001);

      function hashString(str: string): number {
        let hash = 2166136261;
        for (let i = 0; i < str.length; i++) {
          hash ^= str.charCodeAt(i);
          hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
        }
        return hash >>> 0;
      }

      const server = net.createServer({ pauseOnConnect: true }, (socket) => {
        socket.once("data", (buffer) => {
          const text = buffer.toString("utf-8");
          const match = text.match(/mcp-session-id:\s*([^\r\n]+)/i);
          const key = match ? match[1].trim() : (socket.remoteAddress || "default");

          const activeWorkers = workers.filter((w) => w.isConnected() && !w.isDead());
          if (activeWorkers.length === 0) {
            socket.destroy();
            return;
          }

          const targetWorker = activeWorkers[hashString(key) % activeWorkers.length];
          targetWorker.send({ type: "sticky-connection" }, socket);
          socket.unshift(buffer);
        });
      });

      server.listen(port, () => {
        console.log(`dita-docs-mcp primary sticky router listening on http://localhost:${port}`);
      });
    } else {
      console.log("dita-docs-mcp primary running in stdio cluster mode");
    }
    return;
  }

  // Worker process or single-process execution
  if (transportType === "http") {
    const port = Number(options.port || 4001);
    const app = express();
    app.use(cors({ exposedHeaders: ["Mcp-Session-Id"] }));
    app.use(express.json());

    // HTML App shell endpoint for embedding in web clients / iframes
    app.get("/viewer", (_req, res) => {
      res.type("html").send(renderAppShellHtml());
    });

    const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000;

    interface SessionEntry {
      transport: StreamableHTTPServerTransport;
      lastActivity: number;
    }

    const transports: Record<string, SessionEntry> = {};

    // Header can arrive as string[] (duplicated header); treat anything else as absent.
    function getSessionId(req: express.Request): string | undefined {
      const header = req.headers["mcp-session-id"];
      return typeof header === "string" ? header : undefined;
    }

    app.post("/mcp", async (req, res) => {
      try {
        const sessionId = getSessionId(req);
        let transport: StreamableHTTPServerTransport;

        if (sessionId && transports[sessionId]) {
          transport = transports[sessionId].transport;
          transports[sessionId].lastActivity = Date.now();
        } else if (!sessionId && isInitializeRequest(req.body)) {
          const server = createMcpServer();
          transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            onsessioninitialized: (id) => {
              transports[id] = { transport, lastActivity: Date.now() };
            },
          });

          transport.onclose = () => {
            if (transport.sessionId) {
              delete transports[transport.sessionId];
            }
            server.close();
          };

          await server.connect(transport);
        } else {
          res.status(400).json({
            jsonrpc: "2.0",
            error: { code: -32000, message: "Bad Request: No valid session ID provided" },
            id: null,
          });
          return;
        }

        await transport.handleRequest(req, res, req.body);
      } catch (error) {
        console.error("Error handling MCP request:", error);
        if (!res.headersSent) {
          res.status(500).json({
            jsonrpc: "2.0",
            error: { code: -32000, message: "Internal Server Error" },
            id: null,
          });
        }
      }
    });

    const handleSessionRequest = async (req: express.Request, res: express.Response) => {
      try {
        const sessionId = getSessionId(req);
        const entry = sessionId ? transports[sessionId] : undefined;
        if (!entry) {
          res.status(400).send("Invalid or missing session ID");
          return;
        }
        entry.lastActivity = Date.now();
        await entry.transport.handleRequest(req, res);
      } catch (error) {
        console.error("Error handling MCP session request:", error);
        if (!res.headersSent) {
          res.status(500).send("Internal Server Error");
        }
      }
    };

    app.get("/mcp", handleSessionRequest);
    app.delete("/mcp", handleSessionRequest);

    // Reap sessions whose client vanished without closing cleanly (no onclose fired).
    setInterval(() => {
      const now = Date.now();
      for (const [id, entry] of Object.entries(transports)) {
        if (now - entry.lastActivity > SESSION_IDLE_TIMEOUT_MS) {
          entry.transport.close();
          delete transports[id];
        }
      }
    }, SESSION_IDLE_TIMEOUT_MS).unref();

    const httpServer = app.listen(isCluster && cluster.isWorker ? 0 : port, () => {
      console.log(
        `dita-docs-mcp worker ${process.pid} running on Streamable HTTP${
          isCluster && cluster.isWorker ? " (sticky worker)" : ` at http://localhost:${port}/mcp`
        }`
      );
    });

    if (isCluster && cluster.isWorker) {
      process.on("message", (msg: any, socket: net.Socket) => {
        if (msg?.type === "sticky-connection" && socket) {
          httpServer.emit("connection", socket);
          socket.resume();
        }
      });
    }
  } else {
    // Default: stdio transport
    const transport = new StdioServerTransport();
    const server = createMcpServer();
    await server.connect(transport);
  }
}

main().catch((error) => {
  console.error("Fatal error running dita-docs-mcp server:", error);
  process.exit(1);
});

