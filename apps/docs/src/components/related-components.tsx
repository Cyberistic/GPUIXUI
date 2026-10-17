import { Link } from "fumadocs-core/link";
import { bySlug } from "@/component-meta/registry";

export function RelatedComponents({ slug }: { slug: string }) {
  const record = bySlug.get(slug);
  const related = record?.related ?? [];
  if (related.length === 0) return null;

  return (
    <ul className="not-prose my-4 flex flex-wrap gap-2">
      {related.map((relatedSlug) => {
        const relatedRecord = bySlug.get(relatedSlug);
        return (
          <li key={relatedSlug}>
            <Link
              href={`/docs/components/${relatedSlug}`}
              className="rounded-md border border-fd-border px-2 py-1 text-sm"
            >
              {relatedRecord?.title ?? relatedSlug}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
