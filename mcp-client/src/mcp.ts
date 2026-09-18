import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

export class McpClientService {
  private client: Client;
  private serverUrl: string;
  private isConnected = false;

  constructor(serverUrl: string = process.env.MCP_SERVER_URL || "http://localhost:4001/mcp") {
    this.serverUrl = serverUrl;
    this.client = new Client(
      {
        name: "dita-docs-mcp-client",
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

  async connect(): Promise<boolean> {
    if (this.isConnected) return true;

    try {
      console.log(`Connecting to MCP Server at ${this.serverUrl}...`);
      this.client = new Client(
        {
          name: "dita-docs-mcp-client",
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
      console.log("Successfully connected to MCP Server!");
      return true;
    } catch (error: any) {
      console.warn(`Failed to connect to MCP Server at ${this.serverUrl}: ${error.message}`);
      this.isConnected = false;
      return false;
    }
  }

  async listTools() {
    if (!this.isConnected) {
      await this.connect();
    }
    if (!this.isConnected) return [];

    try {
      const response = await this.withTimeout(this.client.listTools(), 3000);
      return response.tools || [];
    } catch (error: any) {
      console.error("Error listing MCP tools:", error.message);
      return [];
    }
  }

  async callTool(name: string, args: Record<string, any>) {
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
      return response;
    } catch (error: any) {
      console.error(`Error calling MCP tool '${name}':`, error.message);
      throw error;
    }
  }

  async readResource(uri: string) {
    if (!this.isConnected) {
      await this.connect();
    }
    if (!this.isConnected) return null;

    try {
      const response = await this.withTimeout(this.client.readResource({ uri }), 3000);
      return response;
    } catch (error: any) {
      console.error(`Error reading MCP resource '${uri}':`, error.message);
      return null;
    }
  }
}
