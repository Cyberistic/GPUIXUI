/**
 * `@gpuixui/primitives` — the foundation GPUixUI's components are built on.
 *
 * Two layers:
 *
 * - `core/` is runtime-free: the theme port, the resolution from a semantic
 *   spec to a GPUix `StyleDesc`, the keyboard contracts and the
 *   controlled/uncontrolled state machine. Exported here so a component (or a
 *   test) can reuse the decisions without reaching into component internals.
 * - components (Box, Stack, Text, Button, …) render GPUix host elements. They
 *   are re-exported from this entry as they land.
 *
 * The core is deliberately separable: it is the part that can be proven
 * without a rendering runtime, and a component that grows logic which belongs
 * here should move it here.
 */

export * from "./core/index.js";

// TODO: re-export the Tier 1 components as they land (`./components/index.js`).
