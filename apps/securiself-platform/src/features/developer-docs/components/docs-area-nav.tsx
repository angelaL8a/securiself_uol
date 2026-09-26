"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { DOCS_AREAS, docsAreaHref } from "../developer-docs";
import { DocsSectionNav } from "./docs-section-nav";

/** `01`–`09`: the area's position in the integration sequence. */
function areaNumber(index: number) {
  return String(index + 1).padStart(2, "0");
}

/**
 * The numbered areas, with the active area's sections nested beneath it.
 *
 * The number stays in each link's accessible name ("01 Overview"), so the
 * visible label and the spoken name match, and an area link never shares its
 * name with a section link of the same title.
 */
function DocsAreaList({ pathname }: { pathname: string }) {
  return (
    <ol className="space-y-1 text-sm">
      {DOCS_AREAS.map((area, index) => {
        const href = docsAreaHref(area.slug);
        const active = pathname === href;
        return (
          <li key={area.slug || "overview"}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex gap-2.5 rounded-md border-l-2 px-2 py-1.5 transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "border-primary bg-accent font-semibold text-foreground"
                  : "border-transparent text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "text-xs leading-5 tabular-nums",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                {areaNumber(index)}
              </span>{" "}
              <span>{area.label}</span>
            </Link>
            {active ? <DocsSectionNav area={area} /> : null}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Documentation navigation: a sticky vertical sidebar beside the content on
 * large screens, and a disclosure above it on smaller ones.
 *
 * Plain links, not an ARIA tablist: each area is its own route, so browser
 * back/forward, deep links and normal tab-key traversal all work without any
 * custom keyboard handling.
 */
export function DocsAreaNav() {
  const pathname = usePathname();
  const activeIndex = DOCS_AREAS.findIndex(
    (area) => docsAreaHref(area.slug) === pathname,
  );
  const active = DOCS_AREAS[activeIndex];

  return (
    // top-24 clears the h-16 sticky Console topbar with the page's own spacing.
    <div className="lg:sticky lg:top-24">
      {/* Keyed by route so the disclosure closes after choosing an area. */}
      <details key={pathname} className="group rounded-lg border lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm font-medium [&::-webkit-details-marker]:hidden">
          <span>
            <span className="text-muted-foreground">Documentation</span>
            {active ? (
              <>
                {" · "}
                <span className="tabular-nums">{areaNumber(activeIndex)}</span>{" "}
                {active.label}
              </>
            ) : null}
          </span>
          <ChevronDown
            className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>
        <nav
          aria-label="Documentation areas (compact)"
          className="border-t px-1 py-2"
        >
          <DocsAreaList pathname={pathname} />
        </nav>
      </details>

      <nav aria-label="Documentation areas" className="hidden lg:block">
        <DocsAreaList pathname={pathname} />
      </nav>
    </div>
  );
}
