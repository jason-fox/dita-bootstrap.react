"use client";

import { useEffect, useState } from "react";
import type { ChatMessage, HealthStatus } from "@/components/chat/types";

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => {
        setHealth(data);
        if (data.llmConfigured === false) {
          setError(data.llmError || `No API key configured for provider '${data.provider}'.`);
        }
      })
      .catch((err) => console.warn("Could not fetch health status:", err));
  }, []);

  const isLlmDisabled = health?.llmConfigured === false;

  const send = async (customMsg?: string) => {
    if (isLlmDisabled) return;
    const textToSend = (customMsg || input).trim();
    if (!textToSend || isLoading) return;

    setError(null);
    const updatedMessages: ChatMessage[] = [...messages, { role: "user", content: textToSend }];
    setMessages(updatedMessages);
    if (!customMsg) setInput("");
    setIsLoading(true);

    const historyForApi = updatedMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          history: historyForApi.slice(0, -1),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Server error ${res.status}`);
      }

      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: data.reply || "",
        toolResults: data.toolResults || [],
        provider: data.provider,
        model: data.model,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      console.error("Chat error:", err);
      setError((err instanceof Error && err.message) || "Failed to generate response.");
    } finally {
      setIsLoading(false);
    }
  };

  return {
    messages,
    input,
    setInput,
    isLoading,
    health,
    error,
    isLlmDisabled,
    showToolInvocations: Boolean(health?.showToolInvocations),
    send,
    clear: () => setMessages([]),
  };
}
