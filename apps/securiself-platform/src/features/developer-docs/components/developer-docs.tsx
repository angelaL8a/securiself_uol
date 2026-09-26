import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DOCS_AREAS,
  docsAreaHref,
  type DocsAreaMeta,
} from "../developer-docs";
import { DOCS_AREA_CONTENT } from "./docs-areas";

/**
 * One documentation area: its lead sentence and its content, followed by
 * sequential links to the neighbouring areas. Its section links are nested
 * under the active entry of the layout's area navigation.
 */
export function DocsAreaView({ area }: { area: DocsAreaMeta }) {
  const Content = DOCS_AREA_CONTENT[area.slug];
  const index = DOCS_AREAS.indexOf(area);
  const previous = DOCS_AREAS[index - 1];
  const next = DOCS_AREAS[index + 1];

  return (
    <div className="space-y-8">
      <p className="max-w-3xl text-sm text-muted-foreground">{area.summary}</p>

      <div className="min-w-0 space-y-12">
        <Content />
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
