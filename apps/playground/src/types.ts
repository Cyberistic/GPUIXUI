/**
 * A playground scenario.
 *
 * The smoke contract (`@gpuixui/testing`) describes what to assert; the shell
 * additionally needs the tree to render, so a scenario carries a `view`. The
 * registry is the single source of truth for both the sidebar and the smoke
 * runner, so they can never drift apart.
 */
import type { ReactNode } from "react";
import type { Smoke } from "@gpuixui/testing";

/** One capability, one view, one `steps` effect. */
export interface PlaygroundScenario extends Smoke.SmokeScenario {
  /** The real GPUix tree the shell renders and the smoke host drives. */
  readonly view: () => ReactNode;
}
