import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Form from "react-bootstrap/Form";
import Spinner from "react-bootstrap/Spinner";

export default function ChatInput({
  value,
  onChange,
  onSubmit,
  isLoading,
  isLlmDisabled,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  isLlmDisabled: boolean;
}) {
  return (
    <Card className="shadow-sm flex-shrink-0" id="submission-card">
      <Card.Body className="p-2">
        <Form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          id="chat-form"
          className="d-flex gap-2"
        >
          <Form.Control
            type="text"
            id="user-input"
            placeholder={
              isLlmDisabled
                ? "AI Assistant is disabled (no API key configured)"
                : "Ask a question or request a component preview..."
            }
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={isLoading || isLlmDisabled}
            className="border-0 shadow-none"
            autoComplete="off"
          />
          <Button
            type="submit"
            id="send-btn"
            variant="primary"
            disabled={isLoading || isLlmDisabled || !value.trim()}
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
  );
}
