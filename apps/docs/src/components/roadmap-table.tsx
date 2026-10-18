import { noteSpans, type RoadmapSpan } from "@/lib/roadmap-note";
import { roadmapTargets } from "@/lib/roadmap.generated";

/**
 * The public roadmap (plan 518). The rows come from
 * `roadmap.generated.ts`, derived from `COMPONENTS.md`, so this component owns
 * presentation only: no target, status or note is written here.
 *
 * Each tier keeps its own page link because the target tier is not the same
 * thing as the measured-capability matrix: Tier 3 and 4 have a narrative page,
 * Tier 5 does not and points at the evidence instead.
 */
const TIERS: ReadonlyArray<{
  readonly tier: 3 | 4 | 5;
  readonly label: string;
  readonly href: string;
  readonly context: string;
}> = [
  {
    tier: 3,
    label: "Data presentation",
    href: "/docs/data-display",
    context: "tables, selection and virtualised data",
  },
  {
    tier: 4,
    label: "Desktop workspace",
    href: "/docs/workspace",
    context: "panels, splits and docking",
  },
  {
    tier: 5,
    label: "Specialised",
    href: "/docs/capabilities",
    context: "editors, media and query surfaces",
  },
];

const Note = ({ spans }: { readonly spans: ReadonlyArray<RoadmapSpan> }) => (
  <>
    {spans.map((span, index) =>
      span.kind === "code" ? (
        <code key={index} className="rounded border border-fd-border px-1">
          {span.text}
        </code>
      ) : span.kind === "strong" ? (
        <strong key={index}>{span.text}</strong>
      ) : (
        <span key={index}>{span.text}</span>
      ),
    )}
  </>
);

/** The targets of one tier, in the inventory's order. */
const targetsFor = (tier: 3 | 4 | 5) =>
  roadmapTargets.filter((target) => target.tier === tier);

export function RoadmapTable() {
  return (
    <div data-roadmap-targets={roadmapTargets.length}>
      {TIERS.map((tier) => {
        const targets = targetsFor(tier.tier);
        const shipped = targets.filter(
          (target) => target.status === "done",
        ).length;

        return (
          <section key={tier.tier} data-roadmap-tier={tier.tier}>
            <h2 id={`tier-${tier.tier}`}>
              Tier {tier.tier} — {tier.label}
            </h2>
            <p className="not-prose text-sm text-fd-muted-foreground">
              {targets.length} tracked{" "}
              {targets.length === 1 ? "target" : "targets"}
              {" · "}
              {shipped} shipped. {tier.context}; the full tier context is on{" "}
              <a href={tier.href}>{tier.label}</a>.
            </p>

            {targets.length === 0 ? (
              <p className="not-prose text-sm text-fd-muted-foreground">
                No targets are tracked in this tier.
              </p>
            ) : (
              <div
                className="not-prose my-4 overflow-x-auto"
                role="region"
                aria-label={`Tier ${tier.tier} targets`}
                tabIndex={0}
              >
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-fd-border text-fd-muted-foreground">
                      <th className="py-2 pr-4 font-medium">Component</th>
                      <th className="py-2 pr-4 font-medium">Status</th>
                      <th className="py-2 pr-4 font-medium">GPUix support</th>
                      <th className="py-2 font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {targets.map((target) => (
                      <tr
                        key={target.name}
                        data-roadmap-target={target.name}
                        data-roadmap-status={target.status}
                        className="border-b border-fd-border align-top last:border-0"
                      >
                        <td className="py-3 pr-4 font-medium">{target.name}</td>
                        <td className="py-3 pr-4">
                          <span className="whitespace-nowrap rounded border border-fd-border px-1.5 py-0.5 text-xs text-fd-muted-foreground">
                            {target.status}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-sm text-fd-muted-foreground">
                          {target.support}
                        </td>
                        <td className="py-3 text-sm text-fd-muted-foreground">
                          <Note spans={noteSpans(target.note)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
