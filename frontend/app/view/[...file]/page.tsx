import { notFound } from "next/navigation";
import AstRenderer from "@/components/AstRenderer";
import { fetchPage } from "@/lib/api";

export default async function ViewPage({ params }: { params: Promise<{ file: string[] }> }) {
  const { file } = await params;
  const doc = await fetchPage(file.join("/")).catch(() => null);

  if (!doc) {
    notFound();
  }

  return (
    <article>
      {doc.meta.title && <h1>{doc.meta.title}</h1>}
      {doc.meta.shortdesc && <p className="shortdesc text-body-secondary lead">{doc.meta.shortdesc}</p>}
      <AstRenderer nodes={doc.content} />
    </article>
  );
}
