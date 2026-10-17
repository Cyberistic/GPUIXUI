import { Link } from "fumadocs-core/link";
import { bySlug } from "@/component-meta/registry";

/**
 * The related-components list. A `planned` record has no page yet, so it is a
 * label rather than a link: linking it would send a reader to a 404. The link
 * appears automatically once the record stops being `planned` (plan 422).
 */
export function RelatedComponents({ slug }: { slug: string }) {
  const record = bySlug.get(slug);
  const related = record?.related ?? [];
  if (related.length === 0) return null;

  return (
    <ul className="not-prose my-4 flex flex-wrap gap-2">
      {related.map((relatedSlug) => {
        const relatedRecord = bySlug.get(relatedSlug);
        if (relatedRecord === undefined) return null;
        return (
          <li key={relatedSlug}>
            {relatedRecord.status === "planned" ? (
              <span
                data-related-planned={relatedRecord.slug}
                className="rounded-md border border-dashed border-fd-border px-2 py-1 text-sm text-fd-muted-foreground"
              >
                {relatedRecord.title} (planned)
              </span>
            ) : (
              <Link
                href={`/docs/components/${relatedSlug}`}
                className="rounded-md border border-fd-border px-2 py-1 text-sm"
              >
                {relatedRecord.title}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
