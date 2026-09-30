"use client";

import { useState } from "react";
import Alert from "react-bootstrap/Alert";
import Modal from "react-bootstrap/Modal";
import Shell from "@/components/layout/Shell";
import { useChat } from "@/hooks/useChat";
import type { ChromeConfig } from "@dita-bootstrap/ast-ui";
import ChatInput from "./ChatInput";
import MessageList from "./MessageList";
import TopicIframe from "./TopicIframe";
import type { ActiveModalTopic } from "./types";
import "@/styles/chat.css";

export default function ChatView({ chrome }: { chrome: ChromeConfig }) {
  const chat = useChat();
  const [activeModal, setActiveModal] = useState<ActiveModalTopic | null>(null);

  const chatBotConfig = chrome["chat-bot"];
  const docsPageConfig = chrome["docs-page"];
  const chatTitle = chatBotConfig?.title || docsPageConfig?.title || "AI Assistant";

  return (
    <Shell
      title={chatTitle}
      headerAst={chatBotConfig?.header ?? docsPageConfig?.header}
      footerAst={chrome.footer}
      texts={chrome.texts}
      onClearChat={chat.clear}
    >
      <div className="py-3 flex-grow-1 d-flex flex-column" style={{ maxHeight: "calc(100vh - 120px)" }}>
        {chat.isLlmDisabled && (
          <Alert variant="warning" className="mb-3 border-warning shadow-sm">
            <Alert.Heading className="h6 mb-1 d-flex align-items-center gap-2">
              <i className="bi bi-exclamation-triangle-fill text-warning" />
              AI Assistant Disabled
            </Alert.Heading>
            <p className="mb-0 small">
              {chat.health?.llmError ||
                `No API key configured for provider '${chat.health
                  ?.provider}'. Set ${chat.health?.provider?.toUpperCase()}_API_KEY in your environment to enable AI Chat.`}
            </p>
          </Alert>
        )}

        <MessageList
          messages={chat.messages}
          isLoading={chat.isLoading}
          error={chat.error}
          isLlmDisabled={chat.isLlmDisabled}
          showToolInvocations={chat.showToolInvocations}
          welcomeCardAst={chatBotConfig?.card}
          title={chatTitle}
          onSendPrompt={(text) => chat.send(text)}
          onExpandTopic={setActiveModal}
        />

        <ChatInput
          value={chat.input}
          onChange={chat.setInput}
          onSubmit={() => chat.send()}
          isLoading={chat.isLoading}
          isLlmDisabled={chat.isLlmDisabled}
        />
      </div>

      {activeModal && (
        <Modal
          show
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
