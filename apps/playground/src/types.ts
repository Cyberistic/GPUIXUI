import type { ReactNode } from "react";
import type { Smoke } from "@gpuixui/testing";
import type { ScenarioMeta } from "./scenarios/registry.js";

export interface PlaygroundScenario extends Smoke.SmokeScenario {
  readonly view: () => ReactNode;
}

export type ScenarioBody = Omit<PlaygroundScenario, keyof ScenarioMeta>;
