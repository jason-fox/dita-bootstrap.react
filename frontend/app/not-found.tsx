import { readFile } from "node:fs/promises";
import path from "node:path";
import Link from "next/link";
import Shell from "@/components/Shell";

async function fetchPublicFragment(file: string): Promise<string> {
  return readFile(path.join(process.cwd(), "public", file), "utf-8").catch(
    () => "",
  );
}

export default async function NotFound() {
  const [headerHtml, navLinksHtml] = await Promise.all([
    fetchPublicFragment("header.html"),
    fetchPublicFragment("nav-links.html"),
  ]);

  return (
    <Shell
      title={
        process.env.NEXT_PUBLIC_DOCS_TITLE ??
        process.env.DOCS_TITLE ??
        "Documentation"
      }
      headerHtml={headerHtml}
      navLinksHtml={navLinksHtml}
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
