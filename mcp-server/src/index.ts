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
import { DocProvider } from "./provider";
import { renderTopicToHtml } from "./renderer";

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

      const fullOutput = `# ${title}\n\n${shortdesc ? `*${shortdesc}*\n\n` : ""}${markdown}`;

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

// 5. render_topic_ui (MCP-UI tool)
mcpServer.tool(
  "render_topic_ui",
  "Renders a complete interactive topic view (breadcrumbs, title, AST elements, code blocks, scrollspy) as a self-contained MCP-UI HTML resource.",
  {
    docId: z.string().describe("ID of the documentation set"),
    topicPath: z.string().describe("Topic relative path (e.g. release-notes/index or color)"),
    theme: z.enum(["light", "dark"]).optional().default("light").describe("Color theme for rendering"),
  },
  async ({ docId, topicPath, theme }) => {
    try {
      const doc = provider.getTopicDoc(docId, topicPath);
      const toc = provider.getToc(docId) as { title?: string } | undefined;
      const html = renderTopicToHtml(docId, topicPath, doc, toc?.title, theme);

      return {
        content: [
          {
            type: "resource",
            resource: {
              uri: `ui://${docId}/topics/${topicPath}`,
              mimeType: "text/html",
              text: html,
            },
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

// --- SERVER TRANSPORT INITIALIZATION ---

async function main() {
  const transportType = options.transport.toLowerCase();

  if (transportType === "http") {
    const port = Number(options.port || 4001);
    const app = express();
    app.use(cors({ exposedHeaders: ["Mcp-Session-Id"] }));
    app.use(express.json());

    const transports: Record<string, StreamableHTTPServerTransport> = {};

    app.post("/mcp", async (req, res) => {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;
      let transport: StreamableHTTPServerTransport;

      if (sessionId && transports[sessionId]) {
        transport = transports[sessionId];
      } else if (!sessionId && isInitializeRequest(req.body)) {
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (id) => {
            transports[id] = transport;
          },
        });

        transport.onclose = () => {
          if (transport.sessionId) {
            delete transports[transport.sessionId];
          }
        };

        await mcpServer.connect(transport);
      } else {
        res.status(400).json({
          jsonrpc: "2.0",
          error: { code: -32000, message: "Bad Request: No valid session ID provided" },
          id: null,
        });
        return;
      }

      await transport.handleRequest(req, res, req.body);
    });

    const handleSessionRequest = async (req: express.Request, res: express.Response) => {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;
      if (!sessionId || !transports[sessionId]) {
        res.status(400).send("Invalid or missing session ID");
        return;
      }
      await transports[sessionId].handleRequest(req, res);
    };

    app.get("/mcp", handleSessionRequest);
    app.delete("/mcp", handleSessionRequest);

    app.listen(port, () => {
      console.log(`dita-docs-mcp server running on Streamable HTTP at http://localhost:${port}/mcp`);
    });
  } else {
    // Default: stdio transport
    const transport = new StdioServerTransport();
    await mcpServer.connect(transport);
  }
}

main().catch((error) => {
  console.error("Fatal error running dita-docs-mcp server:", error);
  process.exit(1);
});
