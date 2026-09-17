import { redirect } from "next/navigation";
import { fetchToc, isPropsObject, resolveHref, type AstArray } from "@/lib/api";

function firstHref(entries: AstArray[]): string | undefined {
  for (const [, maybeProps, ...rest] of entries) {
    const hasProps = isPropsObject(maybeProps);
    const href = hasProps ? (maybeProps as { href?: string }).href : undefined;
    if (href) return href;
    const children = (hasProps ? rest : [maybeProps, ...rest].filter((v) => v !== undefined)) as AstArray[];
    const nested = firstHref(children);
    if (nested) return nested;
  }
  return undefined;
}

export default async function HomePage() {
  const toc = await fetchToc().catch(() => ({ toc: [] as AstArray[] }));
  const href = firstHref(toc.toc);

  if (href) {
    redirect(resolveHref(href) as string);
  }

  return <p>No pages found. Point the backend&apos;s DATA_DIR at a dita2bootstrap-ast output directory.</p>;
}
