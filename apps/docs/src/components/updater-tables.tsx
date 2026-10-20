import type { ReactNode } from "react";
import {
  updateFormats,
  updaterAbsences,
  updaterGroups,
  type UpdaterRow,
} from "@/lib/updater";

/**
 * The auto-update tables (plan 633). Every row comes from
 * `src/lib/updater.ts`, whose names agree with the installed `@gpuix/native`
 * declarations in both directions; nothing is retyped here, and the page
 * renders these components instead of hand-written tables.
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
    <table className="w-full text-left text-sm" data-updater-table={marker}>
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

const Rows = ({
  rows,
  kind,
}: {
  readonly rows: ReadonlyArray<UpdaterRow>;
  readonly kind: string;
}) =>
  rows.map((row) => (
    <tr
      key={row.name}
      data-updater-field={row.name}
      data-updater-kind={kind}
      className="border-b border-fd-border align-top last:border-0"
    >
      <td className="py-2 pr-4 font-mono whitespace-nowrap">{row.name}</td>
      <td className="py-2 text-fd-muted-foreground">{row.summary}</td>
    </tr>
  ));

export function UpdaterTables() {
  return (
    <div data-updater-tables>
      {updaterGroups.map((group) => (
        <section key={group.id} data-updater-group={group.id}>
          <h3 className="mt-5 mb-1 text-base font-medium">{group.title}</h3>
          <p className="mb-2 text-sm text-fd-muted-foreground">{group.note}</p>
          <Table
            label={`${group.title} — the update surface`}
            marker={group.id}
            head={["Member", "What it does"]}
          >
            <Rows rows={group.rows} kind={group.id} />
          </Table>
        </section>
      ))}
      <section data-updater-group="formats">
        <h3 className="mt-5 mb-1 text-base font-medium">Bundle formats</h3>
        <p className="mb-2 text-sm text-fd-muted-foreground">
          The `format` an update reports. The packager decides which one a
          platform receives.
        </p>
        <ul className="my-3 flex flex-wrap gap-2 text-sm" data-update-formats>
          {updateFormats.map((format) => (
            <li
              key={format}
              data-update-format={format}
              className="rounded border border-fd-border px-2 py-1 font-mono"
            >
              {format}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export function UpdaterAbsences() {
  return (
    <Table
      label="What the update client does not provide"
      marker="absences"
      head={["Not provided", "What to do instead"]}
    >
      {updaterAbsences.map((absence) => (
        <tr
          key={absence.subject}
          data-updater-absence={absence.subject}
          className="border-b border-fd-border align-top last:border-0"
        >
          <td className="py-2 pr-4 font-medium">{absence.subject}</td>
          <td className="py-2 text-fd-muted-foreground">{absence.statement}</td>
        </tr>
      ))}
    </Table>
  );
}
