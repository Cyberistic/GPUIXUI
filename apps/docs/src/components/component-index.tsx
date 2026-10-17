import { Link } from "fumadocs-core/link";
import { groups } from "@/component-meta/registry";

const groupTitles: Record<string, string> = {
  foundational: "Foundational",
  composition: "Composition and feedback",
  "data-display": "Data presentation",
  workspace: "Desktop workspace",
  specialised: "Specialised",
};

/** The component index, generated from the registry (plan 411). */
export function ComponentIndex() {
  return (
    <div className="not-prose flex flex-col gap-8">
      {groups.map((group) => (
        <section key={`${group.tier}-${group.group}`}>
          <h3 className="mb-3 text-lg font-medium">
            Tier {group.tier} — {groupTitles[group.group] ?? group.group}
          </h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {group.items.map((component) => (
              <li key={component.slug}>
                <Link
                  href={`/docs/components/${component.slug}`}
                  className="flex flex-col gap-1 rounded-lg border border-fd-border bg-fd-card p-3 hover:bg-fd-accent"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-medium">{component.title}</span>
                    <span className="flex gap-1">
                      <span
                        className="rounded-md border border-fd-border px-2 py-0.5 text-xs text-fd-muted-foreground"
                        data-status={component.status}
                      >
                        {component.status}
                      </span>
                      <span
                        className="rounded-md border border-fd-border px-2 py-0.5 text-xs text-fd-muted-foreground"
                        data-gpuix={component.gpuix}
                      >
                        {component.gpuix}
                      </span>
                    </span>
                  </span>
                  <span className="text-sm text-fd-muted-foreground">
                    {component.summary}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
