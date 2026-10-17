import { Link } from "fumadocs-core/link";
import { bySlug } from "@/component-meta/registry";
import type { ComponentMetaInput } from "@/component-meta/schema";

/**
 * One related record. A `planned` record has no page yet, so it is a label
 * rather than a link: linking it would send a reader to a 404. The link appears
 * automatically once the record stops being `planned` (plan 422).
 */
export function RelatedEntry({ record }: { record: ComponentMetaInput }) {
  if (record.status === "planned") {
    return (
      <span
        data-related-planned={record.slug}
        className="rounded-md border border-dashed border-fd-border px-2 py-1 text-sm text-fd-muted-foreground"
      >
        {record.title} (planned)
      </span>
    );
  }
  return (
    <Link
      href={`/docs/components/${record.slug}`}
      className="rounded-md border border-fd-border px-2 py-1 text-sm"
    >
      {record.title}
    </Link>
  );
}

/** The related-components list for a page's registry record. */
export function RelatedComponents({ slug }: { slug: string }) {
  const record = bySlug.get(slug);
  const related = (record?.related ?? []).flatMap((relatedSlug) => {
    const relatedRecord = bySlug.get(relatedSlug);
    return relatedRecord === undefined ? [] : [relatedRecord];
  });
  if (related.length === 0) return null;

  return (
    <ul className="not-prose my-4 flex flex-wrap gap-2">
      {related.map((relatedRecord) => (
        <li key={relatedRecord.slug}>
          <RelatedEntry record={relatedRecord} />
        </li>
      ))}
    </ul>
  );
}
