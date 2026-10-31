/**
 * `@gpuixui/components/authoring/testing` — the behaviour-suite helpers the
 * components' own suites use: a root on the real renderer and the interaction
 * steps (press, key, settle). Import it only from a behaviour suite: the root
 * loads the native binding.
 */
export * from "./internal/interaction.js";
export * from "./internal/test-root.js";
export * from "./internal/a11y.js";
