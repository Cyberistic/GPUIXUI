import {
  selectCapabilities,
  type CapabilityEvidence,
  type CapabilityVerdict,
} from "@/lib/capabilities";

const verdictLabels: Readonly<Record<CapabilityVerdict, string>> = {
  verified: "Verified",
  partial: "Partial",
  unsupported: "Unsupported",
};

const verdictTone: Readonly<Record<CapabilityVerdict, string>> = {
  verified: "text-fd-foreground",
  partial: "text-fd-muted-foreground",
  unsupported: "text-fd-muted-foreground",
};

const Row = ({ entry }: { readonly entry: CapabilityEvidence }) => (
  <tr
    data-capability={entry.capability}
    data-verdict={entry.verdict}
    className="border-b border-fd-border align-top last:border-0"
  >
    <td className="py-3 pr-4 font-medium">{entry.label}</td>
    <td className={`py-3 pr-4 text-sm ${verdictTone[entry.verdict]}`}>
      {verdictLabels[entry.verdict]}
    </td>
    <td className="py-3 pr-4 text-sm text-fd-muted-foreground">
      {entry.proves}
    </td>
    <td className="py-3 font-mono text-sm">
      {entry.scenarios.map((scenario) => (
        <code
          key={scenario}
          data-scenario={scenario}
          className="mr-1 whitespace-nowrap rounded border border-fd-border px-1"
        >
          {scenario}
        </code>
      ))}
    </td>
  </tr>
);

/**
 * The measured capability matrix (plan 448). Reads `COMPONENTS.md`'s verdicts
 * through the docs module; `capabilities.test.ts` keeps the two equal and every
 * scenario in the playground registry. `only` renders the subset a landing page
 * needs, and an empty subset says so instead of showing a bare table.
 */
export function CapabilityMatrix({
  only,
}: {
  readonly only?: ReadonlyArray<string>;
}) {
  const rows = selectCapabilities(only);

  if (rows.length === 0) {
    return (
      <p className="not-prose text-sm text-fd-muted-foreground" data-empty>
        No measured capability matches this selection.
      </p>
    );
  }

  return (
    <div
      className="not-prose my-4 overflow-x-auto"
      role="region"
      aria-label="Measured GPUix capabilities"
      tabIndex={0}
    >
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-fd-border text-fd-muted-foreground">
            <th className="py-2 pr-4 font-medium">Capability</th>
            <th className="py-2 pr-4 font-medium">Verdict</th>
            <th className="py-2 pr-4 font-medium">
              What the native run proves
            </th>
            <th className="py-2 font-medium">Scenario</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((entry) => (
            <Row key={entry.capability} entry={entry} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
