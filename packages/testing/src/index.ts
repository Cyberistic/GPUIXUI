/**
 * `@gpuixui/testing` — the platform-free half of the native smoke suite.
 *
 * Namespace projections, one per module, so a consumer reads
 * `Smoke.runScenarios`, `Report.formatReport` and `Runtime.detectRuntime`.
 */
export * as Report from "./report.js";
export * as Runtime from "./runtime.js";
export * as Smoke from "./smoke.js";
export * as State from "./state.js";
