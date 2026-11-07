/** @jsxImportSource @gpuix/react */
export { Toggle } from "@gpuixui/primitives/toggle";
export type { ToggleProps, ToggleVariant } from "@gpuixui/primitives/toggle";

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
