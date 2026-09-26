import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { DocsTabs } from "@/features/developer-docs/components/docs-tabs";
import { routes } from "@/lib/routes";

/**
 * Shell shared by every documentation area: the page heading and the sticky
 * area navigation stay mounted while the active area's route changes.
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
      <DocsTabs />
      {children}
    </div>
  );
}
