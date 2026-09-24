import { fetchChrome, fetchDocs } from "@/lib/api";
import HomePageClient from "@/components/HomePageClient";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [docs, chrome] = await Promise.all([
    fetchDocs(),
    fetchChrome().catch(() => null),
  ]);

  return <HomePageClient docs={docs} chrome={chrome} />;
}
