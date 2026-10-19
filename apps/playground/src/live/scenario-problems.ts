/**
 * Every integrity problem in the live registry `list`, checked against the
 * headless registry it twins.
 *
 * The bugs it guards: a duplicate id makes `--only` run one of two scenarios
 * while a report counts both; an id without `live-` lets a window claim pass
 * for an offscreen one; a capability with no headless scenario claims live
 * evidence for a family the offline suite never mounted; and a capability the
 * headless suite mounts with no live twin would let the native-evidence rule
 * become a memory.
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

/**
 * A capability proven live by a scenario filed under another family.
 *
 * The twin can be the honest owner of a narrower capability while it exercises
 * the other: the typography twin paints text, and the modal view is what both
 * focus and overlay mount. Naming the id keeps the claim checkable.
 */
export interface LiveAlias {
  readonly capability: Smoke.Capability;
  readonly id: string;
}

/**
 * A capability the live renderer cannot observe.
 *
 * Both reasons are measured, not assumed: `GpuixRenderer` exposes no
 * accessibility dump and no file-drop verb, so only the offscreen
 * `TestRenderer` can read an a11y tree or simulate a Finder drop.
 */
export interface HeadlessOnlyCapability {
  readonly capability: Smoke.Capability;
  readonly reason: string;
}

/** Live ids that prove a capability without carrying its name. */
export const LIVE_ALIASES: ReadonlyArray<LiveAlias> = [
  { capability: "text", id: "live-typography" },
  { capability: "modal", id: "live-focus" },
  { capability: "modal", id: "live-overlay" },
];

/** Capabilities with no live evidence, and why. */
export const HEADLESS_ONLY_CAPABILITIES: ReadonlyArray<HeadlessOnlyCapability> =
  [
    {
      capability: "a11y",
      reason:
        "GpuixRenderer has no accessibility dump; only TestRenderer.getA11yTree does (plan 197)",
    },
    {
      capability: "upload",
      reason:
        "the automation protocol has no file-drop verb; only TestRenderer.nativeSimulateFileDrop can drive onFileDrop (plan 388)",
    },
  ];

/** Every capability in `required` the live registry does not prove. */
export const capabilityCoverageProblems = (
  list: ReadonlyArray<RegisteredScenario>,
  required: ReadonlyArray<Smoke.Capability>,
): ReadonlyArray<string> => {
  const ids = Arr.map(list, (scenario) => scenario.id);
  const capabilities = Arr.map(list, (scenario) => scenario.capability);
  const aliased = Arr.map(LIVE_ALIASES, (alias) => alias.capability);
  const exempt = Arr.map(
    HEADLESS_ONLY_CAPABILITIES,
    (entry) => entry.capability,
  );

  return Arr.flatten([
    Arr.filter(HEADLESS_ONLY_CAPABILITIES, (entry) =>
      Str.isEmpty(entry.reason),
    ).map(
      (entry) => `headless-only capability "${entry.capability}" has no reason`,
    ),
    Arr.filter(LIVE_ALIASES, (alias) => !Arr.contains(ids, alias.id)).map(
      (alias) => `live alias "${alias.id}" is not registered`,
    ),
    Arr.filter(
      required,
      (capability) =>
        !Arr.contains(capabilities, capability) &&
        !Arr.contains(aliased, capability) &&
        !Arr.contains(exempt, capability),
    ).map((capability) => `no live scenario covers "${capability}"`),
  ]);
};

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
    capabilityCoverageProblems(list, headlessCapabilities),
  ]);
};
