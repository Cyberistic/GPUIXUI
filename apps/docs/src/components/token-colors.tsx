import { colorRoles } from "@gpuixui/tokens";
import { themeColors } from "@/lib/docs-theme";

const swatch =
  "inline-block size-4 shrink-0 rounded border border-fd-border align-middle";

/**
 * The complete semantic colour catalogue, generated from `@gpuixui/tokens`
 * (plan 416): every role the library exports, in both themes. Nothing here is
 * retyped, so the page cannot document a value the package does not have.
 */
export function TokenColors() {
  return (
    <div className="not-prose my-6 overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-fd-border text-left">
            <th className="py-2 pr-4 font-medium">Role</th>
            <th className="py-2 pr-4 font-medium">Light</th>
            <th className="py-2 font-medium">Dark</th>
          </tr>
        </thead>
        <tbody>
          {colorRoles.map((role) => (
            <tr
              key={role}
              data-role={role}
              className="border-b border-fd-border/60"
            >
              <td className="py-1.5 pr-4 font-mono text-xs">{role}</td>
              {(["light", "dark"] as const).map((mode) => {
                const value = themeColors[mode][role];
                return (
                  <td key={mode} className="py-1.5 pr-4">
                    <span className="inline-flex items-center gap-2">
                      <span
                        aria-hidden
                        className={swatch}
                        style={{ backgroundColor: value }}
                      />
                      <code className="font-mono text-xs">{value}</code>
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
