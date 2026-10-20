import { instanceRows } from "@/lib/element-instance";

/**
 * The members a `ref` receives, drawn from `src/lib/element-instance.ts`
 * (plan 624). No row is authored here: `instanceViolations` checks the table
 * against the installed `@gpuix/react` declarations in both directions.
 */
export function ElementInstanceTable() {
  return (
    <div
      className="my-3 overflow-x-auto"
      role="region"
      aria-label="The element instance a ref receives"
      tabIndex={0}
    >
      <table className="w-full text-left text-sm" data-element-instance>
        <thead>
          <tr className="border-b border-fd-border text-fd-muted-foreground">
            <th className="py-2 pr-4 font-medium">Member</th>
            <th className="py-2 pr-4 font-medium">Type</th>
            <th className="py-2 font-medium">What it does</th>
          </tr>
        </thead>
        <tbody>
          {instanceRows.map((member) => (
            <tr
              key={member.name}
              data-member={member.name}
              className="border-b border-fd-border align-top last:border-0"
            >
              <td className="py-2 pr-4 font-mono whitespace-nowrap">
                {member.name}
                {member.optional ? "?" : ""}
              </td>
              <td className="py-2 pr-4 font-mono text-fd-muted-foreground">
                {member.type}
              </td>
              <td className="py-2 text-fd-muted-foreground">
                {member.summary}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
