/**
 * A playground scenario.
 *
 * The smoke contract (`@gpuixui/testing`) describes what to assert; the shell
 * additionally needs the tree to render, so a scenario carries a `view`.
 *
 * Metadata (`id`, `title`, `capability`) lives in `scenarios/registry.ts`, which
 * imports no GPUix or React code: the CLI can list and validate scenario ids on a
 * host with no binding. `scenarios/index.ts` joins the two.
 */
import type { ReactNode } from "react";
import type { Smoke } from "@gpuixui/testing";
import type { ScenarioMeta } from "./scenarios/registry.js";

/** One capability, one view, one `steps` effect. */
export interface PlaygroundScenario extends Smoke.SmokeScenario {
  /** The real GPUix tree the shell renders and the smoke host drives. */
  readonly view: () => ReactNode;
}

/** What a scenario module supplies; the registry supplies the metadata. */
export type ScenarioBody = Omit<PlaygroundScenario, keyof ScenarioMeta>;
