/**
 * The native runtime adapter, for writing GPUix `TestRenderer` tests.
 *
 * Test-only: the package root does not export this, so importing
 * `@gpuixui/primitives` never pulls the native testing surface. Import
 * `createRuntime` from `@gpuixui/primitives/testing` and run it at the test
 * boundary; one window per test, as `runtime/fixture.tsx` does.
 *
 * This is the component-level adapter plan `041` §2.2 describes, not the
 * smoke-report host in `@gpuixui/testing` (playground workstream, plan `100`).
 */
export * from "./docs.js";
export * from "./runtime.js";
export * from "./shadow.js";
