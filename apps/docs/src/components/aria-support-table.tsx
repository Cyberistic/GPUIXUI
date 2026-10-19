import type { ReactNode } from "react";
import {
  missingAria,
  supportedAria,
  supportedHostProps,
} from "@/lib/accessibility";

const Table = ({
  label,
  children,
}: {
  readonly label: string;
  readonly children: ReactNode;
}) => (
  <div
    className="my-3 overflow-x-auto"
    role="region"
    aria-label={label}
    tabIndex={0}
  >
    <table className="w-full text-left text-sm">{children}</table>
  </div>
);

/**
 * The pinned runtime's ARIA surface, rendered from `src/lib/accessibility.ts`
 * (plan 565). No row is authored here: the module is checked against the
 * installed `@gpuix/native` declarations by `accessibility.test.ts`, and this
 * component only draws it — the same split `<CapabilityMatrix />` uses.
 */
export function AriaSupportTable() {
  return (
    <div className="not-prose space-y-5" data-aria-surface>
      <section data-aria-support="supported">
        <h3 className="text-sm font-medium">Supported</h3>
        <Table label="ARIA attributes and host props the runtime supports">
          <thead>
            <tr className="border-b border-fd-border text-fd-muted-foreground">
              <th className="py-2 pr-4 font-medium">Attribute</th>
              <th className="py-2 font-medium">What it carries</th>
            </tr>
          </thead>
          <tbody>
            {[...supportedAria, ...supportedHostProps].map((row) => (
              <tr
                key={row.attribute}
                data-aria-row={row.attribute}
                data-aria-kind="supported"
                className="border-b border-fd-border align-top last:border-0"
              >
                <td className="py-2 pr-4 font-mono whitespace-nowrap">
                  {row.attribute}
                </td>
                <td className="py-2 text-fd-muted-foreground">{row.meaning}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </section>
      <section data-aria-support="missing">
        <h3 className="text-sm font-medium">
          Not available in the pinned runtime
        </h3>
        <Table label="ARIA attributes the runtime lacks and the library's substitute">
          <thead>
            <tr className="border-b border-fd-border text-fd-muted-foreground">
              <th className="py-2 pr-4 font-medium">Attribute</th>
              <th className="py-2 font-medium">
                The strongest honest substitute
              </th>
            </tr>
          </thead>
          <tbody>
            {missingAria.map((row) => (
              <tr
                key={row.attribute}
                data-aria-row={row.attribute}
                data-aria-kind="missing"
                className="border-b border-fd-border align-top last:border-0"
              >
                <td className="py-2 pr-4 font-mono whitespace-nowrap">
                  {row.attribute}
                </td>
                <td className="py-2 text-fd-muted-foreground">
                  {row.substitute}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </section>
    </div>
  );
}
