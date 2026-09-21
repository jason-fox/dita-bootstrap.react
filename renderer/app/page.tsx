import {
  fetchChrome,
  fetchDocs,
  isPropsObject,
  type AstNode,
  type DocSetInfo,
} from "@/lib/api";
import Shell from "@/components/Shell";
import AstRenderer from "@/components/AstRenderer";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";

function populateCardAst(node: AstNode, doc: DocSetInfo): AstNode {
  if (typeof node === "string") {
    return node;
  }
  if (!Array.isArray(node)) {
    return node;
  }

  const [type, ...rest] = node;
  const hasProps = rest.length > 0 && isPropsObject(rest[0]);
  const originalProps = hasProps ? (rest[0] as Record<string, unknown>) : {};
  const children = (hasProps ? rest.slice(1) : rest) as AstNode[];

  const props: Record<string, unknown> = { ...originalProps };

  if (props.href === "#" || (props.href && typeof props.href === "string")) {
    props.href = `/${doc.id}`;
  }

  let newChildren = children.map((child) => populateCardAst(child, doc));

  if (type === "CardTitle") {
    newChildren = newChildren.map((child) => {
      if (child === "" || child === undefined) {
        return doc.title;
      }
      if (Array.isArray(child) && child[0] === "span") {
        const spanProps = isPropsObject(child[1]) ? child[1] : undefined;
        const spanChildren = isPropsObject(child[1]) ? child.slice(2) : child.slice(1);
        const spanIsEmpty =
          spanChildren.length === 0 ||
          (spanChildren.length === 1 && spanChildren[0] === "");
        if (spanIsEmpty) {
          return spanProps ? ["span", spanProps, doc.title] : ["span", doc.title];
        }
      }
      return child;
    });
  } else if (type === "CardText") {
    newChildren = newChildren.map((child) => {
      if (child === "" || child === undefined) {
        return doc.description ?? "";
      }
      if (Array.isArray(child) && child[0] === "span") {
        const spanProps = isPropsObject(child[1]) ? child[1] : undefined;
        const spanChildren = isPropsObject(child[1]) ? child.slice(2) : child.slice(1);
        const spanIsEmpty =
          spanChildren.length === 0 ||
          (spanChildren.length === 1 && spanChildren[0] === "");
        if (spanIsEmpty) {
          return spanProps
            ? ["span", spanProps, doc.description ?? ""]
            : ["span", doc.description ?? ""];
        }
      }
      return child;
    });
  }

  return hasProps ? [type, props, ...newChildren] : [type, ...newChildren];
}

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [docs, chrome] = await Promise.all([
    fetchDocs(),
    fetchChrome().catch(() => null),
  ]);

  const docsTitle = chrome?.["docs-page"]?.title ?? "Documentation";
  const headerAst = chrome?.["docs-page"]?.header;
  const cardTemplate = chrome?.["docs-page"]?.card;
  const footerAst = chrome?.footer;

  return (
    <Shell
      title={docsTitle}
      headerAst={headerAst}
      footerAst={footerAst}
    >
      <div className="py-4 flex-grow-1 d-flex flex-column">
        {docs.length === 0 ? (
          <div className="text-center py-5 alert alert-info col-lg-8 mx-auto">
            <i className="bi bi-info-circle display-6 d-block mb-3" />
            <h4>No Documentation Sets Found</h4>
            <p className="mb-0">
              Ensure the data-store is running and point <code>DATA_DIR</code> at output directories containing documentation sets.
            </p>
          </div>
        ) : (
          <Row xs={2} md={4} className="g-4">
            {docs.map((doc) => (
              <Col key={doc.id}>
                {cardTemplate && (
                  <AstRenderer nodes={[populateCardAst(cardTemplate, doc)]} />
                )}
              </Col>
            ))}
          </Row>
        )}
      </div>
    </Shell>
  );
}




