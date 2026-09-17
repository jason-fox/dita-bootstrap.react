import { Col, Row } from "react-bootstrap";
import { notFound } from "next/navigation";
import AstRenderer from "@/components/AstRenderer";
import Breadcrumbs from "@/components/Breadcrumbs";
import Scrollspy from "@/components/Scrollspy";
import { fetchPage, fetchToc } from "@/lib/api";

export default async function ViewPage({
  params,
}: {
  params: Promise<{ file: string[] }>;
}) {
  const { file } = await params;
  const [doc, toc] = await Promise.all([
    fetchPage(file.join("/")).catch(() => null),
    fetchToc().catch(() => null),
  ]);

  if (!doc) {
    notFound();
  }

  const article = (
    <article>
      {doc.meta.breadcrumbs && <Breadcrumbs items={doc.meta.breadcrumbs} />}
      {doc.meta.title && <h1>{doc.meta.title}</h1>}
      {doc.meta.shortdesc && (
        <p className="shortdesc text-body-secondary lead">
          {doc.meta.shortdesc}
        </p>
      )}
      <AstRenderer nodes={doc.content} />
    </article>
  );

  // three-panel layout (TOC sidebar + content + scrollspy) only when this topic actually has an
  // "on this page" nav - matches the real plugin only emitting .bs-scrollspy when relevant.
  if (!doc.scrollspy) {
    return article;
  }

  return (
    <Row>
      <Col lg={8}>{article}</Col>
      <Col lg={4} as="aside" className="d-none d-lg-block">
        <Scrollspy entries={doc.scrollspy} variant={toc?.scrollspyToc} />
      </Col>
    </Row>
  );
}
