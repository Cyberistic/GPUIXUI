import type { ReactNode } from "react";
import {
  layerShellFields,
  pathPromptFields,
  windowAbsences,
  windowFamilies,
  windowInsets,
  windowRendererMethods,
  type WindowField,
} from "@/lib/window-surface";

/**
 * The application-window tables (plan 625). Every row comes from
 * `src/lib/window-surface.ts`, whose names agree with the installed
 * `@gpuix/native` declarations in both directions; nothing is retyped here.
 */
const Table = ({
  label,
  marker,
  children,
}: {
  readonly label: string;
  readonly marker: string;
  readonly children: ReactNode;
}) => (
  <div
    className="my-3 overflow-x-auto"
    role="region"
    aria-label={label}
    tabIndex={0}
  >
    <table className="w-full text-left text-sm" data-window-table={marker}>
      <thead>
        <tr className="border-b border-fd-border text-fd-muted-foreground">
          <th className="py-2 pr-4 font-medium">Field</th>
          <th className="py-2 font-medium">What it does</th>
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  </div>
);

const FieldRows = ({
  rows,
  kind,
}: {
  readonly rows: ReadonlyArray<WindowField>;
  readonly kind: "window" | "layer" | "inset" | "path";
}) =>
  rows.map((field) => (
    <tr
      key={field.name}
      data-field={field.name}
      data-field-kind={kind}
      className="border-b border-fd-border align-top last:border-0"
    >
      <td className="py-2 pr-4 font-mono whitespace-nowrap">{field.name}</td>
      <td className="py-2 text-fd-muted-foreground">{field.summary}</td>
    </tr>
  ));

export function WindowOptionsTable() {
  return (
    <div data-window-options>
      {windowFamilies.map((family) => (
        <section key={family.id} data-window-family={family.id}>
          <h3 className="mt-5 mb-1 text-base font-medium">{family.title}</h3>
          <p className="mb-2 text-sm text-fd-muted-foreground">{family.note}</p>
          <Table
            label={`${family.title} window options`}
            marker={`options-${family.id}`}
          >
            <FieldRows rows={family.fields} kind="window" />
          </Table>
        </section>
      ))}
    </div>
  );
}

export function LayerShellTable() {
  return (
    <Table label="Wayland layer-shell options" marker="layer-shell">
      <FieldRows rows={layerShellFields} kind="layer" />
    </Table>
  );
}

export function WindowInsetsTable() {
  return (
    <Table label="Window size and inset fields" marker="insets">
      <FieldRows rows={windowInsets} kind="inset" />
    </Table>
  );
}

export function PathPromptTable() {
  return (
    <Table label="Native path picker options" marker="path-prompt">
      <FieldRows rows={pathPromptFields} kind="path" />
    </Table>
  );
}

export function WindowMethodsTable() {
  return (
    <Table label="GpuixRenderer window methods" marker="methods">
      {windowRendererMethods.map((method) => (
        <tr
          key={method.name}
          data-window-method={method.name}
          className="border-b border-fd-border align-top last:border-0"
        >
          <td className="py-2 pr-4 font-mono whitespace-nowrap">
            {method.name}
          </td>
          <td className="py-2 text-fd-muted-foreground">{method.summary}</td>
        </tr>
      ))}
    </Table>
  );
}

export function WindowAbsences() {
  return (
    <div
      className="my-3 overflow-x-auto"
      role="region"
      aria-label="Window features the runtime does not provide"
      tabIndex={0}
    >
      <table className="w-full text-left text-sm" data-window-absences>
        <thead>
          <tr className="border-b border-fd-border text-fd-muted-foreground">
            <th className="py-2 pr-4 font-medium">Not provided</th>
            <th className="py-2 font-medium">What to do instead</th>
          </tr>
        </thead>
        <tbody>
          {windowAbsences.map((absence) => (
            <tr
              key={absence.subject}
              data-window-absence={absence.subject}
              className="border-b border-fd-border align-top last:border-0"
            >
              <td className="py-2 pr-4 font-medium">{absence.subject}</td>
              <td className="py-2 text-fd-muted-foreground">
                {absence.statement}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
