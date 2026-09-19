import path from "node:path";
import { randomUUID } from "node:crypto";
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
import type { TocDoc } from "../../frontend/lib/api";

const TOPIC_VIEWER_RESOURCE_URI = "ui://dita-docs/topic-viewer.html";

const program = new Command();

program
  .name("dita-docs-mcp")
  .description("MCP Server for DITA AST Documentation with MCP-UI React rendering")
  .option("-t, --transport <type>", "Transport type: stdio or http", "stdio")
  .option("-p, --port <number>", "Port to run HTTP server on", "4001")
  .option("-d, --data-dir <path>", "Path to backend data directory", process.env.DATA_DIR || path.resolve(__dirname, "../../backend/data"));

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
    "Discovers and returns metadata (OASIS aligned: title, navtitle, description, category, keywords, author, prodinfo, lang) for all available documentation sets.",
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
    "Returns the hierarchical Table of Contents structure for a specific documentation set.",
    {
      docId: z.string().describe("ID of the documentation set (e.g. dita-ot-docs, dita-bootstrap-sample)"),
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
    "Performs full-text fuzzy search across documentation sets using MiniSearch, returning ranked topic matches with text snippets.",
    {
      query: z.string().describe("Search query string"),
      docId: z.string().optional().describe("Optional documentation set ID to scope search"),
    },
    async ({ query, docId }) => {
      const hits = provider.search(query, docId);
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
    "Returns clean, token-efficient Markdown text extracted from a documentation topic for reasoning and question answering.",
    {
      docId: z.string().describe("ID of the documentation set"),
      topicPath: z.string().describe("Topic relative path (e.g. release-notes/index or color)"),
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

  // 5. render_topic_ui (MCP App tool - see docs.md/apps.mdx SEP-1865)
  registerAppTool(
    mcpServer,
    "render_topic_ui",
    {
      title: "Render Topic UI",
      description:
        "Renders a complete interactive topic view (breadcrumbs, title, AST elements, code blocks, scrollspy, table of contents) as an MCP App.",
      inputSchema: z.object({
        docId: z.string().describe("ID of the documentation set"),
        topicPath: z.string().describe("Topic relative path (e.g. release-notes/index or color)"),
        theme: z.enum(["light", "dark"]).optional().default("light").describe("Color theme for rendering"),
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
    async (uri) => {
      const docSets = provider.findDocSets();
      const summaryText = docSets
        .map((ds) => `* ${ds.title} (${ds.id})${ds.description ? `: ${ds.description}` : ""}`)
        .join("\n");
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "text/plain",
            text: `Available Documentation Sets:\n${summaryText}`,
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

    app.listen(port, () => {
      console.log(`dita-docs-mcp server running on Streamable HTTP at http://localhost:${port}/mcp`);
    });
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
