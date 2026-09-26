import type { DocsSectionMeta } from "../developer-docs";

interface DocsSectionNavProps {
  sections: DocsSectionMeta[];
  /** Distinguishes the desktop and compact navigation landmarks. */
  label: string;
}

/** In-area section links. Rendered inside a sticky aside on desktop. */
export function DocsSectionNav({ sections, label }: DocsSectionNavProps) {
  return (
    <nav aria-label={label}>
      <ol className="space-y-1 text-sm">
        {sections.map((section, index) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              className="flex gap-2 rounded-md px-2 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="tabular-nums text-xs leading-5">
                {index + 1}.
              </span>
              <span>{section.title}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
