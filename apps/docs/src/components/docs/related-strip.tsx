import { relatedFor, type RelatedPage } from "../../lib/related";

/**
 * The related components a package page cannot link itself.
 *
 * `MISSION.md` asks every component page for its related components. A curated
 * page writes the section; a package page is Markdown the site mounts and has no
 * way to resolve its siblings, so the site prints the family from
 * `src/lib/related.ts` at the end of the page.
 *
 * Thirty-one package pages already write `## Related` themselves, so the strip
 * takes the anchors of the page's own headings — the `#related` anchor a written
 * section produces — and stays silent where the author did the work. A page with
 * no family (`related.ts`'s argued solos) renders nothing rather than an empty
 * box.
 */
export function RelatedStrip({
  url,
  sections = [],
}: {
  readonly url: string;
  /** The page's own heading anchors, so a written section is not repeated. */
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
