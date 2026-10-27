/** @jsxImportSource @gpuix/react */
/**
 * ToggleGroup: a toolbar of related modes.
 *
 * `type="single"` keeps at most one mode on — pressing the live mode clears it,
 * which is how a reader turns an alignment off — and `type="multiple"` lets any
 * number stay on. The group holds **one** tab stop; the arrow keys move focus
 * between options without pressing any of them. `orientation` picks the axis
 * the arrows follow.
 *
 * The primitives own the roving index, the range arithmetic, the disabled-row
 * skip and the pressed paint; this module publishes the group and its option
 * part at `@gpuixui/components/toggle-group`.
 *
 * **The runtime publishes no `aria-pressed`**, so each option announces its
 * state through `aria-valuetext`. The options are separated by the theme's `xs`
 * gap; there is no attached `spacing={0}` variant because the runtime's flex
 * layout has no negative margin to close it with.
 */

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

/** Inventory record, mirrored into `COMPONENTS.md`'s Toggle group row. */
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
