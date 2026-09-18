import path from "node:path";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { McpClientService } from "./mcp.js";
import { LlmService } from "./llm.js";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3200);

app.use(cors());
app.use(express.json());

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
    provider: llmService.activeConfig.provider,
    model: llmService.activeConfig.model,
    mcpConnected: tools.length > 0,
    toolsCount: tools.length,
    showToolInvocations,
    docSets,
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

// Serve static frontend files from public/
const publicDir = path.resolve(__dirname, "../public");
app.use(express.static(publicDir));

app.get("*", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.listen(port, () => {
  console.log(`DITA Docs MCP Client running at http://localhost:${port}`);
  console.log(`Active Provider: ${llmService.activeConfig.provider} (${llmService.activeConfig.model})`);
});
