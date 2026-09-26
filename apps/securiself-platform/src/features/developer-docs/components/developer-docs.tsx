import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DOCS_AREAS,
  docsAreaHref,
  type DocsAreaMeta,
} from "../developer-docs";
import { DOCS_AREA_CONTENT } from "./docs-areas";
import { DocsSectionNav } from "./docs-section-nav";

/**
 * One documentation area: its lead sentence, its local section navigation and
 * its content, followed by sequential links to the neighbouring areas.
 *
 * The section navigation is only rendered for areas with more than one
 * section — a sticky list of one entry is noise, not orientation.
 */
export function DocsAreaView({ area }: { area: DocsAreaMeta }) {
  const Content = DOCS_AREA_CONTENT[area.slug];
  const showSectionNav = area.sections.length > 1;
  const index = DOCS_AREAS.indexOf(area);
  const previous = DOCS_AREAS[index - 1];
  const next = DOCS_AREAS[index + 1];

  return (
    <div className="space-y-8">
      <p className="max-w-3xl text-sm text-muted-foreground">{area.summary}</p>

      {showSectionNav ? (
        <details className="rounded-lg border px-3 py-2 lg:hidden">
          <summary className="cursor-pointer text-sm font-medium">
            On this page
          </summary>
          <div className="pt-2">
            <DocsSectionNav
              sections={area.sections}
              label="Documentation sections (compact)"
            />
          </div>
        </details>
      ) : null}

      <div
        className={
          showSectionNav
            ? "lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:items-start lg:gap-10"
            : undefined
        }
      >
        {showSectionNav ? (
          // top-32 clears the sticky Console topbar and the sticky docs tabs.
          <aside className="hidden lg:sticky lg:top-32 lg:block">
            <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              On this page
            </p>
            <DocsSectionNav
              sections={area.sections}
              label="Documentation sections"
            />
          </aside>
        ) : null}

        <div className="min-w-0 space-y-12">
          <Content />
        </div>
      </div>

      <nav
        aria-label="Documentation sequence"
        className="flex flex-wrap justify-between gap-2 border-t pt-4"
      >
        {previous ? (
          <Button asChild variant="ghost" size="sm">
            <Link href={docsAreaHref(previous.slug)}>
              <ArrowLeft className="size-4" aria-hidden="true" />
              Previous: {previous.label}
            </Link>
          </Button>
        ) : (
          <span />
        )}
        {next ? (
          <Button asChild variant="ghost" size="sm">
            <Link href={docsAreaHref(next.slug)}>
              Next: {next.label}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        ) : null}
      </nav>
    </div>
  );
}
