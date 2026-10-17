/**
 * `@gpuixui/primitives` — the foundation GPUixUI's components are built on.
 *
 * Two layers:
 *
 * - `core/` is runtime-free: the theme port, the resolution from a semantic
 *   spec to a GPUix `StyleDesc`, the keyboard contracts and the
 *   controlled/uncontrolled state machine. Exported here so a component (or a
 *   test) can reuse the decisions without reaching into component internals.
 * - `components/` renders GPUix host elements. Each one is a thin wrapper over
 *   a `core/` resolver plus, at most, React-local focus or value state.
 */

export * from "./core/index.js";
export * from "./components/index.js";
