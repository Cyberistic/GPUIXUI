import {
  capabilityGroups,
  playgroundSuites,
  type PlaygroundSuite,
} from "@/lib/playground-registry";

/**
 * The companion playground's catalogue.
 *
 * Every row is read from the registry the runners print with `--list`
 * (`src/lib/playground-registry.ts`), so the page cannot list a probe the
 * playground does not run or miss one it added. Each suite is a set of
 * collapsible capability groups: the page stays scannable, and a reader looking
 * for what a probe proves can open the group they care about.
 */
export function PlaygroundScenarios({
  suites = playgroundSuites,
}: {
  readonly suites?: ReadonlyArray<PlaygroundSuite>;
}) {
  return (
    <div className="not-prose my-6 space-y-10">
      {suites.map((suite) => (
        <Suite key={suite.name} suite={suite} />
      ))}
    </div>
  );
}

/** One suite: where it runs, where it lives, and what it declares. */
function Suite({ suite }: { readonly suite: PlaygroundSuite }) {
  const groups = capabilityGroups(suite.probes);
  const headingId = `playground-${suite.name.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <section aria-labelledby={headingId} data-suite={suite.name}>
      <h3 className="mt-0 mb-1 text-base font-semibold" id={headingId}>
        {suite.name}{" "}
        <span className="font-mono text-xs font-normal text-muted-foreground">
          {suite.probes.length} probes · {groups.length} capabilities
        </span>
      </h3>
      <p className="m-0 mb-3 text-sm text-muted-foreground">
        Runs against the <strong>{suite.host}</strong>, from{" "}
        <code>{suite.source}</code>.
      </p>
      {suite.problems.length === 0 ? null : (
        <p className="my-2 text-sm text-destructive" role="alert">
          This catalogue could not read {suite.problems.length} entr
          {suite.problems.length === 1 ? "y" : "ies"}:{" "}
          {suite.problems.join("; ")}
        </p>
      )}
      {groups.map((group) => (
        <details
          className="group border-b border-border py-2"
          key={group.capability}
          open={groups.length <= 3}
        >
          <summary className="cursor-pointer py-1 text-sm font-medium">
            {group.label}{" "}
            <span className="font-mono text-xs font-normal text-muted-foreground">
              {group.probes.length}
            </span>
          </summary>
          <ul className="mt-2 mb-1 list-none space-y-1 pl-0">
            {group.probes.map((probe) => (
              <li className="m-0 text-sm leading-6" key={probe.id}>
                <code className="text-xs">{probe.id}</code>{" "}
                <span className="text-muted-foreground">{probe.title}</span>
              </li>
            ))}
          </ul>
        </details>
      ))}
    </section>
  );
}
