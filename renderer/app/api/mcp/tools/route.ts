import { NextResponse } from "next/server";
import { mcpClient } from "@/lib/mcp";

export async function GET() {
  const tools = await mcpClient.listTools();
  return NextResponse.json({ tools });
}
