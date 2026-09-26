import type { McpClientService } from "./mcp";

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

  isChatEnabled(): boolean {
    const envVal = (process.env.ENABLE_CHAT || "").trim().toLowerCase();
    if (envVal === "false" || envVal === "0" || envVal === "no" || envVal === "off") {
      return false;
    }
    if (envVal === "true" || envVal === "1" || envVal === "yes" || envVal === "on") {
      return true;
    }
    if (this.config.provider === "ollama") {
      return true;
    }
    return Boolean(this.config.apiKey && this.config.apiKey.trim() !== "");
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
            const maxShown = 3;
            const shownSets = docSets.slice(0, maxShown);
            const itemsText = shownSets
              .map((ds: any) => `* ${ds.title || ds.id}${ds.description ? `: ${ds.description}` : ""}`)
              .join("\n");
            const extraText = docSets.length > maxShown
              ? `\n* ...etc (${docSets.length - maxShown} more documentation sets available. Use list_documentation_sets or search_documentation to discover more.)`
              : "";
            docCorpusSummary = `Available Documentation Sets (${docSets.length} total):\n${itemsText}${extraText}`;
          }
        }
      }
    } catch (e) {
      console.warn("Could not dynamically load docs summary for system prompt:", e);
    }

    const systemPrompt: ChatMessage = {
      role: "system",
      content:
        "You are a helpful, expert documentation assistant.\n" +
        `${docCorpusSummary}\n\n` +
        "GUIDELINES & SCOPE:\n" +
        "1. DOMAIN SCOPE: Assist users with questions and documentation lookups related purely to the loaded documentation sets listed above. Before denying general or natural language requests as out-of-scope, attempt to reframe or evaluate the query as a documentation-focused request (e.g., reframing 'is holly a good summer flower' to 'Which documentation set could tell me \"is holly a good summer flower\"?') and check your loaded documentation sets using search tools (`search_documentation`, `list_documentation_sets`). Only if no loaded documentation set covers the topic after searching, or if a user asks completely unrelated general knowledge or trivia (e.g., 'What is the capital of France?'), politely state that you are a documentation assistant and can only assist with queries covered by the loaded documentation sets.\n" +
        "2. DOCUMENTATION LOOKUPS: Use your MCP tools (`search_documentation`, `get_topic_content`, `list_documentation_sets`, `render_topic_ui`) to find authoritative information before answering. Always provide a clear, helpful, comprehensive text response explaining the answer based on the retrieved documentation.\n" +
        "3. DOC PAGE & UI COMPONENT PREVIEWS: When asked to show, view, render, or retrieve a component UI or documentation page (e.g. 'Show me collapse', 'render offcanvas', or retrieving a doc page), call the `render_topic_ui` tool. DO NOT write a chatbot summary or text explanation when retrieving a doc page via `render_topic_ui`—the rendered interactive topic UI page serves as the complete view. Keep any accompanying text empty or to a single brief sentence.\n" +
        "4. CODE FORMATTING: Always format code examples using full Markdown fenced code blocks (e.g. ```xml ... ``` or ```html ... ```). Never output placeholder strings like CODEBLOCK0.",
    };

    const messages: ChatMessage[] = [systemPrompt, ...history, { role: "user", content: userMessage }];
    const executedToolResults: any[] = [];

    for (let turn = 0; turn < 10; turn++) {
      const response = await this.callChatCompletions(messages, openaiTools);

      if (!response || !response.choices || response.choices.length === 0) {
        throw new Error("No response returned from LLM provider.");
      }

      const choice = response.choices[0];
      const assistantMsg = choice.message;

      if (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
        messages.push(assistantMsg);

        // concurrent tool calls resolve out of request order, so return each result
        // and only push to the shared arrays after Promise.all restores that order.
        const toolOutcomes = await Promise.all(
          assistantMsg.tool_calls.map(async (toolCall: any) => {
            const functionName = toolCall.function.name;
            let functionArgs: Record<string, any> = {};
            try {
              functionArgs = typeof toolCall.function.arguments === "string"
                ? JSON.parse(toolCall.function.arguments)
                : toolCall.function.arguments;
            } catch (e) {
              functionArgs = {};
            }

            try {
              const result = await mcpClient.callTool(functionName, functionArgs);
              const resultContent = Array.isArray(result?.content)
                ? result.content.map((c: any) => c.text || JSON.stringify(c)).join("\n")
                : JSON.stringify(result);

              return {
                toolResult: { toolName: functionName, args: functionArgs, result },
                message: {
                  role: "tool" as const,
                  tool_call_id: toolCall.id,
                  name: functionName,
                  content: resultContent,
                },
              };
            } catch (toolErr: any) {
              return {
                toolResult: null,
                message: {
                  role: "tool" as const,
                  tool_call_id: toolCall.id,
                  name: functionName,
                  content: `Error executing tool: ${toolErr.message}`,
                },
              };
            }
          }),
        );

        for (const outcome of toolOutcomes) {
          if (outcome.toolResult) executedToolResults.push(outcome.toolResult);
        }
        messages.push(...toolOutcomes.map((o) => o.message));
      } else {
        let text = assistantMsg.content ? assistantMsg.content.trim() : "";
        const hasUi = executedToolResults.some((tr: any) => tr.toolName === "render_topic_ui");

        if (hasUi) {
          // When retrieving a doc page via render_topic_ui, no chatbot text summary is needed.
          // Suppress redundant text summaries so the rendered iframe card serves as the main output.
          if (!text || text.length > 250) {
            text = "";
          }
        } else if (!text) {
          if (executedToolResults.length > 0) {
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

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

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

const globalForLlm = globalThis as unknown as { llmService?: LlmService };
export const llmService = globalForLlm.llmService ?? new LlmService();
if (process.env.NODE_ENV !== "production") globalForLlm.llmService = llmService;
