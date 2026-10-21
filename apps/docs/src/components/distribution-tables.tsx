import type { ReactNode } from "react";
import {
  distributionAbsences,
  packagerConfigRows,
  packagerFormats,
} from "@/lib/distribution";

/**
 * The shipping tables (plan 638). Every row comes from `src/lib/distribution.ts`,
 * whose format rows and `pubkey` are compared with the installed
 * `@gpuix/native` declarations in both directions; the recipe is attributed to
 * GPUix's repository on the page, not retyped here.
 */
const Table = ({
  label,
  marker,
  head,
  children,
}: {
  readonly label: string;
  readonly marker: string;
  readonly head: ReadonlyArray<string>;
  readonly children: ReactNode;
}) => (
  <div
    className="my-3 overflow-x-auto"
    role="region"
    aria-label={label}
    tabIndex={0}
  >
    <table className="w-full text-left text-sm" data-packaging-table={marker}>
      <thead>
        <tr className="border-b border-fd-border text-fd-muted-foreground">
          {head.map((cell) => (
            <th key={cell} className="py-2 pr-4 font-medium last:pr-0">
              {cell}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  </div>
);

export function PackagerFormats() {
  return (
    <Table
      label="Packager formats, their output and the update asset"
      marker="formats"
      head={["OS", "`formats`", "What lands in `outDir`", "What an update installs"]}
    >
      {packagerFormats.map((row) => (
        <tr
          key={`${row.os}:${row.format}`}
          data-packaging-format={`${row.os}:${row.format}`}
          data-packaging-update={row.update ? "yes" : "no"}
          className="border-b border-fd-border align-top last:border-0"
        >
          <td className="py-2 pr-4 whitespace-nowrap">{row.os}</td>
          <td className="py-2 pr-4 font-mono whitespace-nowrap">{row.format}</td>
          <td className="py-2 pr-4 text-fd-muted-foreground">{row.output}</td>
          <td className="py-2 text-fd-muted-foreground">{row.updateAsset}</td>
        </tr>
      ))}
    </Table>
  );
}

/**
 * The copyable configuration. Rendered as a table as well as the page's JSON
 * fence, from one object, so a reader can read either and a test can prove the
 * fence and the object are the same file.
 */
export function PackagerConfig() {
  return (
    <Table
      label="The packager configuration, field by field"
      marker="config"
      head={["Field", "Value"]}
    >
      {packagerConfigRows.map((row) => (
        <tr
          key={row.name}
          data-packaging-config={row.name}
          className="border-b border-fd-border align-top last:border-0"
        >
          <td className="py-2 pr-4 font-mono whitespace-nowrap">{row.name}</td>
          <td className="py-2 font-mono text-fd-muted-foreground">
            {row.value}
          </td>
        </tr>
      ))}
    </Table>
  );
}

export function DistributionAbsences() {
  return (
    <Table
      label="What this repository does not do"
      marker="absences"
      head={["Not provided", "What that means"]}
    >
      {distributionAbsences.map((absence) => (
        <tr
          key={absence.subject}
          data-packaging-absence={absence.subject}
          className="border-b border-fd-border align-top last:border-0"
        >
          <td className="py-2 pr-4 font-medium">{absence.subject}</td>
          <td className="py-2 text-fd-muted-foreground">{absence.statement}</td>
        </tr>
      ))}
    </Table>
  );
}
