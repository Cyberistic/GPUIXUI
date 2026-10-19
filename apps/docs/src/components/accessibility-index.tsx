import {
  components,
  groups,
  tierGroupTitle,
  type ComponentGroup,
} from "@/component-meta/registry";
import { supportMeaning } from "@/component-meta/support";
import type { ComponentMetaInput } from "@/component-meta/schema";

/**
 * Every delivered component's recorded limitations, grouped by the registry's
 * own tiers and linked to the section that explains each one (plan 565).
 *
 * The rows are the registry's `limitations` — the same strings the status
 * block above each component page shows. Nothing is retyped and no record is
 * invented: `accessibility-index.test.tsx` compares the rendered markup with
 * the registry in both directions.
 */
const delivered = components.filter(
  (component) => component.status !== "planned",
);

const limited = delivered.filter(
  (component) => component.limitations.length > 0,
);

const summary =
  limited.length === delivered.length
    ? `All ${delivered.length} delivered components record at least one limitation.`
    : `${limited.length} of ${delivered.length} delivered components record at least one limitation; the rest carry none in the registry.`;

const limitedGroups = (): ReadonlyArray<ComponentGroup> =>
  groups.flatMap((group) => {
    const items = group.items.filter(
      (item) => item.status !== "planned" && item.limitations.length > 0,
    );
    return items.length === 0 ? [] : [{ ...group, items }];
  });

const Row = ({ component }: { readonly component: ComponentMetaInput }) => (
  <tr
    data-a11y-record={component.slug}
    className="border-b border-fd-border align-top last:border-0"
  >
    <td className="py-3 pr-4">
      <a
        href={`/docs/components/${component.slug}#accessibility-and-limitations`}
      >
        {component.title}
      </a>
    </td>
    <td className="py-3 pr-4">
      <code
        className="rounded border border-fd-border px-1 text-xs"
        title={supportMeaning[component.gpuix]}
        data-gpuix={component.gpuix}
      >
        {component.gpuix}
      </code>
    </td>
    <td className="py-3">
      <ul className="list-disc pl-4 text-sm text-fd-muted-foreground">
        {component.limitations.map((limitation) => (
          <li key={limitation}>{limitation}</li>
        ))}
      </ul>
    </td>
  </tr>
);

export function AccessibilityIndex() {
  const rows = limitedGroups().flatMap((group) => group.items);

  return (
    <div className="not-prose" data-a11y-records={rows.length}>
      <p className="mb-4 text-sm text-fd-muted-foreground" data-a11y-summary>
        {summary}
      </p>
      {limitedGroups().map((group) => (
        <section key={`${group.tier}-${group.group}`}>
          <h3 className="mt-6 mb-2 text-sm font-medium">
            {tierGroupTitle(group.tier, group.group)}
          </h3>
          <div
            className="overflow-x-auto"
            role="region"
            aria-label={`Recorded limitations — ${tierGroupTitle(group.tier, group.group)}`}
            tabIndex={0}
          >
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-fd-border text-fd-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Component</th>
                  <th className="py-2 pr-4 font-medium">GPUix</th>
                  <th className="py-2 font-medium">Recorded limitations</th>
                </tr>
              </thead>
              <tbody>
                {group.items.map((component) => (
                  <Row key={component.slug} component={component} />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
