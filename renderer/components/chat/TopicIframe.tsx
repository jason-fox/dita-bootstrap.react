"use client";

import { useCallback, useEffect, useRef } from "react";
import type { TopicViewerPayload } from "@/types/mcp";

export default function TopicIframe({
  payload,
  height = "480px",
  previewMode = true,
}: {
  payload: TopicViewerPayload;
  height?: string;
  previewMode?: boolean;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const retryTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const mcpServerUrl =
    process.env.NEXT_PUBLIC_MCP_SERVER_URL || "http://localhost:4001";
  const viewerUrl = `${mcpServerUrl.replace(/\/mcp\/?$/, "")}/viewer`;

  const clearRetries = useCallback(() => {
    retryTimers.current.forEach(clearTimeout);
    retryTimers.current = [];
  }, []);

  const sendPayload = useCallback(() => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      const clonedPayload = JSON.parse(JSON.stringify(payload));
      clonedPayload.previewMode = previewMode;
      const hostTheme =
        document.documentElement.getAttribute("data-bs-theme") || "light";
      clonedPayload.theme = hostTheme;
      iframeRef.current.contentWindow.postMessage(
        { type: "SET_PAYLOAD", payload: clonedPayload },
        "*",
      );
    }
  }, [payload, previewMode]);

  // the iframe app acks once SET_PAYLOAD lands, so we can stop retrying below -
  // otherwise a late retry can clobber a topic the user already navigated to.
  useEffect(() => {
    const handleAck = (event: MessageEvent) => {
      if (
        event.data?.type === "PAYLOAD_ACK" &&
        event.source === iframeRef.current?.contentWindow
      ) {
        clearRetries();
      }
    };
    window.addEventListener("message", handleAck);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "data-bs-theme"
        ) {
          sendPayload();
        }
      }
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-bs-theme"],
    });

    return () => {
      window.removeEventListener("message", handleAck);
      observer.disconnect();
      clearRetries();
    };
  }, [sendPayload, clearRetries]);

  return (
    <iframe
      ref={iframeRef}
      src={viewerUrl}
      className="w-100 border-0 d-block"
      style={{ height }}
      onLoad={() => {
        clearRetries();
        sendPayload();
        retryTimers.current = [150, 400, 900].map((delay) =>
          setTimeout(sendPayload, delay),
        );
      }}
    />
  );
}
