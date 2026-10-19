/**
 * Every integrity problem in the live registry `list`, checked against the
 * headless registry it twins.
 *
 * The bugs it guards: a duplicate id makes `--only` run one of two scenarios
 * while a report counts both; an id without `live-` lets a window claim pass
 * for an offscreen one; a capability with no headless scenario claims live
 * evidence for a family the offline suite never mounted; and a core capability
 * with no live scenario would let the native-evidence rule become a memory.
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
 * A core capability proven live by a scenario filed under another family.
 *
 * The twin can be the honest owner of a narrower capability while it exercises
 * the core one: the typography twin paints text, and the modal view is what
 * both focus and overlay mount. Naming the id keeps the claim checkable.
 */
export interface LiveAlias {
  readonly capability: Smoke.Capability;
  readonly id: string;
}

/**
 * A core capability the live renderer cannot observe.
 *
 * The reason is measured, not assumed: `GpuixRenderer` exposes no accessibility
 * dump, so only the offscreen `TestRenderer` can read one (plan `197`).
 */
export interface HeadlessOnlyCapability {
  readonly capability: Smoke.Capability;
  readonly reason: string;
}

/** Live ids that prove a core capability without carrying its name. */
export const LIVE_ALIASES: ReadonlyArray<LiveAlias> = [
  { capability: "text", id: "live-typography" },
  { capability: "modal", id: "live-focus" },
  { capability: "modal", id: "live-overlay" },
];

/** Core capabilities with no live evidence, and why. */
export const HEADLESS_ONLY_CAPABILITIES: ReadonlyArray<HeadlessOnlyCapability> =
  [
    {
      capability: "a11y",
      reason:
        "GpuixRenderer has no accessibility dump; only TestRenderer.getA11yTree does (plan 197)",
    },
  ];

/** Every core capability the live registry does not prove. */
export const coreCoverageProblems = (
  list: ReadonlyArray<RegisteredScenario>,
  core: ReadonlyArray<Smoke.Capability>,
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
      core,
      (capability) =>
        !Arr.contains(capabilities, capability) &&
        !Arr.contains(aliased, capability) &&
        !Arr.contains(exempt, capability),
    ).map(
      (capability) => `no live scenario covers core capability "${capability}"`,
    ),
  ]);
};

/** Every integrity problem in the live registry `list`. Empty means valid. */
export const liveScenarioProblems = (
  list: ReadonlyArray<RegisteredScenario>,
  headless: ReadonlyArray<RegisteredScenario>,
  core: ReadonlyArray<Smoke.Capability>,
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
    coreCoverageProblems(list, core),
  ]);
};
