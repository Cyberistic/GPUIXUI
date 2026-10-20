import type { ReactNode } from "react";
import type {
  NativeTextElement,
  NativeTextField,
  NativeTextMetricField,
  NativeTextSyntaxField,
} from "@/lib/native-text";
import {
  mappedFields,
  metricFields,
  nativeTextAbsences,
  syntaxFields,
  themeElements,
  themeFields,
  unmappedFields,
} from "@/lib/native-text";

/**
 * The native text theme tables (plan 629). Every row comes from
 * `src/lib/native-text.ts`, whose guard compares it with the installed
 * `@gpuix/native` declarations, the installed reconciler and the real
 * `nativeTextTheme` source. These components own presentation only.
 */
const Table = ({
  caption,
  marker,
  headers,
  children,
}: {
  readonly caption: string;
  readonly marker: string;
  readonly headers: ReadonlyArray<string>;
  readonly children: ReactNode;
}) => (
  <div
    className="my-3 overflow-x-auto"
    role="region"
    aria-label={caption}
    tabIndex={0}
  >
    <table className="w-full text-left text-sm" data-native-text={marker}>
      <thead>
        <tr className="border-b border-fd-border text-fd-muted-foreground">
          {headers.map((header) => (
            <th key={header} className="py-2 pr-4 font-medium last:pr-0">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  </div>
);

const FieldRow = ({ field }: { readonly field: NativeTextField }) => (
  <tr
    data-field={field.name}
    className="border-b border-fd-border align-top last:border-0"
  >
    <td className="py-2 pr-4 font-mono whitespace-nowrap">{field.name}</td>
    <td className="py-2 pr-4 text-fd-muted-foreground">{field.group}</td>
    <td className="py-2 text-fd-muted-foreground">{field.summary}</td>
  </tr>
);

/** The five elements whose props declare `theme`. */
export const NativeTextElements = () => (
  <Table
    caption="Every native element that takes a text theme"
    marker="elements"
    headers={["Element", "Props", "What the theme changes", "Used by"]}
  >
    {themeElements.map((element: NativeTextElement) => (
      <tr
        key={element.tag}
        data-element={element.tag}
        className="border-b border-fd-border align-top last:border-0"
      >
        <td className="py-2 pr-4 font-mono whitespace-nowrap">
          {`<${element.tag}>`}
        </td>
        <td className="py-2 pr-4 font-mono whitespace-nowrap">
          {element.inherits === undefined
            ? element.interfaceName
            : `${element.interfaceName} → ${element.inherits}`}
        </td>
        <td className="py-2 pr-4 text-fd-muted-foreground">{element.what}</td>
        <td className="py-2 text-fd-muted-foreground">
          {element.usedBy.length === 0
            ? "No component yet"
            : element.usedBy.join(", ")}
        </td>
      </tr>
    ))}
  </Table>
);

/** `GpuixTheme`'s 18 fields. */
export const NativeTextThemeFields = () => (
  <Table
    caption="Every GpuixTheme field"
    marker="theme"
    headers={["Field", "Group", "What it sets"]}
  >
    {themeFields.map((field) => (
      <FieldRow key={field.name} field={field} />
    ))}
  </Table>
);

/** `SyntaxTheme`'s 24 capture classes. */
export const SyntaxThemeFields = () => (
  <Table
    caption="Every SyntaxTheme capture class"
    marker="syntax"
    headers={["Capture class", "What it colours"]}
  >
    {syntaxFields.map((field: NativeTextSyntaxField) => (
      <tr
        key={field.name}
        data-field={field.name}
        className="border-b border-fd-border align-top last:border-0"
      >
        <td className="py-2 pr-4 font-mono whitespace-nowrap">{field.name}</td>
        <td className="py-2 text-fd-muted-foreground">{field.summary}</td>
      </tr>
    ))}
  </Table>
);

/** `GpuixMetrics`' 29 layout numbers. */
export const GpuixMetricsFields = () => (
  <Table
    caption="Every GpuixMetrics field"
    marker="metrics"
    headers={["Metric", "Family", "What it decides"]}
  >
    {metricFields.map((field: NativeTextMetricField) => (
      <FieldRow key={field.name} field={field} />
    ))}
  </Table>
);

/** Which fields `nativeTextTheme` maps, and why the rest stay unset. */
export const NativeTextMapping = () => (
  <Table
    caption="What nativeTextTheme maps and what it leaves unset"
    marker="mapping"
    headers={["Field", "nativeTextTheme", "Why"]}
  >
    {[
      ...mappedFields.map((name) => ({
        name,
        status: "mapped",
        summary: "Set from the design system's token theme.",
      })),
      ...unmappedFields.map((field) => ({
        name: field.name,
        status: "unset",
        summary: field.summary,
      })),
    ].map((row) => (
      <tr
        key={row.name}
        data-mapping={row.name}
        data-status={row.status}
        className="border-b border-fd-border align-top last:border-0"
      >
        <td className="py-2 pr-4 font-mono whitespace-nowrap">{row.name}</td>
        <td className="py-2 pr-4 text-fd-muted-foreground">{row.status}</td>
        <td className="py-2 text-fd-muted-foreground">{row.summary}</td>
      </tr>
    ))}
  </Table>
);

/** What the native text theme does not provide. */
export const NativeTextAbsences = () => (
  <Table
    caption="What the native text theme does not provide"
    marker="absences"
    headers={["Not provided", "What to do instead"]}
  >
    {nativeTextAbsences.map((absence) => (
      <tr
        key={absence.subject}
        data-absence={absence.subject}
        className="border-b border-fd-border align-top last:border-0"
      >
        <td className="py-2 pr-4 font-medium whitespace-nowrap">
          {absence.subject}
        </td>
        <td className="py-2 text-fd-muted-foreground">{absence.statement}</td>
      </tr>
    ))}
  </Table>
);
