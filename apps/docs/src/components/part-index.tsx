import { Link } from "fumadocs-core/link";
import { groups, tierGroupTitle } from "@/component-meta/registry";

const row =
  "flex flex-wrap items-baseline gap-x-4 gap-y-2 rounded-md border border-fd-border px-3 py-2 text-sm";

/**
 * The compound components and their exported parts, generated from the registry
 * (plan 482). Every record that declares parts is a component whose page owes
 * the part sources and, for `stateful`/`workspace`, the state-ownership
 * sections — so the index cannot list a part the pages do not document, and a
 * new compound record appears here without an MDX edit.
 */
export function PartIndex() {
  return (
    <div className="not-prose flex flex-col gap-8">
      {groups.map((group) => {
        const compound = group.items.filter(
          (component) => component.parts.length > 0,
        );
        if (compound.length === 0) return null;
        return (
          <section key={`${group.tier}-${group.group}`}>
            <h3 className="mb-3 text-lg font-medium">
              {tierGroupTitle(group.tier, group.group)}
            </h3>
            <ul className="grid gap-2">
              {compound.map((component) => (
                <li key={component.slug} data-part-slug={component.slug}>
                  <div className={row}>
                    <Link
                      href={`/docs/components/${component.slug}`}
                      className="font-medium hover:underline"
                    >
                      {component.title}
                    </Link>
                    {component.pattern === "static" ? null : (
                      <span className="rounded-md border border-fd-border px-2 py-0.5 text-xs text-fd-muted-foreground">
                        {component.pattern}
                      </span>
                    )}
                    <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-mono text-xs text-fd-muted-foreground">
                      {component.parts.map((part) => (
                        <code key={part.name}>{part.name}</code>
                      ))}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
