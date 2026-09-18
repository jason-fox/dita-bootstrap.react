import type { McpClientService } from "./mcp.js";

export interface LlmConfig {
  provider: string;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: any[];
}

export class LlmService {
  private config: LlmConfig;

  constructor() {
    const provider = (process.env.CHAT_BOT_PROVIDER || "gemini").toLowerCase();
    this.config = this.getProviderConfig(provider);
    console.log(`Initialized LLM Service with provider: ${this.config.provider} (model: ${this.config.model})`);
  }

  private getProviderConfig(provider: string): LlmConfig {
    switch (provider) {
      case "anthropic":
        return {
          provider: "anthropic",
          apiKey: process.env.ANTHROPIC_API_KEY,
          baseUrl: process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com",
          model: process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022",
        };
      case "openai":
        return {
          provider: "openai",
          apiKey: process.env.OPENAI_API_KEY,
          baseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
          model: process.env.OPENAI_MODEL || "gpt-4o",
        };
      case "ollama":
        return {
          provider: "ollama",
          baseUrl: process.env.OLLAMA_BASE_URL || "http://host.docker.internal:11434/v1",
          model: process.env.OLLAMA_MODEL || "qwen2.5:3b",
        };
      case "gemini":
      default:
        return {
          provider: "gemini",
          apiKey: process.env.GEMINI_API_KEY,
          baseUrl: process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/openai/",
          model: process.env.GEMINI_MODEL || "models/gemini-3.6-flash",
        };
    }
  }

  get activeConfig(): LlmConfig {
    return this.config;
  }

  async generateResponse(
    userMessage: string,
    history: ChatMessage[],
    mcpClient: McpClientService
  ): Promise<{ text: string; toolResults: any[] }> {
    if (this.config.provider !== "ollama" && (!this.config.apiKey || this.config.apiKey.trim() === "")) {
      throw new Error(`API key for provider '${this.config.provider}' is missing or empty. Please set ${this.config.provider.toUpperCase()}_API_KEY in your .env file.`);
    }

    const tools = await mcpClient.listTools();
    const openaiTools = tools.map((t: any) => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description,
        parameters: t.inputSchema || { type: "object", properties: {} },
      },
    }));

    // Dynamically discover available documentation corpus from MCP server resources / tools
    let docCorpusSummary = "Loaded Documentation Sets";
    try {
      const resource = await mcpClient.readResource("docs://summary");
      const firstContent = resource?.contents?.[0];
      const text = firstContent && "text" in firstContent ? (firstContent as any).text : undefined;
      if (text) {
        docCorpusSummary = text;
      } else {
        const docSetsResult: any = await mcpClient.callTool("list_documentation_sets", {});
        const jsonText = docSetsResult?.content?.find((c: any) => c.type === "text")?.text;
        if (jsonText) {
          const docSets = JSON.parse(jsonText);
          if (Array.isArray(docSets) && docSets.length > 0) {
            docCorpusSummary = "Available Documentation Sets:\n" + docSets
              .map((ds: any) => `* ${ds.title || ds.id}${ds.description ? `: ${ds.description}` : ""}`)
              .join("\n");
          }
        }
      }
    } catch (e) {
      console.warn("Could not dynamically load docs summary for system prompt:", e);
    }

    const systemPrompt: ChatMessage = {
      role: "system",
      content:
        "You are a helpful, expert technical documentation assistant.\n" +
        `${docCorpusSummary}\n\n` +
        "GUIDELINES & SCOPE:\n" +
        "1. DOMAIN SCOPE: Assist users with technical questions and documentation lookups related to software, DITA XML, DITA-OT, Bootstrap, and the loaded documentation sets listed above. If a user asks completely unrelated general knowledge or trivia (e.g., 'What is the capital of France?'), politely state that you are a technical documentation assistant and can only assist with software/documentation queries.\n" +
        "2. DOCUMENTATION LOOKUPS: Use your MCP tools (`search_documentation`, `get_topic_content`, `list_documentation_sets`, `render_topic_ui`) to find authoritative information before answering. Always provide a clear, helpful, comprehensive text response explaining the answer based on the retrieved documentation.\n" +
        "3. UI COMPONENT PREVIEWS: When asked to show, view, render, or explain a component UI or documentation page (e.g. 'Show me collapse', 'render offcanvas'), call the `render_topic_ui` tool. For `render_topic_ui` calls, keep your text introduction concise (e.g. 1-2 sentences) so the rendered interactive UI page serves as the visual component view.",
    };

    const messages: ChatMessage[] = [systemPrompt, ...history, { role: "user", content: userMessage }];
    const executedToolResults: any[] = [];

    // Loop for tool calling (max 10 iterations)
    for (let turn = 0; turn < 10; turn++) {
      const response = await this.callChatCompletions(messages, openaiTools);

      if (!response || !response.choices || response.choices.length === 0) {
        throw new Error("No response returned from LLM provider.");
      }

      const choice = response.choices[0];
      const assistantMsg = choice.message;

      if (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
        messages.push(assistantMsg);

        for (const toolCall of assistantMsg.tool_calls) {
          const functionName = toolCall.function.name;
          let functionArgs: Record<string, any> = {};
          try {
            functionArgs = typeof toolCall.function.arguments === "string"
              ? JSON.parse(toolCall.function.arguments)
              : toolCall.function.arguments;
          } catch (e) {
            functionArgs = {};
          }

          console.log(`LLM requested tool call: ${functionName}`, functionArgs);

          try {
            const result = await mcpClient.callTool(functionName, functionArgs);
            executedToolResults.push({
              toolName: functionName,
              args: functionArgs,
              result,
            });

            const resultContent = Array.isArray(result?.content)
              ? result.content.map((c: any) => c.text || JSON.stringify(c)).join("\n")
              : JSON.stringify(result);

            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              name: functionName,
              content: resultContent,
            });
          } catch (toolErr: any) {
            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              name: functionName,
              content: `Error executing tool: ${toolErr.message}`,
            });
          }
        }
      } else {
        let text = assistantMsg.content ? assistantMsg.content.trim() : "";
        if (!text) {
          const hasUi = executedToolResults.some((tr: any) => tr.toolName === "render_topic_ui");
          if (hasUi) {
            text = "Here is the documentation and interactive preview:";
          } else if (executedToolResults.length > 0) {
            try {
              messages.push({
                role: "user",
                content: "Please summarize the answer to my question based on the tool results above.",
              });
              const synthResponse = await this.callChatCompletions(messages, []);
              text = synthResponse?.choices?.[0]?.message?.content || "Here is the requested information:";
            } catch (e) {
              text = "Here is the requested information:";
            }
          } else {
            text = "I am ready to help with documentation questions or component previews.";
          }
        }

        return {
          text,
          toolResults: executedToolResults,
        };
      }
    }

    // Force a final text synthesis call without tool calling if loop completes
    const finalResponse = await this.callChatCompletions(messages, []);
    const rawFinal = finalResponse?.choices?.[0]?.message?.content;
    const finalText = (rawFinal && rawFinal.trim() !== "")
      ? rawFinal
      : (executedToolResults.some((tr: any) => tr.toolName === "render_topic_ui")
          ? "Here is the documentation and interactive preview:"
          : "Gathered tool information successfully.");

    return {
      text: finalText,
      toolResults: executedToolResults,
    };
  }

  private async callChatCompletions(messages: ChatMessage[], tools: any[]): Promise<any> {
    const baseUrl = this.config.baseUrl!.endsWith("/")
      ? this.config.baseUrl!
      : `${this.config.baseUrl}/`;
    
    const endpoint = baseUrl.endsWith("chat/completions") || baseUrl.endsWith("chat/completions/")
      ? baseUrl
      : `${baseUrl}chat/completions`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.config.apiKey) {
      if (this.config.provider === "gemini") {
        headers["Authorization"] = `Bearer ${this.config.apiKey}`;
        headers["x-goog-api-key"] = this.config.apiKey;
      } else {
        headers["Authorization"] = `Bearer ${this.config.apiKey}`;
      }
    }

    const payload: any = {
      model: this.config.model,
      messages: messages.map((m) => {
        const msgNode: any = { role: m.role };
        if (m.role === "assistant" && m.tool_calls && m.tool_calls.length > 0) {
          msgNode.tool_calls = m.tool_calls;
          msgNode.content = m.content || null;
        } else {
          msgNode.content = m.content || "";
        }
        if (m.role === "tool") {
          msgNode.tool_call_id = m.tool_call_id;
        } else if (m.name) {
          msgNode.name = m.name;
        }
        return msgNode;
      }),
    };

    if (tools && tools.length > 0) {
      payload.tools = tools;
      payload.tool_choice = "auto";
    }

    console.log(`Sending POST to ${endpoint} with model=${this.config.model}`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`LLM API returned ${res.status} ${res.statusText}: ${errText}`);
      }

      return await res.json();
    } catch (err: any) {
      if (err.name === "AbortError") {
        throw new Error(`LLM Request timed out after 30 seconds calling ${endpoint}`);
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }
}
