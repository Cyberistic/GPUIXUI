import type { ReactNode } from "react";
import {
  excludedTestMethods,
  testElementFields,
  testMethodGroups,
  testingAbsences,
  testWindowFields,
  type TestingField,
} from "@/lib/test-surface";

/**
 * The testing tables (plan 628). Every row comes from
 * `src/lib/test-surface.ts`, whose names agree with the installed
 * `@gpuix/react/testing` / `@gpuix/native/testing` declarations in both
 * directions; nothing is retyped here.
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
    <table className="w-full text-left text-sm" data-testing-table={marker}>
      <thead>
        <tr className="border-b border-fd-border text-fd-muted-foreground">
          <th className="py-2 pr-4 font-medium">Name</th>
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
  readonly rows: ReadonlyArray<TestingField>;
  readonly kind: "window" | "element";
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

export function TestWindowTable() {
  return (
    <Table label="Test window options" marker="window">
      <FieldRows rows={testWindowFields} kind="window" />
    </Table>
  );
}

export function TestElementTable() {
  return (
    <Table label="Test element fields" marker="element">
      <FieldRows rows={testElementFields} kind="element" />
    </Table>
  );
}

export function TestMethods({ group }: { readonly group: string }) {
  const found = testMethodGroups.find((entry) => entry.id === group);
  if (found === undefined) return null;
  return (
    <div data-test-methods={found.id}>
      <p className="mb-2 text-sm text-fd-muted-foreground">{found.note}</p>
      <Table label={`${found.title} methods`} marker={found.id}>
        {found.methods.map((method) => (
          <tr
            key={method.name}
            data-test-method={method.name}
            className="border-b border-fd-border align-top last:border-0"
          >
            <td className="py-2 pr-4 font-mono whitespace-nowrap">
              {method.name}
            </td>
            <td className="py-2 text-fd-muted-foreground">{method.summary}</td>
          </tr>
        ))}
      </Table>
    </div>
  );
}

/**
 * The methods this page does not document, and the page that owns each. A
 * reader who arrived from a completion menu can see where the rest is.
 */
export function TestMethodExclusions() {
  return (
    <section data-test-method-exclusions>
      <h3 className="mt-5 mb-1 text-base font-medium">
        Members another page owns
      </h3>
      <p className="mb-2 text-sm text-fd-muted-foreground">
        These are public on the same class. Each is documented where a test
        would look for its subject, not duplicated here.
      </p>
      <Table
        label="Test renderer members owned by another page"
        marker="excluded"
      >
        {excludedTestMethods.map((method) => (
          <tr
            key={method.name}
            data-excluded-method={method.name}
            className="border-b border-fd-border align-top last:border-0"
          >
            <td className="py-2 pr-4 font-mono whitespace-nowrap">
              {method.name}
            </td>
            <td className="py-2 text-fd-muted-foreground">{method.owner}</td>
          </tr>
        ))}
      </Table>
    </section>
  );
}

export function TestingAbsences() {
  return (
    <div data-testing-absences>
      {testingAbsences.map((absence) => (
        <section key={absence.subject} data-absence={absence.subject}>
          <h3 className="mt-5 mb-1 text-base font-medium">{absence.subject}</h3>
          <p className="mb-2 text-sm text-fd-muted-foreground">
            {absence.statement}
          </p>
        </section>
      ))}
    </div>
  );
}
