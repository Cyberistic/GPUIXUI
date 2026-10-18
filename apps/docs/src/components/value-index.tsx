import type { ValueExport, ValueKind } from "@/lib/api-values";
import { valueExports } from "@/lib/api-values.generated";

const KIND_LABELS: Readonly<Record<ValueKind, string>> = {
  function: "function",
  hook: "hook",
  class: "class",
  constant: "constant",
  record: "record",
  namespace: "namespace",
};

interface PackageGroup {
  readonly package: string;
  readonly entries: ReadonlyArray<ValueExport>;
}

/** Groups in entry order, which is the order the generated rows already have. */
const byPackage = (
  values: ReadonlyArray<ValueExport>,
): ReadonlyArray<PackageGroup> =>
  values.reduce<ReadonlyArray<PackageGroup>>((groups, value) => {
    const last = groups.at(-1);
    if (last?.package === value.package) {
      return [
        ...groups.slice(0, -1),
        { ...last, entries: [...last.entries, value] },
      ];
    }
    return [...groups, { package: value.package, entries: [value] }];
  }, []);

const badge =
  "rounded-md border border-fd-border px-2 py-0.5 text-xs text-fd-muted-foreground";

/**
 * Every runtime value the documented packages export, grouped by package
 * (plan 490). The rows are generated from the packages' entry points by
 * `scripts/api-values.ts`, so this component never decides what exists — it
 * only renders the committed index, and `api-values.test.ts` keeps that index
 * current.
 */
export function ValueIndex() {
  return (
    <div className="not-prose flex flex-col gap-10">
      {byPackage(valueExports).map((group) => (
        <section key={group.package} data-package={group.package}>
          <h2 className="mb-3 flex flex-wrap items-baseline gap-3 text-lg font-medium">
            <span className="font-mono">{group.package}</span>
            <span className="text-sm font-normal text-fd-muted-foreground">
              {group.entries.length}{" "}
              {group.entries.length === 1 ? "export" : "exports"}
            </span>
          </h2>
          <ul className="grid gap-2">
            {group.entries.map((value) => (
              <li
                key={`${value.package}#${value.name}`}
                data-value={`${value.package}#${value.name}`}
                className="rounded-md border border-fd-border px-3 py-2 text-sm"
              >
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <code className="font-medium">{value.name}</code>
                  <span className={badge}>{KIND_LABELS[value.kind]}</span>
                  {value.visibility === "internal" ? (
                    <span className={`${badge} border-dashed`}>internal</span>
                  ) : null}
                  <span className="text-fd-muted-foreground">
                    {value.summary}
                  </span>
                </div>
                <code className="mt-1 block text-xs text-fd-muted-foreground">
                  {value.source}
                </code>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
