/**
 * The select route: `@gpuixui/primitives/select`.
 *
 * `@gpuixui/components` needs one data-driven list control — a calendar's month
 * and year jump — and the package root re-exports every Tier 1 primitive, which
 * is the load `./button` and `./hint` exist to avoid. This entry publishes the
 * shipped `Select` and its option types on their own; it re-exports, it does not
 * reimplement.
 */

export { Select, selectOptions, selectValueLabel } from "./components/Select.js";
export type {
  SelectEntry,
  SelectOption,
  SelectOptionGroup,
  SelectProps,
} from "./components/Select.js";
