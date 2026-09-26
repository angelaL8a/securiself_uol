interface DocsSectionProps {
  id: string;
  title: string;
  children: React.ReactNode;
}

/** One documentation section, anchored so the in-page navigation can link to it. */
export function DocsSection({ id, title, children }: DocsSectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      // Offsets the sticky console topbar and the sticky docs tab bar.
      className="scroll-mt-32 space-y-4"
    >
      <h2
        id={`${id}-heading`}
        className="text-xl font-semibold tracking-tight"
      >
        {title}
      </h2>
      {children}
    </section>
  );
}
