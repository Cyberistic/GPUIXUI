import { Link } from "fumadocs-core/link";
import { bySlug } from "@/component-meta/registry";

/**
 * The components the showcase scene composes (plan 560). The page derives every
 * title, summary and link from the registry, so a renamed page cannot drift from
 * the scene's real imports; `showcase-page.test.tsx` fails on a slug that is
 * not a delivered record.
 */
export const SHOWCASE_SLUGS = [
  "avatar",
  "badge",
  "button",
  "card",
  "checkbox",
  "select",
  "progress",
  "text-input",
  "text",
] as const;

/** The composition's parts, as links to their real pages. */
export function ShowcaseComponents() {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {SHOWCASE_SLUGS.map((slug) => {
        const component = bySlug.get(slug);
        if (component === undefined) return null;
        return (
          <li key={slug} className="flex flex-col gap-1">
            <Link
              href={`/docs/components/${component.slug}`}
              className="font-medium text-fd-primary underline"
            >
              {component.title}
            </Link>
            <span className="text-sm text-fd-muted-foreground">
              {component.summary}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
