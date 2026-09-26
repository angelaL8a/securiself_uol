import { notFound } from "next/navigation";
import { DocsAreaView } from "@/features/developer-docs/components/developer-docs";
import { DOCS_AREAS, findDocsArea } from "@/features/developer-docs/developer-docs";

/** One static route per documentation area; `/console/docs` is the index. */
export function generateStaticParams() {
  return DOCS_AREAS.map((area) => ({
    area: area.slug ? [area.slug] : [],
  }));
}

export default async function DeveloperDocsAreaPage({
  params,
}: {
  params: Promise<{ area?: string[] }>;
}) {
  const { area: segments = [] } = await params;
  const meta = segments.length > 1 ? undefined : findDocsArea(segments[0] ?? "");
  if (!meta) notFound();

  return <DocsAreaView area={meta} />;
}
