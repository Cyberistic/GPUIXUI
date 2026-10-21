import type { ReactNode } from "react";
import {
  cpuThrottles,
  lifecycleExports,
  loopAbsences,
  loopOptions,
  renderOptions,
  tickContract,
} from "@/lib/frame-loop";

/**
 * The frame-loop tables (plan 637). Every row comes from `src/lib/frame-loop.ts`,
 * whose names, signatures, defaults and modes agree with the installed
 * `@gpuix/react@0.10.0` and `@gpuix/native@0.10.0` sources in both directions;
 * nothing is retyped here.
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
    <table className="w-full text-left text-sm" data-frame-loop-table={marker}>
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

export function LoopFunctions() {
  return (
    <Table
      label="The lifecycle exports of @gpuix/react"
      marker="functions"
      head={["Export", "Kind", "What it does"]}
    >
      {lifecycleExports.map((row) => (
        <tr
          key={row.name}
          data-frame-loop-export={row.name}
          className="border-b border-fd-border align-top last:border-0"
        >
          <td className="py-2 pr-4 font-mono whitespace-nowrap">{row.name}</td>
          <td className="py-2 pr-4 text-fd-muted-foreground">{row.kind}</td>
          <td className="py-2 text-fd-muted-foreground">{row.summary}</td>
        </tr>
      ))}
    </Table>
  );
}

export function LoopOptions() {
  return (
    <Table
      label="The startFrameLoop options"
      marker="options"
      head={["Option", "Type", "Default", "What it does"]}
    >
      {loopOptions.map((row) => (
        <tr
          key={row.name}
          data-frame-loop-option={row.name}
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

export function TickContract() {
  return (
    <Table
      label="The renderer methods the loop calls"
      marker="tick"
      head={["Method", "Signature", "What it does"]}
    >
      {tickContract.map((row) => (
        <tr
          key={row.name}
          data-frame-loop-method={row.name}
          className="border-b border-fd-border align-top last:border-0"
        >
          <td className="py-2 pr-4 font-mono whitespace-nowrap">{row.name}</td>
          <td className="py-2 pr-4 font-mono text-xs">{row.signature}</td>
          <td className="py-2 text-fd-muted-foreground">{row.summary}</td>
        </tr>
      ))}
    </Table>
  );
}

export function RenderOptionsTable() {
  return (
    <Table
      label="The React-level render options"
      marker="render-options"
      head={["Option", "Type", "Owner", "What it does"]}
    >
      {renderOptions.map((row) => (
        <tr
          key={row.name}
          data-frame-loop-render-option={row.name}
          className="border-b border-fd-border align-top last:border-0"
        >
          <td className="py-2 pr-4 font-mono whitespace-nowrap">{row.name}</td>
          <td className="py-2 pr-4 font-mono text-xs">{row.type}</td>
          <td className="py-2 pr-4 whitespace-nowrap">
            <a className="text-fd-primary underline" href={row.ownerHref}>
              {row.owner}
            </a>
          </td>
          <td className="py-2 text-fd-muted-foreground">{row.summary}</td>
        </tr>
      ))}
    </Table>
  );
}

export function CpuThrottleTable() {
  return (
    <Table
      label="The macOS CPU clamp modes"
      marker="cpu"
      head={["Mode", "What the runtime does"]}
    >
      {cpuThrottles.map((row) => (
        <tr
          key={row.mode}
          data-frame-loop-throttle={row.mode}
          className="border-b border-fd-border align-top last:border-0"
        >
          <td className="py-2 pr-4 font-mono whitespace-nowrap">{row.mode}</td>
          <td className="py-2 text-fd-muted-foreground">{row.summary}</td>
        </tr>
      ))}
    </Table>
  );
}

export function LoopAbsences() {
  return (
    <Table
      label="What the frame loop does not provide"
      marker="absences"
      head={["Subject", "What is not provided"]}
    >
      {loopAbsences.map((absence) => (
        <tr
          key={absence.subject}
          data-frame-loop-absence={absence.subject}
          className="border-b border-fd-border align-top last:border-0"
        >
          <td className="py-2 pr-4 font-mono whitespace-nowrap">
            {absence.subject}
          </td>
          <td className="py-2 text-fd-muted-foreground">{absence.statement}</td>
        </tr>
      ))}
    </Table>
  );
}
