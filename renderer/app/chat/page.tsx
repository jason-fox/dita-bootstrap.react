"use client";

import { useState, useEffect, useRef } from "react";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Spinner from "react-bootstrap/Spinner";
import Badge from "react-bootstrap/Badge";
import Alert from "react-bootstrap/Alert";
import Accordion from "react-bootstrap/Accordion";
import Modal from "react-bootstrap/Modal";
import Shell from "@/components/Shell";
import AstRenderer from "@/components/AstRenderer";
import { renderMarkdown } from "@/lib/markdown";
import { fetchChrome, type ChromeConfig, type AstNode } from "@/lib/api";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  toolResults?: any[];
  provider?: string;
  model?: string;
}

interface HealthStatus {
  status: string;
  provider?: string;
  model?: string;
  llmConfigured?: boolean;
  llmError?: string;
  mcpConnected?: boolean;
  toolsCount?: number;
  showToolInvocations?: boolean;
  docSets?: any[];
}

interface ActiveModalTopic {
  title: string;
  payload: any;
}

function TopicIframe({
  payload,
  height = "480px",
  previewMode = true,
}: {
  payload: any;
  height?: string;
  previewMode?: boolean;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const retryTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const mcpServerUrl = process.env.NEXT_PUBLIC_MCP_SERVER_URL || "http://localhost:4001";
  const viewerUrl = `${mcpServerUrl.replace(/\/mcp\/?$/, "")}/viewer`;

  const clearRetries = () => {
    retryTimers.current.forEach(clearTimeout);
    retryTimers.current = [];
  };

  const sendPayload = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      const clonedPayload = JSON.parse(JSON.stringify(payload));
      clonedPayload.previewMode = previewMode;
      const hostTheme = document.documentElement.getAttribute("data-bs-theme") || "light";
      clonedPayload.theme = hostTheme;
      iframeRef.current.contentWindow.postMessage(
        { type: "SET_PAYLOAD", payload: clonedPayload },
        "*"
      );
    }
  };

  // the iframe app acks once SET_PAYLOAD lands, so we can stop retrying below -
  // otherwise a late retry can clobber a topic the user already navigated to.
  useEffect(() => {
    const handleAck = (event: MessageEvent) => {
      if (event.data?.type === "PAYLOAD_ACK" && event.source === iframeRef.current?.contentWindow) {
        clearRetries();
      }
    };
    window.addEventListener("message", handleAck);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "attributes" && mutation.attributeName === "data-bs-theme") {
          sendPayload();
        }
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-bs-theme"] });

    return () => {
      window.removeEventListener("message", handleAck);
      observer.disconnect();
      clearRetries();
    };
  }, [payload]);

  return (
    <iframe
      ref={iframeRef}
      src={viewerUrl}
      className="w-100 border-0 d-block"
      style={{ height }}
      onLoad={() => {
        clearRetries();
        sendPayload();
        retryTimers.current = [150, 400, 900].map((delay) => setTimeout(sendPayload, delay));
      }}
    />
  );
}

function TopicPreviewCard({
  payload,
  onExpand,
}: {
  payload: any;
  onExpand: () => void;
}) {
  const docTitle = payload.toc?.title || payload.docId;
  const pageTitle = payload.doc?.meta?.title || payload.topicPath || "Topic Viewer";
  const titleText = docTitle && docTitle !== pageTitle ? `${docTitle} | ${pageTitle}` : pageTitle;

  return (
    <Card className="shadow-sm mt-3 w-100 border-secondary-subtle">
      <Card.Header
        className="d-flex justify-content-between align-items-center iframe-header-clickable user-select-none bg-body-tertiary py-2"
        style={{ cursor: "pointer" }}
        onClick={onExpand}
        title="Click to view full topic in fullscreen modal"
      >
        <span className="h6 mb-0 text-body-secondary d-flex align-items-center gap-2">
          <i className="bi bi-layout-text-window-reverse" />
          {titleText}
        </span>
        <button
          type="button"
          className="btn p-0 border-0 text-body-secondary d-flex align-items-center justify-content-center"
          style={{ width: "1.5rem", height: "1.5rem" }}
          aria-label="Expand topic"
          title="Expand topic"
          onClick={(e) => {
            e.stopPropagation();
            onExpand();
          }}
        >
          <i className="bi bi-arrows-angle-expand fs-6" />
        </button>
      </Card.Header>
      <Card.Body className="p-0">
        <TopicIframe payload={payload} height="480px" previewMode={true} />
      </Card.Body>
    </Card>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [chrome, setChrome] = useState<ChromeConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<ActiveModalTopic | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchChrome()
      .then((data) => setChrome(data))
      .catch((err) => console.warn("Could not fetch chrome config:", err));

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

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, isLoading]);

  const isLlmDisabled = health?.llmConfigured === false;
  const showToolInvocations = Boolean(health?.showToolInvocations);

  const handleSend = async (e?: React.FormEvent, customMsg?: string) => {
    if (e) e.preventDefault();
    if (isLlmDisabled) return;
    const textToSend = (customMsg || inputMessage).trim();
    if (!textToSend || isLoading) return;

    setError(null);
    const userMsg: ChatMessage = { role: "user", content: textToSend };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    if (!customMsg) setInputMessage("");
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
    } catch (err: any) {
      console.error("Chat error:", err);
      setError(err.message || "Failed to generate response.");
    } finally {
      setIsLoading(false);
    }
  };

  const chatBotConfig = chrome?.["chat-bot"];
  const docsPageConfig = chrome?.["docs-page"];
  const chatTitle = chatBotConfig?.title || docsPageConfig?.title || "AI Assistant";
  const chatDescription = chatBotConfig?.description || docsPageConfig?.description || "AI Assisted Documentation Search";
  const headerAst = chatBotConfig?.header ?? docsPageConfig?.header;
  const welcomeCardAst = chatBotConfig?.card;
  const footerAst = chrome?.footer;

  return (
    <Shell
      title={chatTitle}
      headerAst={headerAst}
      footerAst={footerAst}
      texts={chrome?.texts}
      onClearChat={() => setMessages([])}
    >
      <style>{`
        .chat-bubble-user {
          max-width: 80%;
          border-radius: 1.25rem 1.25rem 0.25rem 1.25rem;
          background-color: var(--bs-primary);
          color: #fff;
        }
        .chat-bubble-assistant {
          max-width: 85%;
          border-radius: 1.25rem 1.25rem 1.25rem 0.25rem;
          background-color: var(--bs-body-bg);
          border: 1px solid var(--bs-border-color);
          color: var(--bs-body-color);
        }
        .modal-95vh {
          width: 95vw !important;
          max-width: 95vw !important;
          height: 95vh !important;
          margin: 2.5vh auto !important;
        }
        .modal-95vh .modal-content {
          height: 95vh !important;
          max-height: 95vh !important;
          display: flex !important;
          flex-direction: column !important;
        }
        .modal-95vh .modal-body {
          flex: 1 1 auto !important;
          overflow-y: hidden !important;
        }
      `}</style>

      <div className="py-3 flex-grow-1 d-flex flex-column" style={{ maxHeight: "calc(100vh - 120px)" }}>
        {/* Warning Banner if LLM is disabled */}
        {isLlmDisabled && (
          <Alert variant="warning" className="mb-3 border-warning shadow-sm">
            <Alert.Heading className="h6 mb-1 d-flex align-items-center gap-2">
              <i className="bi bi-exclamation-triangle-fill text-warning" />
              AI Assistant Disabled
            </Alert.Heading>
            <p className="mb-0 small">
              {health?.llmError || `No API key configured for provider '${health?.provider}'. Set ${health?.provider?.toUpperCase()}_API_KEY in your environment to enable AI Chat.`}
            </p>
          </Alert>
        )}

        {/* Chat History Area */}
        <div ref={chatContainerRef} className="flex-grow-1 overflow-y-auto mb-3 p-3 bg-body rounded border" style={{ minHeight: "350px" }}>
          {messages.length === 0 ? (
            <div className="py-4 my-auto">
              {welcomeCardAst && (
                <div className="max-w-xl mx-auto mb-4" style={{ maxWidth: "700px" }}>
                  <AstRenderer
                    nodes={[welcomeCardAst]}
                    title={chatTitle}
                    onSendPrompt={(promptText) => handleSend(undefined, promptText)}
                  />
                </div>
              )}
            </div>
          ) : (
            messages.map((msg, index) => {
              const hasInteractive = msg.toolResults && msg.toolResults.some((tr: any) => tr.toolName === "render_topic_ui");

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
                        {/* Tool Call Invocation Details (Only displayed when SHOW_TOOL_INVOCATIONS is enabled) */}
                        {showToolInvocations && msg.toolResults && msg.toolResults.length > 0 && (
                          <Accordion className="mb-3">
                            {msg.toolResults.map((tr: any, tIdx: number) => (
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
                                    <pre className="p-2 bg-body-tertiary rounded mb-2 font-monospace" style={{ fontSize: "0.8em" }}>
                                      {JSON.stringify(tr.args, null, 2)}
                                    </pre>
                                  </div>
                                </Accordion.Body>
                              </Accordion.Item>
                            ))}
                          </Accordion>
                        )}

                        {/* Markdown & Code-highlighted Text Content */}
                        {msg.content && (
                          <div
                            className="markdown-body"
                            dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                          />
                        )}

                        {/* Rendered Topic Iframe Card from render_topic_ui tool (Expandable to 95vh Modal) */}
                        {msg.toolResults &&
                          msg.toolResults.map((tr: any, trIdx: number) => {
                            if (tr.toolName !== "render_topic_ui") return null;
                            try {
                              const contentText = tr.result?.content?.find((c: any) => c.type === "text")?.text;
                              if (!contentText) return null;
                              const payload = JSON.parse(contentText);
                              const docTitle = payload.toc?.title || payload.docId;
                              const pageTitle = payload.doc?.meta?.title || tr.args?.topicPath || "Topic Viewer";
                              const titleText = docTitle && docTitle !== pageTitle ? `${docTitle} | ${pageTitle}` : pageTitle;

                              return (
                                <TopicPreviewCard
                                  key={trIdx}
                                  payload={payload}
                                  onExpand={() =>
                                    setActiveModal({
                                      title: titleText,
                                      payload,
                                    })
                                  }
                                />
                              );
                            } catch (err) {
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

        {/* Input Form Card matching chrome.json chatbot submission template */}
        <Card className="shadow-sm flex-shrink-0" id="submission-card">
          <Card.Body className="p-2">
            <Form onSubmit={handleSend} id="chat-form" className="d-flex gap-2">
              <Form.Control
                type="text"
                id="user-input"
                placeholder={
                  isLlmDisabled
                    ? "AI Assistant is disabled (no API key configured)"
                    : "Ask a question or request a component preview..."
                }
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                disabled={isLoading || isLlmDisabled}
                className="border-0 shadow-none"
                autoComplete="off"
              />
              <Button
                type="submit"
                id="send-btn"
                variant="primary"
                disabled={isLoading || isLlmDisabled || !inputMessage.trim()}
                className="d-flex align-items-center flex-shrink-0 px-4"
              >
                {isLoading ? (
                  <Spinner animation="border" size="sm" />
                ) : (
                  <>
                    <span>Send</span>
                    <i className="bi bi-send-fill ms-2" />
                  </>
                )}
              </Button>
            </Form>
          </Card.Body>
        </Card>
      </div>

      {/* 95vh Height Interactive Topic Modal */}
      {activeModal && (
        <Modal
          show={Boolean(activeModal)}
          onHide={() => setActiveModal(null)}
          size="xl"
          centered
          dialogClassName="modal-95vh"
          aria-labelledby="topicModalTitle"
        >
          <Modal.Header closeButton className="py-2 bg-body-tertiary border-bottom">
            <Modal.Title id="topicModalTitle" className="h5 mb-0 text-body-secondary d-flex align-items-center gap-2">
              <i className="bi bi-book-half me-1" />
              {activeModal.title}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-0">
            <TopicIframe payload={activeModal.payload} height="100%" previewMode={false} />
          </Modal.Body>
        </Modal>
      )}
    </Shell>
  );
}
