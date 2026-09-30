import Card from "react-bootstrap/Card";
import TopicIframe from "./TopicIframe";
import type { TopicViewerPayload } from "@dita-bootstrap/ast-ui";

export default function TopicPreviewCard({
  payload,
  onExpand,
}: {
  payload: TopicViewerPayload;
  onExpand: () => void;
}) {
  const docTitle = payload.toc?.title || payload.docId;
  const pageTitle =
    payload.doc?.meta?.title || payload.topicPath || "Topic Viewer";
  const titleText =
    docTitle && docTitle !== pageTitle
      ? `${docTitle} | ${pageTitle}`
      : pageTitle;

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
