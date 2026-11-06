import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  type Capability,
  type CheckResult,
  type SmokeHost,
  type SmokeReport,
  type SmokeScenario,
  coverageOf,
  runScenarios,
} from "./smoke.js";

export const nullHost: SmokeHost = {
  text: () => null,
  paintedText: () => [],
  a11yTree: () => null,
  bounds: () => null,
  paintedStyle: () => null,
  focused: () => null,
  click: () => {},
  clickWindow: () => {},
  key: () => {},
  focusNext: () => {},
  focusPrevious: () => {},
  wheel: () => {},
  dragSelect: () => {},
  selectedText: () => null,
  clearSelection: () => {},
  drag: () => {},
  fileDrop: () => {},
  scrollOffset: () => null,
  highlights: () => [],
  screenshot: () => {},
  advance: () => {},
};

export const scenario = (
  id: string,
  capability: Capability,
  steps: SmokeScenario["steps"],
): SmokeScenario => ({ id, title: `scenario ${id}`, capability, steps });

export const run = (
  scenarios: ReadonlyArray<SmokeScenario>,
): Effect.Effect<SmokeReport> =>
  runScenarios(nullHost, scenarios, { host: "fixture host", startedAt: 0 });

export const runScoped = (
  scenarios: ReadonlyArray<SmokeScenario>,
  registry: ReadonlyArray<SmokeScenario>,
): Effect.Effect<SmokeReport> =>
  runScenarios(nullHost, scenarios, {
    host: "fixture host",
    startedAt: 0,
    coverage: coverageOf(registry),
  });

export const statusOf = (
  report: SmokeReport,
  capability: Capability,
): Option.Option<string> =>
  Option.map(
    Arr.findFirst(
      report.capabilities,
      (entry) => entry.capability === capability,
    ),
    (entry) => entry.status,
  );

export const checkOf = (
  report: SmokeReport,
  index: number,
): Option.Option<CheckResult> =>
  Option.flatMap(Arr.get(report.scenarios, index), (result) =>
    Arr.head(result.checks),
  );

export const labelsOf = (
  report: SmokeReport,
  index: number,
): ReadonlyArray<string> =>
  Option.match(Arr.get(report.scenarios, index), {
    onNone: () => [],
    onSome: (result) => Arr.map(result.checks, (check) => check.label),
  });
