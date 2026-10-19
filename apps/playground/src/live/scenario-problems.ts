/**
 * Every integrity problem in the live registry `list`, checked against the
 * headless registry it twins.
 *
 * The bugs it guards: a duplicate id makes `--only` run one of two scenarios
 * while a report counts both; an id without `live-` lets a window claim pass
 * for an offscreen one; a capability with no headless scenario claims live
 * evidence for a family the offline suite never mounted.
 *
 * Pure and renderer-free, so the rule is testable on any host.
 */
import * as Arr from "effect/Array";
import * as Str from "effect/String";
import type { Smoke } from "@gpuixui/testing";

/** The part of a registered scenario the integrity rules read. */
export interface RegisteredScenario {
  readonly id: string;
  readonly capability: Smoke.Capability;
}

/** Every integrity problem in the live registry `list`. Empty means valid. */
export const liveScenarioProblems = (
  list: ReadonlyArray<RegisteredScenario>,
  headless: ReadonlyArray<RegisteredScenario>,
): ReadonlyArray<string> => {
  const ids = Arr.map(list, (scenario) => scenario.id);
  const headlessCapabilities = Arr.map(
    headless,
    (scenario) => scenario.capability,
  );

  return Arr.flatten([
    Arr.filter(ids, Str.isEmpty).map(() => "a live scenario has an empty id"),
    Arr.length(ids) === Arr.length(Arr.dedupe(ids))
      ? []
      : ["live scenario ids are not unique"],
    Arr.filter(ids, (id) => !Str.startsWith("live-")(id)).map(
      (id) => `live scenario "${id}" is not named live-`,
    ),
    Arr.filter(
      list,
      (scenario) => !Arr.contains(headlessCapabilities, scenario.capability),
    ).map(
      (scenario) =>
        `no headless scenario covers "${scenario.capability}" (live "${scenario.id}")`,
    ),
  ]);
};
