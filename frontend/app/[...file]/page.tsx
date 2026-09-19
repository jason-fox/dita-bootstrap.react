import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";

import { notFound, redirect } from "next/navigation";
import AstRenderer from "@/components/AstRenderer";
import Breadcrumbs from "@/components/Breadcrumbs";
import Scrollspy from "@/components/Scrollspy";
import Shell from "@/components/Shell";
import {
  fetchDocs,
  fetchPage,
  fetchToc,
  isPropsObject,
  matchDocSet,
  resolveHref,
  type AstArray,
} from "@/lib/api";

async function fetchPublicFragment(file: string): Promise<string> {
  return readFile(path.join(process.cwd(), "public", file), "utf-8").catch(
    () => "",
  );
}

function firstHref(entries: AstArray[]): string | undefined {
  for (const [, maybeProps, ...rest] of entries) {
    const hasProps = isPropsObject(maybeProps);
    const href = hasProps ? (maybeProps as { href?: string }).href : undefined;
    if (href) return href;
    const children = (
      hasProps ? rest : [maybeProps, ...rest].filter((v) => v !== undefined)
    ) as AstArray[];
    const nested = firstHref(children);
    if (nested) return nested;
  }
  return undefined;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ file: string[] }>;
}): Promise<Metadata> {
  const { file } = await params;
  const docs = await fetchDocs();
  const { docId, topicPath } = matchDocSet(file, docs);

  if (!topicPath) return {};

  const doc = await fetchPage(docId, topicPath).catch(() => null);
  if (!doc) return {};

  const { title, shortdesc } = doc.meta;
  return {
    title,
    description: shortdesc,
    openGraph: { title, description: shortdesc, type: "article" },
    twitter: { card: "summary", title, description: shortdesc },
  };
}

export default async function ViewPage({
  params,
}: {
  params: Promise<{ file: string[] }>;
}) {
  const { file } = await params;
  const [docs, headerHtml, navLinksHtml] = await Promise.all([
    fetchDocs(),
    fetchPublicFragment("header.html"),
    fetchPublicFragment("nav-links.html"),
  ]);
  const { docId, topicPath } = matchDocSet(file, docs);

  const toc = await fetchToc(docId).catch(() => null);

  // If visiting the root of a doc set (e.g. /dita-bootstrap-sample), redirect to its first topic
  if (!topicPath && toc) {
    const initialHref = firstHref(toc.toc);
    if (initialHref) {
      redirect(resolveHref(initialHref, docId) as string);
    }
  }

  const doc = topicPath ? await fetchPage(docId, topicPath).catch(() => null) : null;

  if (!doc) {
    notFound();
  }

  const article = (
    <article>
      {doc.meta.breadcrumbs && <Breadcrumbs items={doc.meta.breadcrumbs} docId={docId} />}
      {doc.meta.title && <h1>{doc.meta.title}</h1>}
      {doc.meta.shortdesc && (
        <p className="shortdesc text-body-secondary lead">
          {doc.meta.shortdesc}
        </p>
      )}
      <AstRenderer nodes={doc.content} docId={docId} />
    </article>
  );

  const content = !doc.scrollspy ? (
    article
  ) : (
    <Row>
      <Col lg={8}>{article}</Col>
      <Col lg={4} as="aside" className="d-none d-lg-block">
        <Scrollspy entries={doc.scrollspy} variant={toc?.scrollspyToc} />
      </Col>
    </Row>
  );

  return (
    <Shell
      title={toc?.title ?? docId}
      docId={docId}
      tocEntries={toc?.toc ?? []}
      navToc={toc?.navToc}
      headerHtml={headerHtml}
      navLinksHtml={navLinksHtml}
    >
      {content}
    </Shell>
  );
}
