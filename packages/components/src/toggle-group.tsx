/** @jsxImportSource @gpuix/react */
export { ToggleGroup, ToggleGroupItem } from "@gpuixui/primitives/toggle-group";
export type {
  SingleToggleGroupProps,
  MultipleToggleGroupProps,
  ToggleGroupItemProps,
  ToggleGroupMode,
  ToggleGroupOption,
  ToggleGroupProps,
  ToggleGroupState,
  ToggleItemState,
} from "@gpuixui/primitives/toggle-group";

export const toggleGroupMeta = {
  name: "Toggle group",
  tier: 1,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "No `aria-pressed`: each option announces its state through `aria-valuetext`",
    "One roving tab stop; the arrow keys move focus without pressing an option",
    "No attached `spacing={0}` variant: the options keep the theme's `xs` gap",
  ],
  docs: "docs/toggle-group.mdx",
  example: "examples/toggle-group.example.tsx",
  testFile: "src/behaviour/toggle-group.test.tsx",
} as const;
