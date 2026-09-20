import { NextResponse } from "next/server";
import { llmService } from "@/lib/llm";
import { mcpClient } from "@/lib/mcp";

export async function POST(req: Request) {
  if (!llmService.isChatEnabled()) {
    return NextResponse.json({ error: "AI Assistant Chat is disabled." }, { status: 404 });
  }

  try {
    const body = await req.json();
    const { message, history = [] } = body;

    if (!message) {
      return NextResponse.json({ error: "Missing required 'message' in request body." }, { status: 400 });
    }

    const response = await llmService.generateResponse(message, history, mcpClient);
    return NextResponse.json({
      reply: response.text,
      toolResults: response.toolResults,
      provider: llmService.activeConfig.provider,
      model: llmService.activeConfig.model,
    });
  } catch (error: any) {
    console.error("Error in /api/chat:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
