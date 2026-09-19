import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { useApp } from "@modelcontextprotocol/ext-apps/react";
import type { CallToolResult } from "@modelcontextprotocol/client";
import TopicPage, { type TopicPageProps } from "./TopicPage";

function extractPayload(result: any): TopicPageProps | null {
  if (!result) return null;
  if (result.doc && result.topicPath) return result as TopicPageProps;
  const text = result?.content?.find((c: any) => c.type === "text")?.text;
  if (!text) return null;
  try {
    return JSON.parse(text) as TopicPageProps;
  } catch {
    return null;
  }
}

function applyPayload(payload: TopicPageProps) {
  const docTitle = payload.toc?.title || payload.docId;
  const pageTitle = (payload.doc.meta.title as string) || payload.topicPath;
  const title = docTitle && docTitle !== pageTitle ? `${docTitle} | ${pageTitle}` : pageTitle;
  document.title = title;
  document.documentElement.dataset.bsTheme = payload.theme ?? "light";
  const lang = (payload.doc.meta?.lang as string) || (payload.toc as any)?.lang;
  if (lang) {
    document.documentElement.lang = lang;
  }
}

function AppShell() {
  const [data, setData] = useState<TopicPageProps | null>(null);
  const [resultError, setResultError] = useState<string | null>(null);

  React.useEffect(() => {
    const handleWindowMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "SET_PAYLOAD" && event.data.payload) {
        const payload = extractPayload(event.data.payload);
        if (payload) {
          applyPayload(payload);
          setData(payload);
          setResultError(null);
        }
      }
    };
    window.addEventListener("message", handleWindowMessage);
    return () => window.removeEventListener("message", handleWindowMessage);
  }, []);

  const { app, isConnected, error } = useApp({
    appInfo: { name: "dita-docs-topic-viewer", version: "1.0.0" },
    capabilities: {},
    onAppCreated: (createdApp) => {
      createdApp.ontoolresult = (result) => {
        if (result.isError) {
          setResultError("Failed to load topic content.");
          return;
        }
        const payload = extractPayload(result as CallToolResult);
        if (!payload) {
          setResultError("Received an unreadable response from render_topic_ui.");
          return;
        }
        applyPayload(payload);
        setData(payload);
        setResultError(null);
      };
    },
  });

  const handleNavigate = async (docId: string, topicPath: string, theme?: string) => {
    try {
      const currentToc = data?.toc;
      if (app && isConnected) {
        const result = await app.callServerTool({
          name: "render_topic_ui",
          arguments: { docId, topicPath, theme: theme ?? "light" },
        });
        if (!result.isError) {
          const payload = extractPayload(result);
          if (payload) {
            if (!payload.toc && currentToc) payload.toc = currentToc;
            applyPayload(payload);
            setData(payload);
            setResultError(null);
            return;
          }
        }
      }

      // Standalone iframe fallback: fetch topic doc and preserve/fetch TOC
      const normalizedPath = topicPath.endsWith(".json") ? topicPath : `${topicPath}.json`;
      const dataUrl = `${window.location.protocol}//${window.location.hostname}:4000/data/${docId}/${normalizedPath}`;
      const res = await fetch(dataUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status} loading ${topicPath}`);
      const doc = await res.json();

      let toc = currentToc;
      if (!toc) {
        const tocRes = await fetch(`${window.location.protocol}//${window.location.hostname}:4000/data/${docId}/toc.json`).catch(() => null);
        if (tocRes && tocRes.ok) toc = await tocRes.json();
      }

      const payload: TopicPageProps = { docId, topicPath, doc, toc, theme: (theme as any) || "light" };
      applyPayload(payload);
      setData(payload);
      setResultError(null);
    } catch (err) {
      setResultError(err instanceof Error ? err.message : String(err));
    }
  };

  if (data) {
    return <TopicPage {...data} onNavigate={handleNavigate} />;
  }
  if (error) {
    return <div className="alert alert-danger m-3">Connection failed: {error.message}</div>;
  }
  if (!isConnected) {
    return <div className="p-4 text-body-secondary">Connecting…</div>;
  }
  if (resultError) {
    return <div className="alert alert-danger m-3">{resultError}</div>;
  }
  return <div className="p-4 text-body-secondary">Loading…</div>;
}

const container = document.getElementById("mcp-ui-root");
if (container) {
  createRoot(container).render(<AppShell />);
}
