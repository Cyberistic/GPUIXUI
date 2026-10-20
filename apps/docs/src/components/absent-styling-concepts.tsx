import { absentStylingConcepts } from "@/lib/styling";

/**
 * What the styling runtime does not have, drawn from `src/lib/styling.ts`
 * (plan 606). No row is authored here: the catalogue's `wouldBeFields` are
 * compared with the installed `@gpuix/native` declarations, so a dependency
 * upgrade that adds one of these concepts fails the docs suite instead of
 * leaving the page denying a capability.
 */
export function AbsentStylingConcepts() {
  return (
    <div
      className="my-3 overflow-x-auto"
      role="region"
      aria-label="CSS concepts this runtime does not have, and what replaces them"
      tabIndex={0}
    >
      <table className="w-full text-left text-sm" data-absent-styling>
        <thead>
          <tr className="border-b border-fd-border text-fd-muted-foreground">
            <th className="py-2 pr-4 font-medium">You may reach for</th>
            <th className="py-2 font-medium">What to do instead</th>
          </tr>
        </thead>
        <tbody>
          {absentStylingConcepts.map((row) => (
            <tr
              key={row.concept}
              data-concept={row.concept}
              className="border-b border-fd-border align-top last:border-0"
            >
              <td className="py-2 pr-4 font-medium">{row.concept}</td>
              <td className="py-2 text-fd-muted-foreground">
                {row.replacement}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
