import { sectionsFor } from "@/component-meta/contract";
import type { ComponentMetaInput } from "@/component-meta/schema";

/**
 * The published component-page template (plan 487). The section lists come from
 * the same `sectionsFor` the page guard enforces, so the documentation cannot
 * drift from `component-pages.test.ts`.
 */
export const patternTemplates = (): ReadonlyArray<{
  readonly pattern: ComponentMetaInput["pattern"];
  readonly note: string;
  readonly sections: readonly string[];
}> =>
  [
    {
      pattern: "static" as const,
      note: "One file, one API — the default for every delivered component.",
    },
    {
      pattern: "stateful" as const,
      note: "A compound surface that owns open or selected state.",
    },
    {
      pattern: "workspace" as const,
      note: "A panel/docking surface with persisted layout; needs a playground screen.",
    },
  ].map((entry) => ({ ...entry, sections: sectionsFor(entry.pattern) }));

export function PageTemplateSections() {
  return (
    <div className="not-prose my-4 grid gap-3 md:grid-cols-3">
      {patternTemplates().map((template) => (
        <section
          key={template.pattern}
          className="rounded-md border border-fd-border bg-fd-card p-3"
          data-pattern={template.pattern}
        >
          <h3 className="mb-1 flex items-baseline justify-between gap-2 text-sm font-medium">
            <code>{template.pattern}</code>
            <span className="text-xs font-normal text-fd-muted-foreground">
              {template.sections.length} sections
            </span>
          </h3>
          <p className="mb-3 text-xs text-fd-muted-foreground">
            {template.note}
          </p>
          <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm">
            {template.sections.map((section) => (
              <li key={section}>{section}</li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
