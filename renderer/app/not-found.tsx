import Link from "next/link";
import Shell from "@/components/Shell";
import { fetchChrome } from "@/lib/api";

export default async function NotFound() {
  const chrome = await fetchChrome().catch(() => null);

  return (
    <Shell
      title={chrome?.["docs-page"]?.title ?? "Documentation"}
      headerAst={chrome?.["docs-page"]?.header}
      footerAst={chrome?.footer}
      texts={chrome?.texts}
    >
      <div className="text-center py-5 col-lg-6 mx-auto">
        <i className="bi bi-exclamation-circle display-4 text-secondary mb-3 d-block" />
        <h2 className="h3 mb-3">Page Not Found</h2>
        <p className="text-body-secondary mb-4">
          The page or documentation set you requested could not be found.
        </p>
        <Link href="/" className="btn btn-primary">
          Return to Documentation
        </Link>
      </div>
    </Shell>
  );
}
