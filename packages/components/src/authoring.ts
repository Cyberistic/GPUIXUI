/**
 * `@gpuixui/components/authoring` — the seams every component in this package
 * is built on, published for building your own (plan 726).
 *
 * A component here reads its theme through one seam, compiles its recipe
 * through one cache, measures its box, keeps its state in one local store,
 * fades in and out through one presence contract, and paints its text and
 * its action through two shared parts. `@gpuixui/fx` is built on exactly these,
 * and so can a consumer's own component — with the same contracts and tests
 * the library's components keep. Nothing here is private plumbing renamed:
 * each module is the seam its own suite holds.
 */
export * from "./internal/button.js";
export * from "./internal/controllable.js";
export * from "./internal/local-state.js";
export * from "./internal/measure.js";
export * from "./internal/pattern-field.js";
export * from "./internal/presence.js";
export * from "./internal/recipe.js";
export * from "./internal/scatter.js";
export * from "./internal/surface-box.js";
export * from "./internal/svg-pattern.js";
export * from "./internal/text.js";
export * from "./internal/theme.js";
