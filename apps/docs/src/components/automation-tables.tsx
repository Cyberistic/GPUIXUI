import type { ReactNode } from "react";
import {
  appMethods,
  appSideFunctions,
  automationAbsences,
  automationCapabilities,
  automationEntryGroups,
  clockMethods,
  locatorMethods,
  mouseMethods,
  protocolErrorCodes,
  protocolMethods,
  treeNodeFields,
  type AutomationRow,
} from "@/lib/automation";

/**
 * The automation tables (plan 634). Every row comes from `src/lib/automation.ts`,
 * whose names agree with the installed `@gpuix/native` declarations in both
 * directions; nothing is retyped here, and the page renders these components
 * instead of hand-written tables.
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
    <table className="w-full text-left text-sm" data-automation-table={marker}>
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
  readonly rows: ReadonlyArray<AutomationRow>;
  readonly kind: string;
}) =>
  rows.map((row) => (
    <tr
      key={row.name}
      data-automation-name={row.name}
      data-automation-kind={kind}
      className="border-b border-fd-border align-top last:border-0"
    >
      <td className="py-2 pr-4 font-mono whitespace-nowrap">{row.name}</td>
      <td className="py-2 text-fd-muted-foreground">{row.summary}</td>
    </tr>
  ));

const Methods = ({
  label,
  marker,
  rows,
}: {
  readonly label: string;
  readonly marker: string;
  readonly rows: ReadonlyArray<AutomationRow>;
}) => (
  <Table label={label} marker={marker} head={["Member", "What it does"]}>
    <Rows rows={rows} kind={marker} />
  </Table>
);

/** The four functions `@gpuix/native/runtime` declares for the app process. */
export function AutomationAppSideTable() {
  return (
    <Methods
      label="App-side functions"
      marker="app-side"
      rows={appSideFunctions}
    />
  );
}

/** One group of `@gpuix/native/automation` exports. */
export function AutomationEntryTable({ group }: { readonly group: string }) {
  const found = automationEntryGroups.find((entry) => entry.id === group);
  if (found === undefined) return null;
  return (
    <section data-automation-group={found.id}>
      <h3 className="mt-5 mb-1 text-base font-medium">{found.title}</h3>
      <p className="mb-2 text-sm text-fd-muted-foreground">{found.note}</p>
      <Methods
        label={`${found.title} — the automation entry`}
        marker={found.id}
        rows={found.rows}
      />
    </section>
  );
}

export function AutomationLocatorTable() {
  return (
    <Methods label="Locator methods" marker="locator" rows={locatorMethods} />
  );
}

export function AutomationAppTable() {
  return <Methods label="App methods" marker="app" rows={appMethods} />;
}

/** `App.mouse`, kept apart because its coordinates are window-space. */
export function AutomationMouseTable() {
  return (
    <Methods label="App.mouse methods" marker="mouse" rows={mouseMethods} />
  );
}

/** `App.clock`, kept apart because it moves the app's clock, not the test's. */
export function AutomationClockTable() {
  return (
    <Methods label="App.clock methods" marker="clock" rows={clockMethods} />
  );
}

/** The 25 wire methods; a TypeScript consumer rarely calls these directly. */
export function AutomationProtocolTable() {
  return (
    <Methods
      label="Protocol methods"
      marker="protocol-methods"
      rows={protocolMethods}
    />
  );
}

export function AutomationCapabilities() {
  return (
    <Methods
      label="Initialize capabilities"
      marker="capabilities"
      rows={automationCapabilities}
    />
  );
}

export function AutomationProtocolErrors() {
  return (
    <Methods
      label="AutomationError codes"
      marker="error-codes"
      rows={protocolErrorCodes}
    />
  );
}

export function AutomationTreeNode() {
  return (
    <Methods label="TreeNode fields" marker="tree-node" rows={treeNodeFields} />
  );
}

/** The absences, each with the page that answers the question instead. */
export function AutomationAbsences() {
  return (
    <div
      className="my-3 overflow-x-auto"
      role="region"
      aria-label="What automation does not provide"
      tabIndex={0}
    >
      <table
        className="w-full text-left text-sm"
        data-automation-table="absences"
      >
        <thead>
          <tr className="border-b border-fd-border text-fd-muted-foreground">
            <th className="py-2 pr-4 font-medium">Not provided</th>
            <th className="py-2 font-medium">What to do instead</th>
          </tr>
        </thead>
        <tbody>
          {automationAbsences.map((absence) => (
            <tr
              key={absence.subject}
              data-automation-absence={absence.subject}
              className="border-b border-fd-border align-top last:border-0"
            >
              <td className="py-2 pr-4 font-medium whitespace-nowrap">
                {absence.subject}
              </td>
              <td className="py-2 text-fd-muted-foreground">
                {absence.statement}
                {absence.owner === undefined ? null : (
                  <>
                    {" "}
                    <a className="underline" href={absence.owner}>
                      Read that page
                    </a>
                    .
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
