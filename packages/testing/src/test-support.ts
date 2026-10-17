/**
 * Fixtures shared by this package's tests.
 *
 * Deliberately not part of the published surface: `tsconfig.build.json` keeps
 * it out of `dist/`. It holds the inert `SmokeHost` (a scenario that reads
 * nothing sees `null`/empty) and the small readers the assertions need.
 */
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  type Capability,
  type CheckResult,
  type SmokeHost,
  type SmokeReport,
  type SmokeScenario,
  runScenarios,
} from "./smoke.js";

/** A host that reports nothing; only tests that do not read the runtime use it. */
export const nullHost: SmokeHost = {
  text: () => null,
  paintedText: () => [],
  elementType: () => null,
  bounds: () => null,
  paintedStyle: () => null,
  a11y: () => null,
  focused: () => null,
  click: () => {},
  clickWindow: () => {},
  hover: () => {},
  key: () => {},
  focusNext: () => {},
  focusPrevious: () => {},
  wheel: () => {},
  drag: () => {},
  fileDrop: () => {},
  scrollOffset: () => null,
  screenshot: () => {},
  advance: () => {},
  pauseMotion: () => 0,
  fastForwardMotion: () => 0,
};

/** Builds a scenario whose `title` is derived from its id. */
export const scenario = (
  id: string,
  capability: Capability,
  steps: SmokeScenario["steps"],
): SmokeScenario => ({ id, title: `scenario ${id}`, capability, steps });

/** Runs scenarios against {@link nullHost} with a fixed host description. */
export const run = (
  scenarios: ReadonlyArray<SmokeScenario>,
): Effect.Effect<SmokeReport> =>
  runScenarios(nullHost, scenarios, { host: "fixture host", startedAt: 0 });

/** The aggregated verdict for `capability`, when the report has one. */
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

/** The first check of the scenario at `index`, when there is one. */
export const checkOf = (
  report: SmokeReport,
  index: number,
): Option.Option<CheckResult> =>
  Option.flatMap(Arr.get(report.scenarios, index), (result) =>
    Arr.head(result.checks),
  );

/** The check labels of the scenario at `index`, in recorded order. */
export const labelsOf = (
  report: SmokeReport,
  index: number,
): ReadonlyArray<string> =>
  Option.match(Arr.get(report.scenarios, index), {
    onNone: () => [],
    onSome: (result) => Arr.map(result.checks, (check) => check.label),
  });
