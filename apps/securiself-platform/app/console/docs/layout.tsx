import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { DocsAreaNav } from "@/features/developer-docs/components/docs-area-nav";
import { routes } from "@/lib/routes";

/**
 * Shell shared by every documentation area: the page heading and the area
 * navigation stay mounted while the active area's route changes. On large
 * screens the navigation is a sticky sidebar left of the content.
 */
export default function DeveloperDocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Developer Docs"
        description="How a third-party application integrates with SecuriSelf: registering an application, obtaining a context-bound access token and reading the filtered profile."
        actions={
          <Button asChild variant="outline">
            <Link href={routes.console.newClient}>Register an application</Link>
          </Button>
        }
      />
      <div className="space-y-6 lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start lg:gap-10 lg:space-y-0">
        <DocsAreaNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
