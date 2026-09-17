import { readFile } from "node:fs/promises";
import path from "node:path";
import Link from "next/link";
import { fetchDocs, type DocSetInfo } from "@/lib/api";
import Shell from "@/components/Shell";
import Card from "react-bootstrap/Card";
import CardBody from "react-bootstrap/CardBody";
import CardTitle from "react-bootstrap/CardTitle";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";

async function fetchPublicFragment(file: string): Promise<string> {
  return readFile(path.join(process.cwd(), "public", file), "utf-8").catch(
    () => "",
  );
}

export default async function HomePage() {
  const [docs, headerHtml, navLinksHtml] = await Promise.all([
    fetchDocs(),
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
      <div className="py-4">
        {docs.length === 0 ? (
          <div className="text-center py-5 alert alert-info col-lg-8 mx-auto">
            <i className="bi bi-info-circle display-6 d-block mb-3" />
            <h4>No Documentation Sets Found</h4>
            <p className="mb-0">
              Ensure the backend is running and point <code>DATA_DIR</code> at output directories containing <code>toc.json</code>.
            </p>
          </div>
        ) : (
          <Row xs={2} md={4} className="g-4">

            {docs.map((doc) => (
              <Col key={doc.id}>
                <Card className="h-100 shadow-sm border-0 bg-body-tertiary">
                  <CardBody className="d-flex flex-column">
                    <div className="mb-2">
                      <CardTitle className="h5 mb-0">
                        {doc.title}
                      </CardTitle>
                    </div>
                    {doc.description && (
                      <p className="card-text text-body-secondary small mb-3">
                        {doc.description}
                      </p>
                    )}
                    <div className="mt-auto pt-3">
                      <Link
                        href={`/view/${doc.id}`}
                        className="btn btn-primary"
                      >
                        Browse
                      </Link>

                    </div>
                  </CardBody>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </div>
    </Shell>
  );
}




