/** @jsxImportSource @gpuix/react */
/**
 * Toggle: a button that stays on.
 *
 * A toggle sets a *mode* for the next action (bold, grid view, snapping), so it
 * lives in a toolbar beside other actions rather than in a form as a switch.
 * The primitives own the pressed paint from the theme's `accent` roles and the
 * activation contract — Enter on the key press, Space on the release, a held key
 * ignored — and this module publishes that surface at
 * `@gpuixui/components/toggle`, so a consumer finds it with the rest of the
 * composition library.
 *
 * **The runtime publishes no `aria-pressed`.** The pressed state reaches
 * assistive technology through `aria-valuetext` ("pressed"/"not pressed"), the
 * one channel 0.11.0 carries for a state (`docs/gpuix-capabilities.md`); an
 * icon-only toggle is named by its required `label`.
 */

export { Toggle } from "@gpuixui/primitives/toggle";
export type { ToggleProps, ToggleVariant } from "@gpuixui/primitives/toggle";

/** Inventory record, mirrored into `COMPONENTS.md`'s Toggle row. */
export const toggleMeta = {
  name: "Toggle",
  tier: 1,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "No `aria-pressed`: the pressed state is announced through `aria-valuetext`",
    "An icon-only toggle needs a `label`; a glyph carries no accessible name",
    "A busy toggle announces `loadingLabel` and refuses every activation",
  ],
  docs: "docs/toggle.mdx",
  example: "examples/toggle.example.tsx",
  testFile: "src/behaviour/toggle.test.tsx",
} as const;
