import { relatedFor, type RelatedPage } from "../../lib/related";

export function RelatedStrip({
  url,
  sections = [],
}: {
  readonly url: string;

  readonly sections?: ReadonlyArray<string>;
}) {
  if (sections.includes("#related")) return null;

  const related = relatedFor(url);
  if (related === undefined) return null;

  return (
    <nav
      aria-label={`Related: ${related.family.name}`}
      className="not-prose my-6 rounded-xl border border-border bg-muted/40 px-3 py-3 text-xs text-muted-foreground"
      data-related={related.family.name}
    >
      <p className="m-0 mb-2 font-medium text-foreground">
        Related · {related.family.name}
      </p>
      <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0">
        {related.pages.map((member: RelatedPage) => (
          <li className="m-0" key={member.href}>
            <a
              className="text-foreground underline underline-offset-2"
              href={member.href}
            >
              {member.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
