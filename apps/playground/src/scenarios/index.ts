/**
 * The scenario registry — the single source of truth for the sidebar and the
 * smoke runner.
 *
 * `scenarioProblems` is pure so the integrity check runs on any host: unique,
 * non-empty ids, every declared capability in the union, and all eight core
 * capabilities represented.
 */
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as Str from "effect/String";
import { Smoke } from "@gpuixui/testing";
import type { PlaygroundScenario } from "../types.js";
import { layoutScenario } from "./layout.js";
import { textScenario } from "./text.js";
import { inputScenario } from "./input.js";
import { focusScenario } from "./focus.js";
import { overlayScenario } from "./overlay.js";
import { scrollScenario } from "./scroll.js";
import { panelScenario } from "./panel.js";
import { virtualListScenario } from "./virtual-list.js";

/** The capabilities Phase B must prove in the real runtime. */
export const CORE_CAPABILITIES = [
  "layout",
  "text",
  "input",
  "focus",
  "overlay",
  "scroll",
  "panel",
  "virtual-list",
] as const;

/** One view per core capability, in the order the suite runs them. */
export const scenarios: ReadonlyArray<PlaygroundScenario> = [
  layoutScenario,
  textScenario,
  inputScenario,
  focusScenario,
  overlayScenario,
  scrollScenario,
  panelScenario,
  virtualListScenario,
];

const isCapability = Schema.is(Smoke.Capability);

/**
 * Every integrity problem in `list`. An empty array means valid.
 *
 * The bug it guards: a scenario added with a duplicate or empty id, an unknown
 * capability, or one of the eight core capabilities left uncovered would make
 * the smoke report claim coverage it does not have.
 */
export const scenarioProblems = (
  list: ReadonlyArray<PlaygroundScenario>,
): ReadonlyArray<string> => {
  const ids = Arr.map(list, (scenario) => scenario.id);
  const capabilities = Arr.map(list, (scenario) => scenario.capability);

  return Arr.flatten([
    Arr.filter(ids, Str.isEmpty).map(() => "a scenario has an empty id"),
    Arr.length(ids) === Arr.length(Arr.dedupe(ids))
      ? []
      : ["scenario ids are not unique"],
    Arr.filter(list, (scenario) => !isCapability(scenario.capability)).map(
      (scenario) => `unknown capability "${scenario.capability}"`,
    ),
    Arr.filter(
      CORE_CAPABILITIES,
      (capability) => !Arr.contains(capabilities, capability),
    ).map((capability) => `no scenario covers "${capability}"`),
  ]);
};

/** The scenarios a `--only <id>` run selected, or all of them when none. */
export const selectScenarios = (
  list: ReadonlyArray<PlaygroundScenario>,
  only: Option.Option<string>,
): ReadonlyArray<PlaygroundScenario> =>
  Option.match(only, {
    onNone: () => list,
    onSome: (id) => Arr.filter(list, (scenario) => scenario.id === id),
  });
