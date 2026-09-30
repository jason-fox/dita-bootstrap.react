import "server-only";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { ReadResourceResult, Tool } from "@modelcontextprotocol/sdk/types.js";
import type { ToolResult } from "@/types/mcp";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export class McpClientService {
  private client: Client;
  private serverUrl: string;
  private isConnected = false;

  constructor(serverUrl: string = process.env.MCP_SERVER_URL || "http://localhost:4001/mcp") {
    this.serverUrl = serverUrl;
    this.client = new Client(
      {
        name: "dita-docs-renderer-client",
        version: "1.0.0",
      },
      {
        capabilities: {},
      }
    );
  }

  private withTimeout<T>(promise: Promise<T>, timeoutMs: number = 3000): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`MCP operation timed out after ${timeoutMs}ms`)), timeoutMs)
      ),
    ]);
  }

  async connect(force = false): Promise<boolean> {
    if (this.isConnected && !force) return true;

    try {
      this.client = new Client(
        {
          name: "dita-docs-renderer-client",
          version: "1.0.0",
        },
        {
          capabilities: {},
        }
      );
      const url = new URL(this.serverUrl);
      const transport = new StreamableHTTPClientTransport(url);
      await this.withTimeout(this.client.connect(transport), 3000);
      this.isConnected = true;
      return true;
    } catch (error: unknown) {
      console.warn(`Failed to connect to MCP Server at ${this.serverUrl}: ${errorMessage(error)}`);
      this.isConnected = false;
      return false;
    }
  }

  async listTools(retry = true): Promise<Tool[]> {
    if (!this.isConnected) {
      await this.connect();
    }
    if (!this.isConnected) return [];

    try {
      const response = await this.withTimeout(this.client.listTools(), 3000);
      return response.tools || [];
    } catch (error: unknown) {
      console.error("Error listing MCP tools:", errorMessage(error));
      this.isConnected = false;
      if (retry) {
        await this.connect(true);
        if (this.isConnected) {
          return this.listTools(false);
        }
      }
      return [];
    }
  }

  async callTool(name: string, args: Record<string, unknown>, retry = true): Promise<ToolResult> {
    if (!this.isConnected) {
      await this.connect();
    }
    if (!this.isConnected) {
      throw new Error(`MCP Client is not connected to server at ${this.serverUrl}`);
    }

    try {
      const response = await this.withTimeout(
        this.client.callTool({
          name,
          arguments: args,
        }),
        5000
      );
      return response as ToolResult;
    } catch (error: unknown) {
      console.error(`Error calling MCP tool '${name}':`, errorMessage(error));
      this.isConnected = false;
      if (retry) {
        await this.connect(true);
        if (this.isConnected) {
          return this.callTool(name, args, false);
        }
      }
      throw error;
    }
  }

  async readResource(uri: string, retry = true): Promise<ReadResourceResult | null> {
    if (!this.isConnected) {
      await this.connect();
    }
    if (!this.isConnected) return null;

    try {
      const response = await this.withTimeout(this.client.readResource({ uri }), 3000);
      return response;
    } catch (error: unknown) {
      console.error(`Error reading MCP resource '${uri}':`, errorMessage(error));
      this.isConnected = false;
      if (retry) {
        await this.connect(true);
        if (this.isConnected) {
          return this.readResource(uri, false);
        }
      }
      return null;
    }
  }
}

const globalForMcp = globalThis as unknown as { mcpClientService?: McpClientService };
export const mcpClient = globalForMcp.mcpClientService ?? new McpClientService();
if (process.env.NODE_ENV !== "production") globalForMcp.mcpClientService = mcpClient;
