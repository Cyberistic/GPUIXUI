/**
 * The Tier 1 inventory: one record per row of `COMPONENTS.md`'s foundational
 * table.
 *
 * The table is what a reader trusts and what the release gate reads, so it is
 * checked against the code rather than maintained by hand: `inventory.test.ts`
 * fails when a record names a file that does not exist, when a row and its
 * record disagree about status or GPUix support, when a row marked `done` has no
 * test, or when a finished row has no record. The table drifted to `todo` for
 * every Tier 1 component while all of them were built; this is the guard that
 * makes that drift a failing suite instead of a stale document.
 *
 * Paths are relative to `packages/primitives`; the icons record reaches into
 * `packages/icons`, which the same workstream owns.
 */

/** One Tier 1 component's inventory record. */
export interface PrimitiveMeta {
  /** Exactly the label used in `COMPONENTS.md`. */
  readonly name: string;
  readonly status: "todo" | "wip" | "done" | "blocked" | "unsupported";
  readonly gpuixSupport: "yes" | "partial" | "no";
  /** Empty array when there is no limitation. Never omitted. */
  readonly limitations: ReadonlyArray<string>;
  /** Every source module that makes up the component. */
  readonly source: ReadonlyArray<string>;
  /** The in-package docs page. */
  readonly docs: string;
  /** The example mounted by `runtime/examples.runtime.test.tsx`. */
  readonly example: string;
  /** Unit and/or runtime suites that exercise it. Never empty when `done`. */
  readonly tests: ReadonlyArray<string>;
}

const layoutRuntime = "runtime/layout.runtime.test.tsx";
const layoutExample = "examples/layout.example.tsx";
const formExample = "examples/form.example.tsx";

/** Every Tier 1 component, in the order `COMPONENTS.md` lists them. */
export const inventory: ReadonlyArray<PrimitiveMeta> = [
  {
    name: "Text / typography",
    status: "done",
    gpuixSupport: "yes",
    limitations: [
      "No heading semantics: the a11y dump has no heading role",
      "One run and one role; compose several Text nodes for mixed runs",
    ],
    source: ["src/components/Text.tsx", "src/core/style.ts"],
    docs: "docs/text.mdx",
    example: "examples/typography.example.tsx",
    tests: ["src/components/presentational.test.tsx", layoutRuntime],
  },
  {
    name: "Icons",
    status: "done",
    gpuixSupport: "yes",
    limitations: [
      "Monochrome only: the runtime tints one colour",
      "A decorative icon needs pointerEvents:none to stay out of a control's hitbox",
    ],
    source: [
      "../icons/src/Icon.tsx",
      "../icons/src/registry.ts",
      "../icons/src/sizes.ts",
    ],
    docs: "../icons/docs/icon.mdx",
    example: "examples/icons.example.tsx",
    tests: [
      "../icons/src/Icon.test.ts",
      "../icons/src/registry.test.ts",
      "runtime/icons.runtime.test.tsx",
    ],
  },
  {
    name: "Separators",
    status: "done",
    gpuixSupport: "yes",
    limitations: [
      "Solid rules only: the runtime paints solid borders",
      "No draggable splitter and no resize event",
    ],
    source: ["src/components/Separator.tsx", "src/core/style.ts"],
    docs: "docs/separator.mdx",
    example: layoutExample,
    tests: ["src/components/presentational.test.tsx", layoutRuntime],
  },
  {
    name: "Spacers",
    status: "done",
    gpuixSupport: "yes",
    limitations: [
      "A flexible spacer needs a parent with a definite main-axis size",
      "It occupies a flex item slot; it is not a margin",
    ],
    source: ["src/components/Separator.tsx", "src/core/layout.ts"],
    docs: "docs/spacer.mdx",
    example: layoutExample,
    tests: ["src/components/presentational.test.tsx", layoutRuntime],
  },
  {
    name: "Stack / layout primitives",
    status: "done",
    gpuixSupport: "yes",
    limitations: [
      "No media queries or breakpoints in the runtime",
      "No per-child order/basis; give the child a Box with grow",
    ],
    source: [
      "src/components/Stack.tsx",
      "src/core/layout.ts",
      "src/recipe/index.ts",
    ],
    docs: "docs/stack.mdx",
    example: layoutExample,
    tests: ["src/components/presentational.test.tsx", layoutRuntime],
  },
  {
    name: "Boxes / containers",
    status: "done",
    gpuixSupport: "yes",
    limitations: [
      "One shadow per element: the runtime paints a single boxShadow",
      "No gradients, background images or border styles",
      "Not focusable: no role, tabIndex or handlers",
    ],
    source: ["src/components/Box.tsx", "src/core/style.ts"],
    docs: "docs/box.mdx",
    example: layoutExample,
    tests: ["src/components/presentational.test.tsx", layoutRuntime],
  },
  {
    name: "Scrollable containers",
    status: "done",
    gpuixSupport: "partial",
    limitations: [
      "No Scrollbar/Thumb/Corner parts: the platform paints one native thumb",
      "No fade mask at the edges",
      "onScroll reports deltas only; there is no absolute offset",
    ],
    source: ["src/components/ScrollArea.tsx", "src/core/style.ts"],
    docs: "docs/scroll-area.mdx",
    example: layoutExample,
    tests: ["src/components/presentational.test.tsx", layoutRuntime],
  },
  {
    name: "Buttons",
    status: "done",
    gpuixSupport: "partial",
    limitations: [
      "No aria-disabled and no aria-pressed",
      "No native button element: a div with a role and handlers",
    ],
    source: [
      "src/components/Button.tsx",
      "src/core/keyboard.ts",
      "src/core/variants.ts",
    ],
    docs: "docs/button.mdx",
    example: formExample,
    tests: [
      "src/components/Button.test.tsx",
      "runtime/controls.runtime.test.tsx",
    ],
  },
  {
    name: "Button groups",
    status: "done",
    gpuixSupport: "partial",
    limitations: [
      "Only the container is rounded; children keep their own radius",
      "No overflow-to-menu behaviour for a group wider than its parent",
    ],
    source: ["src/components/ButtonGroup.tsx"],
    docs: "docs/button-group.mdx",
    example: formExample,
    tests: [
      "src/components/presentational.test.tsx",
      "runtime/controls.runtime.test.tsx",
    ],
  },
  {
    name: "Labels",
    status: "done",
    gpuixSupport: "partial",
    limitations: [
      "No aria-labelledby and no for/htmlFor: no click-to-focus",
      "The name is written in two places when the label is separate",
      "required is presentational; validate with Schema at the boundary",
    ],
    source: ["src/components/Label.tsx"],
    docs: "docs/label.mdx",
    example: formExample,
    tests: [
      "src/components/presentational.test.tsx",
      "runtime/fields.runtime.test.tsx",
    ],
  },
  {
    name: "Text inputs",
    status: "done",
    gpuixSupport: "partial",
    limitations: [
      "No type, maxLength, inputMode or pattern",
      "disabled is emulated: read-only, out of the tab order, disabled roles",
      "No prefix/suffix or masks, and no aria-describedby",
    ],
    source: ["src/components/Input.tsx", "src/components/internal.ts"],
    docs: "docs/input.mdx",
    example: formExample,
    tests: [
      "src/components/fields.test.tsx",
      "runtime/fields.runtime.test.tsx",
    ],
  },
  {
    name: "Text areas",
    status: "done",
    gpuixSupport: "partial",
    limitations: [
      "No submit on Enter, by design",
      "No rich text, markdown preview or character counter",
      "Disabled is the same read-only emulation as Input",
    ],
    source: ["src/components/TextArea.tsx", "src/components/internal.ts"],
    docs: "docs/textarea.mdx",
    example: formExample,
    tests: [
      "src/components/fields.test.tsx",
      "runtime/fields.runtime.test.tsx",
    ],
  },
  {
    name: "Checkboxes",
    status: "done",
    gpuixSupport: "partial",
    limitations: [
      "No aria-checked: the state is announced through aria-valuetext",
      "No label-inside-the-control composition",
      "No partial-state animation",
    ],
    source: [
      "src/components/Checkbox.tsx",
      "src/core/selection.ts",
      "src/core/state.ts",
    ],
    docs: "docs/checkbox.mdx",
    example: "examples/selection.example.tsx",
    tests: [
      "src/components/Checkbox.test.tsx",
      "src/core/selection.test.ts",
      "runtime/controls.runtime.test.tsx",
    ],
  },
  {
    name: "Radio groups",
    status: "done",
    gpuixSupport: "partial",
    limitations: [
      "Options are data: no compound RadioGroupItem and no rich option content",
      "No type-ahead selection",
      "An option description is not associated for assistive technology",
    ],
    source: [
      "src/components/RadioGroup.tsx",
      "src/core/selection.ts",
      "src/core/keyboard.ts",
    ],
    docs: "docs/radio-group.mdx",
    example: "examples/selection.example.tsx",
    tests: [
      "src/components/RadioGroup.test.tsx",
      "runtime/controls.runtime.test.tsx",
    ],
  },
  {
    name: "Selects",
    status: "done",
    gpuixSupport: "yes",
    limitations: [
      "Options are data: no groups, rich options or compound escape hatch",
      "No search or type-ahead and no multi-select",
      "Open animation, positioning and dismissal are the runtime's",
    ],
    source: ["src/components/Select.tsx"],
    docs: "docs/select.mdx",
    example: formExample,
    tests: [
      "src/components/Select.test.tsx",
      "runtime/fields.runtime.test.tsx",
    ],
  },
  {
    name: "Switches",
    status: "done",
    gpuixSupport: "partial",
    limitations: [
      "No aria-checked: pair it with a visible label",
      "No slide animation: the thumb jumps between two justifyContent values",
      "No loading or pending state",
    ],
    source: [
      "src/components/Switch.tsx",
      "src/core/selection.ts",
      "src/core/state.ts",
    ],
    docs: "docs/switch.mdx",
    example: "examples/selection.example.tsx",
    tests: [
      "src/components/Switch.test.tsx",
      "runtime/controls.runtime.test.tsx",
    ],
  },
  {
    name: "Progress",
    status: "done",
    gpuixSupport: "partial",
    limitations: [
      "No aria-valuenow: the value is announced as aria-valuetext",
      "The indeterminate segment is a discrete step, not a smooth sweep",
      "No buffer value, stacked segments or in-track label",
    ],
    source: ["src/components/Progress.tsx", "src/core/style.ts"],
    docs: "docs/progress.mdx",
    example: formExample,
    tests: [
      "src/components/Progress.test.tsx",
      "runtime/loading.runtime.test.tsx",
    ],
  },
  {
    name: "Tooltips",
    status: "done",
    gpuixSupport: "yes",
    limitations: [
      "The trigger must be a focusable host element",
      "No arrow, no aria-describedby and no wrapping content",
      "Open and close timing are the runtime's",
    ],
    source: ["src/components/Tooltip.tsx"],
    docs: "docs/tooltip.mdx",
    example: "examples/feedback.example.tsx",
    tests: ["runtime/fields.runtime.test.tsx"],
  },
  {
    name: "Skeletons",
    status: "done",
    gpuixSupport: "partial",
    limitations: [
      "No shimmer sweep: motion animates opacity, width and height only",
      "No list-shape generation and no reduced-motion switch",
    ],
    source: ["src/components/Skeleton.tsx", "src/core/loading.ts"],
    docs: "docs/skeleton.mdx",
    example: "examples/feedback.example.tsx",
    tests: [
      "src/components/presentational.test.tsx",
      "runtime/loading.runtime.test.tsx",
    ],
  },
  {
    name: "Loading indicators",
    status: "done",
    gpuixSupport: "partial",
    limitations: [
      "Cannot rotate: a discrete lit-dot step instead",
      "No smooth animation and no size scale",
      "No inline placement inside a text run",
    ],
    source: ["src/components/Spinner.tsx", "src/core/loading.ts"],
    docs: "docs/spinner.mdx",
    example: "examples/feedback.example.tsx",
    tests: [
      "src/components/presentational.test.tsx",
      "runtime/loading.runtime.test.tsx",
    ],
  },
  {
    name: "Slider",
    status: "done",
    gpuixSupport: "partial",
    limitations: [
      "No pointer capture: a drag stops when the pointer leaves the track",
      "No aria-valuenow/min/max, so the range is not announced",
      "A composed part cannot answer a press",
    ],
    source: [
      "src/components/Slider.tsx",
      "src/core/value.ts",
      "src/core/style.ts",
    ],
    docs: "docs/slider.mdx",
    example: "examples/value.example.tsx",
    tests: ["src/components/Slider.test.tsx", "runtime/value.runtime.test.tsx"],
  },
  {
    name: "Range slider",
    status: "done",
    gpuixSupport: "partial",
    limitations: [
      "No pointer capture: a drag stops when the pointer leaves the track",
      "No aria-valuenow/min/max, so the range is not announced",
      "A composed part cannot answer a press",
    ],
    source: [
      "src/components/Slider.tsx",
      "src/core/value.ts",
      "src/core/style.ts",
    ],
    docs: "docs/range-slider.mdx",
    example: "examples/value.example.tsx",
    tests: ["src/components/Slider.test.tsx", "runtime/value.runtime.test.tsx"],
  },
  {
    name: "Meter",
    status: "done",
    gpuixSupport: "partial",
    limitations: [
      "No aria-valuenow/min/max",
      "No threshold segments, tick marks or a part inside the track",
      "The fill does not animate between values",
    ],
    source: ["src/components/Meter.tsx", "src/core/value.ts"],
    docs: "docs/meter.mdx",
    example: "examples/value.example.tsx",
    tests: ["src/components/Meter.test.tsx", "runtime/value.runtime.test.tsx"],
  },
  {
    name: "Number Field",
    status: "done",
    gpuixSupport: "partial",
    limitations: [
      "Decimal text only: grouping separators and Infinity are rejected",
      "No type=number, inputMode or drag-to-scrub",
      "autoFocus paints no ring on mount",
    ],
    source: [
      "src/components/NumberField.tsx",
      "src/core/number.ts",
      "src/core/style.ts",
    ],
    docs: "docs/number-field.mdx",
    example: "examples/number-field.example.tsx",
    tests: [
      "src/components/NumberField.test.tsx",
      "runtime/number-field.runtime.test.tsx",
    ],
  },
  {
    name: "OTP Field",
    status: "done",
    gpuixSupport: "partial",
    limitations: [
      "Paste is unverified: the runtime exposes no onPaste",
      "Arrows are handled on key up, so they do not repeat",
      "Clearing a middle character shifts the following ones left",
    ],
    source: ["src/components/OTPField.tsx", "src/core/otp.ts"],
    docs: "docs/otp-field.mdx",
    example: "examples/otp.example.tsx",
    tests: [
      "src/components/OTPField.test.tsx",
      "src/core/otp.test.ts",
      "runtime/otp.runtime.test.tsx",
    ],
  },
  {
    name: "Toggle",
    status: "done",
    gpuixSupport: "partial",
    limitations: [
      "No aria-pressed: the visual state is the only state",
      "No loading state",
      "Square sizes the button, not the icon",
    ],
    source: ["src/components/Toggle.tsx", "src/core/keyboard.ts"],
    docs: "docs/toggle.mdx",
    example: "examples/toggle.example.tsx",
    tests: [
      "src/components/Toggle.test.tsx",
      "runtime/toggle.runtime.test.tsx",
    ],
  },
  {
    name: "Rating",
    status: "done",
    gpuixSupport: "partial",
    limitations: [
      "Whole stars only: no half stars without clipping or a transform",
      "No hover preview: it needs per-star hover state",
      "Clearing is explicit (Delete/Backspace) rather than clicking the value",
    ],
    source: ["src/components/Rating.tsx", "src/core/rating.ts"],
    docs: "docs/rating.mdx",
    example: "examples/rating.example.tsx",
    tests: [
      "src/components/Rating.test.tsx",
      "src/core/rating.test.ts",
      "runtime/rating.runtime.test.tsx",
    ],
  },
];
