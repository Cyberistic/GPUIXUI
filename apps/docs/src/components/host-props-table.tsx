import { sharedHostProps } from "@/lib/host-props";

/**
 * The shared host props every part inherits, drawn from `src/lib/host-props.ts`
 * (plan 587). No row is authored here: `hostPropViolations` checks the module
 * against the installed `@gpuix/native` declarations, and the accessibility
 * names live on `/docs/accessibility` instead.
 */
export function HostPropsTable() {
  return (
    <div
      className="my-3 overflow-x-auto"
      role="region"
      aria-label="Shared host props every component part inherits"
      tabIndex={0}
    >
      <table className="w-full text-left text-sm" data-host-props>
        <thead>
          <tr className="border-b border-fd-border text-fd-muted-foreground">
            <th className="py-2 pr-4 font-medium">Prop</th>
            <th className="py-2 font-medium">What it does</th>
          </tr>
        </thead>
        <tbody>
          {sharedHostProps.map((prop) => (
            <tr
              key={prop.name}
              data-prop={prop.name}
              className="border-b border-fd-border align-top last:border-0"
            >
              <td className="py-2 pr-4 font-mono whitespace-nowrap">
                {prop.name}
              </td>
              <td className="py-2 text-fd-muted-foreground">{prop.summary}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
