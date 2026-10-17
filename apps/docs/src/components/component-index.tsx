import { Link } from "fumadocs-core/link";
import { groups } from "@/component-meta/registry";
import type { ComponentMetaInput } from "@/component-meta/schema";

const groupTitles: Record<string, string> = {
  foundational: "Foundational",
  composition: "Composition and feedback",
  "data-display": "Data presentation",
  workspace: "Desktop workspace",
  specialised: "Specialised",
};

const card =
  "flex flex-col gap-1 rounded-lg border border-fd-border bg-fd-card p-3";

function Card({ component }: { component: ComponentMetaInput }) {
  return (
    <>
      <span className="flex items-center justify-between gap-2">
        <span className="font-medium">{component.title}</span>
        <span
          className="rounded-md border border-fd-border px-2 py-0.5 text-xs text-fd-muted-foreground"
          data-status={component.status}
        >
          {component.status}
        </span>
      </span>
      <span className="text-sm text-fd-muted-foreground">
        {component.summary}
      </span>
    </>
  );
}

/**
 * The component index, generated from the registry (plan 411). A component page
 * only exists once the record leaves `planned` (`registry.test.ts` enforces that
 * pairing), so a planned entry renders as plain text rather than a dead link.
 */
export function ComponentIndex() {
  return (
    <div className="not-prose flex flex-col gap-8">
      {groups.map((group) => (
        <section key={`${group.tier}-${group.group}`}>
          <h3 className="mb-3 text-lg font-medium">
            {groupTitles[group.group] ?? group.group}
          </h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {group.items.map((component) => (
              <li key={component.slug}>
                {component.status === "planned" ? (
                  <div className={card}>
                    <Card component={component} />
                  </div>
                ) : (
                  <Link
                    href={`/docs/components/${component.slug}`}
                    className={`${card} hover:bg-fd-accent`}
                  >
                    <Card component={component} />
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
