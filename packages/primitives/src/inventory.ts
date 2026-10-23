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
      "No paragraph or list semantics: only the heading and code roles are published",
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
      "A filled 1px rule, not a border, so borderStyle does not apply: no dashed or dotted divider (compose a Box for one)",
      "No draggable splitter and no resize event",
      "No role: 0.11.0 maps the separator token to Splitter, the role of a draggable divider, so a static rule stays decorative (measured)",
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
    name: "Grid",
    status: "done",
    gpuixSupport: "yes",
    limitations: [
      "No auto-flow, spanning cells, named areas, minmax() or template tracks",
      "Not focusable and no role: visual columns carry no semantics",
    ],
    source: [
      "src/components/Stack.tsx",
      "src/core/layout.ts",
      "src/recipe/index.ts",
    ],
    docs: "docs/grid.mdx",
    example: layoutExample,
    tests: ["src/core/layout.test.ts", layoutRuntime],
  },
  {
    name: "Boxes / containers",
    status: "done",
    gpuixSupport: "yes",
    limitations: [
      "One shadow per element: the runtime paints a single boxShadow",
      "No gradient prop: a gradient has two ends and the theme has one colour role per surface, so it needs a semantic gradient group before a caller can name it (pass one through style)",
      "One border style for every side: the runtime paints solid or dashed, not per-side or dotted",
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
      "No smooth scrolling: a key jumps the offset",
    ],
    source: [
      "src/components/ScrollArea.tsx",
      "src/core/scroll.ts",
      "src/core/style.ts",
    ],
    docs: "docs/scroll-area.mdx",
    example: layoutExample,
    tests: [
      "src/components/presentational.test.tsx",
      "src/core/scroll.test.ts",
      layoutRuntime,
    ],
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
      "src/components/handlers.test.tsx",
      "runtime/controls.runtime.test.tsx",
    ],
  },
  {
    name: "Icon buttons",
    status: "done",
    gpuixSupport: "partial",
    limitations: [
      "No aria-disabled and no aria-pressed: use Toggle for a pressed mode",
      "No built-in tooltip, and the glyph is not resized by size",
      "A blank label is treated as absent, so the required prop is the only guard",
    ],
    source: ["src/components/IconButton.tsx", "src/components/Button.tsx"],
    docs: "docs/icon-button.mdx",
    example: "examples/icon-button.example.tsx",
    tests: [
      "src/components/IconButton.test.tsx",
      "src/components/handlers.test.tsx",
      "runtime/icon-button.runtime.test.tsx",
    ],
  },
  {
    name: "Button groups",
    status: "done",
    gpuixSupport: "partial",
    limitations: [
      "Only this package's actions square their corners; another component inside an attached group keeps its radius",
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
      "The visible description is not associated: a control announces its own",
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
      "No prefix/suffix or masks, and no aria-describedby (description is carried)",
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
      "Help is a carried aria-description string, not a reference",
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
    name: "Checkbox group",
    status: "done",
    gpuixSupport: "partial",
    limitations: [
      "No aria-checked or aria-multiselectable: state is announced as aria-valuetext",
      "The group is one tab stop, so an option is not reachable by Tab",
      "No select-all, indeterminate parent or drag selection",
    ],
    source: [
      "src/components/CheckboxGroup.tsx",
      "src/components/group.tsx",
      "src/core/roving.ts",
      "src/core/selection.ts",
    ],
    docs: "docs/checkbox-group.mdx",
    example: "examples/selection.example.tsx",
    tests: [
      "src/components/CheckboxGroup.test.tsx",
      "src/core/roving.test.ts",
      "runtime/controls.runtime.test.tsx",
    ],
  },
  {
    name: "Radio groups",
    status: "done",
    gpuixSupport: "partial",
    limitations: [
      "No aria-checked: a row's state is announced through aria-valuetext",
      "An option description is not associated for assistive technology",
      "The data form of an option cannot carry rich content; use a RadioGroupItem for that",
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
    gpuixSupport: "partial",
    limitations: [
      "Options are data: grouped, but no rich options or compound escape hatch",
      "No search or type-ahead and no multi-select",
      "A long list is capped at 320px and scrolls on the wheel; the highlighted row reveals itself by painted-box arithmetic (the runtime never does)",
      "Open animation, positioning and dismissal are the runtime's",
    ],
    source: ["src/components/Select.tsx"],
    docs: "docs/select.mdx",
    example: formExample,
    tests: [
      "src/components/Select.test.tsx",
      "src/core/scroll.test.ts",
      "runtime/fields.runtime.test.tsx",
    ],
  },
  {
    name: "Switches",
    status: "done",
    gpuixSupport: "partial",
    limitations: [
      "No aria-checked: the state is announced through aria-valuetext",
      "A visible Label paints text only; the label prop names the control",
      "The slide is 150ms; reducedMotion lands the thumb (the runtime exposes no preference)",
      "No pending state: disable the switch while a request is in flight (a busy spinner is Toggle's contract, not this control's)",
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
      "runtime/switch.runtime.test.tsx",
    ],
  },
  {
    name: "Progress",
    status: "done",
    gpuixSupport: "partial",
    limitations: [
      "No aria-valuenow: the value is announced as aria-valuetext",
      "The default words are a bare percentage and the English loading; formatValue/loadingText say the caller's",
      "The indeterminate segment is a discrete step, not a smooth sweep",
      "One buffer, no stacked segments and no in-track label",
      "reducedMotion holds the indeterminate segment; the preference is the caller's",
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
    gpuixSupport: "partial",
    limitations: [
      "The trigger must be a focusable element: a host, or a control that forwards TooltipTriggerProps",
      "No arrow, no aria-describedby and no wrapping content",
      "A role is required to be in the accessibility tree, and only a TestRenderer exposes it",
      "Open and close timing are the runtime's: a TooltipProvider sets a group's delay and skip window, a tip's own delay wins, and a caller can take the open state through open/onOpenChange",
      "In a window a Tab traversal focuses the trigger without running its onFocus, so the tip stays closed and hover is the only open path (three runs on 0.11.0); the TestRenderer does dispatch the event",
    ],
    source: ["src/components/Tooltip.tsx"],
    docs: "docs/tooltip.mdx",
    example: "examples/feedback.example.tsx",
    tests: [
      "src/components/Tooltip.test.tsx",
      "runtime/fields.runtime.test.tsx",
    ],
  },
  {
    name: "Skeletons",
    status: "done",
    gpuixSupport: "partial",
    limitations: [
      "No shimmer sweep: motion animates opacity, width and height only",
      "No list-shape generation; reducedMotion holds one frame (the preference is the caller's)",
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
      "The trail is the accent at reduced opacity, not a separate quiet role",
      "No smooth animation, and the three dots share one size",
      "No inline placement inside a text run",
      "reducedMotion holds the lit dot; the preference is the caller's",
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
      "No aria-valuenow/min/max: the value is announced as aria-valuetext",
      "No aria-orientation: a vertical track is announced without its axis",
      "A vertical track needs a caller-supplied height",
      "A composed part cannot answer a press",
      "The thumb cannot rotate or scale: the runtime has no transform",
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
      "No aria-valuenow/min/max: each thumb announces its value as aria-valuetext",
      "No aria-orientation: a vertical range is announced without its axis",
      "A vertical track needs a caller-supplied height",
      "A composed part cannot answer a press",
      "The thumb cannot rotate or scale: the runtime has no transform",
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
      "No aria-valuenow/min/max: the measurement is announced as aria-valuetext",
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
      "Decimal text by default: a grouped or locale display is read through the formatValue/parseValue pair, never guessed",
      "No type=number or inputMode",
      "An empty box is a cancelled edit, not a value: the field keeps its last number, and a field that never had one stays empty (the value channel is a number)",
      "autoFocus paints no ring on mount",
      "Enter is the runtime's Submit action, not a keydown; onSubmit is the channel",
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
      "src/core/number.test.ts",
      "runtime/number-field.runtime.test.tsx",
    ],
  },
  {
    name: "OTP Field",
    status: "done",
    gpuixSupport: "partial",
    limitations: [
      "No onPaste: a pasted code arrives as one multi-character edit and fills forward (measured by otp-paste-lifecycle)",
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
      "No aria-pressed: the state is announced through aria-valuetext",
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
    name: "Toggle group",
    status: "done",
    gpuixSupport: "partial",
    limitations: [
      "No aria-pressed: the pressed state is announced as aria-valuetext",
      "The group is one tab stop, so an option is not reachable by Tab",
      "No overflow-to-menu, dividers or shortcut registration",
    ],
    source: [
      "src/components/ToggleGroup.tsx",
      "src/components/group.tsx",
      "src/core/roving.ts",
    ],
    docs: "docs/toggle-group.mdx",
    example: "examples/toggle.example.tsx",
    tests: [
      "src/components/ToggleGroup.test.tsx",
      "src/core/roving.test.ts",
      "runtime/controls.runtime.test.tsx",
    ],
  },
  {
    name: "Rating",
    status: "done",
    gpuixSupport: "partial",
    limitations: [
      "Halves are the finest score: a press names a star's half, not a quarter",
      "The pointer preview is paint-only: a screen reader hears the value, not the previewed star",
      "Clearing is explicit (Delete/Backspace); an arrow clamps at the lowest rated place once rated",
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
