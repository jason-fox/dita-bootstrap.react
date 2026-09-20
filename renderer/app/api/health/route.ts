import { NextResponse } from "next/server";
import { llmService } from "@/lib/llm";
import { mcpClient } from "@/lib/mcp";

export async function GET() {
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

  const activeConfig = llmService.activeConfig;
  const chatEnabled = llmService.isChatEnabled();
  const showToolInvocations =
    process.env.SHOW_TOOL_INVOCATIONS === "true" ||
    process.env.SHOW_TOOLS === "true" ||
    process.env.DEBUG_TOOLS === "true";

  return NextResponse.json({
    status: "ok",
    provider: activeConfig.provider,
    model: activeConfig.model,
    chatEnabled,
    llmConfigured: chatEnabled,
    llmError: chatEnabled
      ? undefined
      : `AI Assistant is disabled (ENABLE_CHAT=false or missing API key for '${activeConfig.provider}').`,
    mcpConnected: tools.length > 0,
    toolsCount: tools.length,
    showToolInvocations,
    docSets,
  });
}
