import type { DocsAreaMeta } from "../developer-docs";

/**
 * The active area's section anchors, nested under its entry in the area
 * navigation. Unnumbered, so the two levels read as sequence and contents.
 */
export function DocsSectionNav({ area }: { area: DocsAreaMeta }) {
  return (
    <ul
      aria-label={`Sections in ${area.label}`}
      className="mt-1 mb-2 ml-[1.125rem] space-y-0.5 border-l pl-2"
    >
      {area.sections.map((section) => (
        <li key={section.id}>
          <a
            href={`#${section.id}`}
            className="block rounded-md px-2 py-1 text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {section.title}
          </a>
        </li>
      ))}
    </ul>
  );
}
