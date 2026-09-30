"use client";

import { useEffect, useRef } from "react";
import Accordion from "react-bootstrap/Accordion";
import Alert from "react-bootstrap/Alert";
import Spinner from "react-bootstrap/Spinner";
import { AstRenderer, type AstArray, type TopicViewerPayload } from "@dita-bootstrap/ast-ui";
import { renderMarkdown } from "@/lib/markdown";
import TopicPreviewCard from "./TopicPreviewCard";
import type { ActiveModalTopic, ChatMessage } from "./types";

export default function MessageList({
  messages,
  isLoading,
  error,
  isLlmDisabled,
  showToolInvocations,
  welcomeCardAst,
  title,
  onSendPrompt,
  onExpandTopic,
}: {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  isLlmDisabled: boolean;
  showToolInvocations: boolean;
  welcomeCardAst?: AstArray;
  title: string;
  onSendPrompt: (text: string) => void;
  onExpandTopic: (topic: ActiveModalTopic) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    containerRef.current?.scrollTo({
      top: containerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isLoading]);

  return (
    <div
      ref={containerRef}
      className="flex-grow-1 overflow-y-auto mb-3 p-3 bg-body rounded border"
      style={{ minHeight: "350px" }}
    >
      {messages.length === 0 ? (
        <div className="py-4 my-auto">
          {welcomeCardAst && (
            <div className="max-w-xl mx-auto mb-4" style={{ maxWidth: "700px" }}>
              <AstRenderer nodes={[welcomeCardAst]} title={title} onSendPrompt={onSendPrompt} />
            </div>
          )}
        </div>
      ) : (
        messages.map((msg, index) => {
          const hasInteractive = msg.toolResults && msg.toolResults.some((tr) => tr.toolName === "render_topic_ui");

          return (
            <div
              key={index}
              className={`d-flex mb-3 ${msg.role === "user" ? "justify-content-end" : "justify-content-start w-100"}`}
            >
              <div
                className={
                  msg.role === "user"
                    ? "chat-bubble-user p-3 shadow-sm"
                    : `chat-bubble-assistant p-3 shadow-sm ${hasInteractive ? "mw-100 w-100" : ""}`
                }
              >
                {msg.role === "user" ? (
                  msg.content
                ) : (
                  <>
                    {showToolInvocations && msg.toolResults && msg.toolResults.length > 0 && (
                      <Accordion className="mb-3">
                        {msg.toolResults.map((tr, tIdx) => (
                          <Accordion.Item key={tIdx} eventKey={String(tIdx)} className="border-0 bg-transparent">
                            <Accordion.Header className="py-0">
                              <small className="text-primary font-monospace">
                                <i className="bi bi-tools me-1" />
                                Tool called: <strong>{tr.toolName}</strong>
                              </small>
                            </Accordion.Header>
                            <Accordion.Body className="p-2 small bg-body border rounded">
                              <div className="mb-1">
                                <strong>Arguments:</strong>
                                <pre
                                  className="p-2 bg-body-tertiary rounded mb-2 font-monospace"
                                  style={{ fontSize: "0.8em" }}
                                >
                                  {JSON.stringify(tr.args, null, 2)}
                                </pre>
                              </div>
                            </Accordion.Body>
                          </Accordion.Item>
                        ))}
                      </Accordion>
                    )}

                    {msg.content && (
                      <div
                        className="markdown-body"
                        dangerouslySetInnerHTML={{
                          __html: renderMarkdown(msg.content),
                        }}
                      />
                    )}

                    {msg.toolResults &&
                      msg.toolResults.map((tr, trIdx) => {
                        if (tr.toolName !== "render_topic_ui") return null;
                        try {
                          const contentText = tr.result?.content?.find((c) => c.type === "text")?.text;
                          if (!contentText) return null;
                          const payload: TopicViewerPayload = JSON.parse(contentText);
                          const docTitle = payload.toc?.title || payload.docId;
                          const pageTitle =
                            payload.doc?.meta?.title || (tr.args?.topicPath as string | undefined) || "Topic Viewer";
                          const titleText =
                            docTitle && docTitle !== pageTitle ? `${docTitle} | ${pageTitle}` : pageTitle;

                          return (
                            <TopicPreviewCard
                              key={trIdx}
                              payload={payload}
                              onExpand={() => onExpandTopic({ title: titleText, payload })}
                            />
                          );
                        } catch {
                          return null;
                        }
                      })}
                  </>
                )}
              </div>
            </div>
          );
        })
      )}

      {isLoading && (
        <div className="d-flex justify-content-start mb-3">
          <div className="chat-bubble-assistant p-3 small text-secondary d-flex align-items-center gap-2">
            <Spinner animation="border" size="sm" variant="primary" />
            <span>Thinking...</span>
          </div>
        </div>
      )}

      {error && !isLlmDisabled && (
        <Alert variant="danger" className="my-2 py-2 px-3">
          <i className="bi bi-exclamation-triangle-fill me-2" />
          {error}
        </Alert>
      )}
    </div>
  );
}
