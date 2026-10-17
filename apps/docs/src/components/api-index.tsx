import { Link } from "fumadocs-core/link";
import { groups, tierGroupTitle } from "@/component-meta/registry";

const row =
  "flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-md border border-fd-border px-3 py-2 text-sm hover:bg-fd-accent";

/**
 * Every documented component's generated API tables, grouped by tier and
 * linked to the table on its page (plan 441). It reads the registry, so a page
 * cannot be missing from the index; `content-references.test.ts` keeps the
 * record's `api` set equal to the page's `<auto-type-table>` names, so a type
 * cannot be listed here that the page does not generate.
 *
 * A planned record declares no props types, so it is not listed and never
 * links to a page that does not exist.
 */
export function ApiIndex() {
  return (
    <div className="not-prose flex flex-col gap-8">
      {groups.map((group) => {
        const documented = group.items.filter(
          (component) => component.api.length > 0,
        );
        if (documented.length === 0) return null;
        return (
          <section key={`${group.tier}-${group.group}`}>
            <h3 className="mb-3 text-lg font-medium">
              {tierGroupTitle(group.tier, group.group)}
            </h3>
            <ul className="grid gap-2">
              {documented.map((component) => (
                <li key={component.slug} data-api-slug={component.slug}>
                  <Link
                    href={`/docs/components/${component.slug}#api-reference`}
                    className={row}
                  >
                    <span className="font-medium">{component.title}</span>
                    <span className="font-mono text-fd-muted-foreground">
                      {component.api.join(", ")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
