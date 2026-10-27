/**
 * The toggle-group route: `@gpuixui/primitives/toggle-group`.
 *
 * The package root re-exports every primitive, so a package that needs one mode
 * toolbar would load all of Tier 1 to paint it. This entry publishes the group
 * and its option part, the route `./button`, `./hint` and `./scroll-area` take.
 * It is a re-export seam, not a second implementation.
 */

export {
  ToggleGroup,
  ToggleGroupItem,
  toggleGroupValue,
  toggleGroupValues,
} from "./components/ToggleGroup.js";
export type {
  MultipleToggleGroupProps,
  SingleToggleGroupProps,
  ToggleGroupItemProps,
  ToggleGroupMode,
  ToggleGroupOption,
  ToggleGroupProps,
  ToggleGroupState,
  ToggleItemState,
} from "./components/ToggleGroup.js";
