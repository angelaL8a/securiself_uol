"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { DOCS_AREAS, docsAreaHref } from "../developer-docs";

/**
 * Top-level documentation navigation: one link per focused area, pinned below
 * the Console topbar so the reader keeps both their position in the
 * integration sequence and a one-click route to any other stage.
 *
 * Plain links, not an ARIA tablist: each area is its own route, so browser
 * back/forward, deep links and normal tab-key traversal all work without any
 * custom keyboard handling.
 */
export function DocsTabs() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Documentation areas"
      className="sticky top-16 z-20 -mx-4 border-b bg-background/95 px-4 backdrop-blur sm:-mx-6 sm:px-6"
    >
      <ul className="flex gap-1 overflow-x-auto py-2">
        {DOCS_AREAS.map((area) => {
          const href = docsAreaHref(area.slug);
          const active = pathname === href;
          return (
            <li key={area.slug || "overview"}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "block whitespace-nowrap rounded-md border-b-2 px-3 py-1.5 text-sm transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "border-primary font-semibold text-foreground"
                    : "border-transparent text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {area.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
