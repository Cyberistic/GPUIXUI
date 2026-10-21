import type { ReactNode } from "react";
import {
  centreCorrected,
  flipsOnce,
  layerMapping,
  placementAbsences,
  placementCorrectionLabels,
  placementProps,
  placementSurfaces,
  type PlacementSurfaceRow,
} from "@/lib/placement";

/**
 * The placement tables (plan 636). Every row comes from `src/lib/placement.ts`,
 * whose names, types, defaults and mechanisms agree with the installed
 * `@gpuix/react` declarations and the shipped component sources in both
 * directions; nothing is retyped here.
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
    <table className="w-full text-left text-sm" data-placement-table={marker}>
      <thead>
        <tr className="border-b border-fd-border text-fd-muted-foreground">
          {head.map((cell) => (
            <th
              key={cell}
              scope="col"
              className="py-2 pr-4 font-medium last:pr-0"
            >
              {cell}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  </div>
);

export function PlacementProps() {
  return (
    <Table
      label="The five placement props and their defaults"
      marker="props"
      head={["Prop", "Type", "Default", "What it does"]}
    >
      {placementProps.map((row) => (
        <tr
          key={row.name}
          data-placement-prop={row.name}
          className="border-b border-fd-border align-top last:border-0"
        >
          <td className="py-2 pr-4 font-mono whitespace-nowrap">{row.name}</td>
          <td className="py-2 pr-4 font-mono text-xs whitespace-nowrap">
            {row.type}
          </td>
          <td className="py-2 pr-4 font-mono text-xs whitespace-nowrap">
            {row.default}
          </td>
          <td className="py-2 text-fd-muted-foreground">{row.summary}</td>
        </tr>
      ))}
    </Table>
  );
}

export function LayerMapping() {
  return (
    <Table
      label="How the React layer maps each prop onto the anchored element"
      marker="mapping"
      head={["Placement prop", "Anchored prop", "Value", "What it means"]}
    >
      {layerMapping.map((row) => (
        <tr
          key={row.to}
          data-placement-mapping={row.to}
          className="border-b border-fd-border align-top last:border-0"
        >
          <td className="py-2 pr-4 font-mono whitespace-nowrap">{row.from}</td>
          <td className="py-2 pr-4 font-mono whitespace-nowrap">{row.to}</td>
          <td className="py-2 pr-4 font-mono text-xs break-all">{row.value}</td>
          <td className="py-2 text-fd-muted-foreground">{row.summary}</td>
        </tr>
      ))}
    </Table>
  );
}

const correctionNote = (row: PlacementSurfaceRow): string => {
  if (centreCorrected(row) && flipsOnce(row)) {
    return "Centre corrected; flips once when snapping would cover the trigger.";
  }
  if (row.correction === "pass-through") {
    return 'Centre not corrected; no flip. `align="center"` is half a surface short.';
  }
  return "No side or align to correct.";
};

export function PlacementMatrix() {
  return (
    <Table
      label="Every floating surface and whether it corrects the measured defects"
      marker="surfaces"
      head={["Surface", "Source", "Placement props", "Defaults", "Mechanism"]}
    >
      {placementSurfaces.map((row) => (
        <tr
          key={row.surface}
          data-placement-surface={row.surface}
          className="border-b border-fd-border align-top last:border-0"
        >
          <td className="py-2 pr-4 font-medium whitespace-nowrap">
            {row.surface}
          </td>
          <td className="py-2 pr-4 font-mono text-xs break-all">
            {row.source}
          </td>
          <td className="py-2 pr-4 text-xs">{row.props}</td>
          <td className="py-2 pr-4 font-mono text-xs break-all">
            {row.defaults}
          </td>
          <td className="py-2 text-fd-muted-foreground">
            <span className="block">
              {placementCorrectionLabels[row.correction]}
            </span>
            <span className="mt-1 block text-xs" data-placement-note>
              {correctionNote(row)}
            </span>
          </td>
        </tr>
      ))}
    </Table>
  );
}

export function PlacementAbsences() {
  return (
    <Table
      label="What the placement surface does not support"
      marker="absences"
      head={["Not supported", "What to do instead"]}
    >
      {placementAbsences.map((absence) => (
        <tr
          key={absence.subject}
          data-placement-absence={absence.subject}
          className="border-b border-fd-border align-top last:border-0"
        >
          <td className="py-2 pr-4 font-medium">{absence.subject}</td>
          <td className="py-2 text-fd-muted-foreground">{absence.statement}</td>
        </tr>
      ))}
    </Table>
  );
}
