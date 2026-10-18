import type { ComponentMetaInput } from "./schema";

/**
 * The registry, Tier 1 and Tier 2 (the delivered tiers; Tier 3–5 land with
 * their plans). Every record starts honest: `planned` + the GPUix support the
 * inventory records, until the component exists and is proven in the GPUix
 * runtime. Titles match `COMPONENTS.md` exactly so `registry.test.ts` can
 * prove the two inventories agree.
 */
type Tier = "1" | "2";
type Support = ComponentMetaInput["gpuix"];

/**
 * The automated suite a component's record points at (plan 432). One line per
 * record; `native-coverage.test.ts` derives the same path and command from the
 * repository, so the label cannot drift from the suite that runs.
 */
const nativeSuite = (
  packageName: "@gpuixui/primitives" | "@gpuixui/components",
  testFile: string,
): NonNullable<ComponentMetaInput["runtime"]> => {
  const directory =
    packageName === "@gpuixui/primitives" ? "primitives" : "components";
  return {
    command: `nub run --filter ${packageName} ${
      packageName === "@gpuixui/primitives" ? "test:runtime" : "test:behaviour"
    }`,
    testFile: `packages/${directory}/${testFile}`,
  };
};

interface PlannedOptions {
  readonly gpuix?: Support;
  readonly related?: readonly string[];
  /** Overrides the tier's default package when a component lives in its own package. */
  readonly packageName?: string;
  /** The exported sub-components of a compound record (plan 427). */
  readonly parts?: readonly {
    readonly name: string;
    readonly sourcePath: string;
  }[];
  /** Defaults to `static`: one file, one API. */
  readonly pattern?: ComponentMetaInput["pattern"];
  /** Defaults to `null`: the component owns no storage contract. */
  readonly persistence?: string | null;
  /** A live GPUix wasm scene (plan 455); `null` when none ships. */
  readonly liveScene?: string | null;
}

const groupOf = (tier: Tier): string =>
  tier === "1" ? "foundational" : "composition";

const packageOf = (tier: Tier): string =>
  tier === "1" ? "@gpuixui/primitives" : "@gpuixui/components";

const planned = (
  slug: string,
  title: string,
  tier: Tier,
  summary: string,
  options: PlannedOptions = {},
): ComponentMetaInput => ({
  slug,
  title,
  tier,
  group: groupOf(tier),
  status: "planned",
  gpuix: options.gpuix ?? "unverified",
  summary,
  packageName: options.packageName ?? packageOf(tier),
  sourcePath: null,
  api: [],
  parts: options.parts ?? [],
  pattern: options.pattern ?? "static",
  persistence: options.persistence ?? null,
  dependencies: [],
  related: options.related ?? [],
  playgroundScreen: null,
  liveScene: options.liveScene ?? null,
  screenshots: [],
  runtime: null,
  limitations: [],
});

interface DeliveredOptions extends PlannedOptions {
  /** Repo-relative path to the shipped component. */
  readonly sourcePath: string;
  /** The exported props types the page's `## API reference` section generates. */
  readonly api: readonly string[];
  /** The suite that drives the component in the real GPUix renderer. */
  readonly runtime: NonNullable<ComponentMetaInput["runtime"]>;
  /**
   * The `COMPONENTS.md` status. `registry.test.ts` fails when the two disagree;
   * Tier 1 is held at `wip` by the primitives rule, Tier 2 passed its gate.
   */
  readonly status?: "wip" | "done";
  /** The runtime gaps a reader must know before adopting it. */
  readonly limitations: readonly string[];
  readonly dependencies?: readonly string[];
}

/**
 * A component that exists in the repository. The status mirrors its
 * `COMPONENTS.md` row; the defaults keep a new record honest (`wip`) until the
 * inventory says otherwise.
 */
const delivered = (
  slug: string,
  title: string,
  tier: Tier,
  summary: string,
  options: DeliveredOptions,
): ComponentMetaInput => ({
  ...planned(slug, title, tier, summary, options),
  status: options.status ?? "wip",
  sourcePath: options.sourcePath,
  api: options.api,
  runtime: options.runtime,
  dependencies: options.dependencies ?? [],
  limitations: options.limitations,
});

const foundational: ReadonlyArray<ComponentMetaInput> = [
  delivered(
    "text",
    "Text / typography",
    "1",
    "Renders text at a named typography role.",
    {
      gpuix: "yes",
      sourcePath: "packages/primitives/src/components/Text.tsx",
      api: ["TextProps"],
      runtime: nativeSuite(
        "@gpuixui/primitives",
        "runtime/layout.runtime.test.tsx",
      ),
      dependencies: [],
      related: ["label", "icon"],
      limitations: [
        "No heading semantics: the role is visual only.",
        "No rich text: one run, one role.",
        "No responsive type scale or fluid sizing.",
        "truncate needs a bounded width to truncate against.",
      ],
    },
  ),
  delivered("icon", "Icons", "1", "A sized, aligned glyph from the icon set.", {
    gpuix: "yes",
    packageName: "@gpuixui/icons",
    sourcePath: "packages/icons/src/Icon.tsx",
    api: ["IconProps"],
    liveScene: "icon",
    runtime: nativeSuite(
      "@gpuixui/primitives",
      "runtime/icons.runtime.test.tsx",
    ),
    dependencies: [],
    related: ["text", "button"],
    limitations: [
      "Monochrome only: no two-tone, duotone or brand marks.",
      "No rotation or spin animation; the runtime cannot rotate.",
      "The set is curated, not a full Lucide import.",
    ],
  }),
  delivered(
    "separator",
    "Separators",
    "1",
    "A one-pixel divider between regions.",
    {
      gpuix: "yes",
      sourcePath: "packages/primitives/src/components/Separator.tsx",
      api: ["SeparatorProps"],
      runtime: nativeSuite(
        "@gpuixui/primitives",
        "runtime/layout.runtime.test.tsx",
      ),
      dependencies: ["text"],
      related: ["spacer", "stack"],
      limitations: [
        "No dashed or dotted style: the runtime paints solid borders.",
        "No draggable splitter and no resize event.",
        "A vertical rule does not stretch to its parent automatically.",
      ],
    },
  ),
  delivered(
    "spacer",
    "Spacers",
    "1",
    "Fixed or flexible empty space in a layout.",
    {
      gpuix: "yes",
      sourcePath: "packages/primitives/src/components/Separator.tsx",
      api: ["SpacerProps"],
      runtime: nativeSuite(
        "@gpuixui/primitives",
        "runtime/layout.runtime.test.tsx",
      ),
      dependencies: ["text"],
      related: ["stack", "separator"],
      limitations: [
        "A flexible spacer needs a parent with a definite main-axis size.",
        "It occupies a flex item slot, so a parent's justify distributes around it.",
        "No negative space or overlapping.",
      ],
    },
  ),
  delivered(
    "stack",
    "Stack / layout primitives",
    "1",
    "Horizontal and vertical flex stacks with gaps.",
    {
      gpuix: "yes",
      sourcePath: "packages/primitives/src/components/Stack.tsx",
      api: ["StackProps", "GridProps"],
      runtime: nativeSuite(
        "@gpuixui/primitives",
        "runtime/layout.runtime.test.tsx",
      ),
      dependencies: [],
      related: ["box", "spacer"],
      limitations: [
        "No responsive breakpoints: the runtime has no media queries.",
        "No order, basis or per-child flex control.",
        "The runtime's grid is numeric only: no auto-flow, no named areas.",
      ],
    },
  ),
  delivered(
    "box",
    "Boxes / containers",
    "1",
    "A styled rectangular container.",
    {
      gpuix: "yes",
      sourcePath: "packages/primitives/src/components/Box.tsx",
      api: ["BoxProps"],
      runtime: nativeSuite(
        "@gpuixui/primitives",
        "runtime/layout.runtime.test.tsx",
      ),
      dependencies: [],
      related: ["stack", "separator"],
      limitations: [
        "No role, tabIndex or event props: compose a host element for semantics.",
        "No gradient, background image or border-style control.",
        "One shadow per element: GPUix paints a single boxShadow.",
      ],
    },
  ),
  delivered(
    "scroll-area",
    "Scrollable containers",
    "1",
    "A container that scrolls overflow content.",
    {
      gpuix: "partial",
      sourcePath: "packages/primitives/src/components/ScrollArea.tsx",
      api: ["ScrollAreaProps"],
      liveScene: "scroll-area",
      runtime: nativeSuite(
        "@gpuixui/primitives",
        "runtime/layout.runtime.test.tsx",
      ),
      dependencies: [],
      related: ["box", "stack"],
      limitations: [
        "No scrollbar tint or width control in GPUix 0.10.0.",
        "No fade mask at the edges.",
        "onScroll carries deltas only; there is no absolute offset.",
        "No virtualisation: a long list mounts every row.",
      ],
    },
  ),
  delivered(
    "button",
    "Buttons",
    "1",
    "Triggers an action; the primary interactive control.",
    {
      gpuix: "ours",
      sourcePath: "packages/primitives/src/components/Button.tsx",
      api: ["ButtonProps"],
      liveScene: "button",
      runtime: nativeSuite(
        "@gpuixui/primitives",
        "runtime/controls.runtime.test.tsx",
      ),
      dependencies: ["spinner"],
      related: ["button-group"],
      limitations: [
        "No focusVisible: the focus ring cannot distinguish pointer from keyboard focus.",
        "No aria-disabled, aria-pressed or toggle state; a disabled button leaves the tab order.",
        "An icon-only button must pass label; the component cannot infer one.",
        "No native button element: the runtime renders a div with role and handlers.",
      ],
    },
  ),
  delivered(
    "button-group",
    "Button groups",
    "1",
    "Groups related buttons into one control.",
    {
      gpuix: "yes",
      sourcePath: "packages/primitives/src/components/ButtonGroup.tsx",
      api: ["ButtonGroupProps"],
      runtime: nativeSuite(
        "@gpuixui/primitives",
        "runtime/controls.runtime.test.tsx",
      ),
      dependencies: [],
      related: ["button", "separator"],
      limitations: [
        "No child reshaping: only the container is rounded and clipped.",
        "The group name must be passed as label.",
        "No overflow behaviour: a wide group does not collapse into a menu.",
      ],
    },
  ),
  delivered("label", "Labels", "1", "Names a control for sighted users.", {
    gpuix: "partial",
    sourcePath: "packages/primitives/src/components/Label.tsx",
    api: ["LabelProps"],
    runtime: nativeSuite(
      "@gpuixui/primitives",
      "runtime/layout.runtime.test.tsx",
    ),
    dependencies: ["stack", "text"],
    related: ["text-input", "text"],
    limitations: [
      "No aria-labelledby: the visible label and the control name are separate nodes.",
      "No click-to-focus: the runtime has no for/htmlFor.",
      "required is a visual mark, not aria-required; validation is separate.",
    ],
  }),
  delivered(
    "text-input",
    "Text inputs",
    "1",
    "A single-line editable text field.",
    {
      gpuix: "yes",
      sourcePath: "packages/primitives/src/components/Input.tsx",
      api: ["InputProps"],
      runtime: nativeSuite(
        "@gpuixui/primitives",
        "runtime/fields.runtime.test.tsx",
      ),
      dependencies: [],
      related: ["label", "text-area"],
      limitations: [
        "No type, maxLength, inputMode or pattern.",
        "No masks, formatting or prefix/suffix slots.",
        "No aria-describedby; help text is adjacent content.",
        "No disabled field: use readOnly.",
      ],
    },
  ),
  delivered(
    "text-area",
    "Text areas",
    "1",
    "A multi-line editable text field.",
    {
      gpuix: "yes",
      sourcePath: "packages/primitives/src/components/TextArea.tsx",
      api: ["TextAreaProps"],
      runtime: nativeSuite(
        "@gpuixui/primitives",
        "runtime/fields.runtime.test.tsx",
      ),
      dependencies: ["text-input"],
      related: ["text-input", "label"],
      limitations: [
        "No onSubmit by design: with it, Enter would stop inserting newlines.",
        "No rich text, Markdown preview or character counter.",
        "No auto-grow beyond maxRows; the field scrolls instead.",
      ],
    },
  ),
  delivered(
    "checkbox",
    "Checkboxes",
    "1",
    "Toggles a single independent option.",
    {
      gpuix: "partial",
      sourcePath: "packages/primitives/src/components/Checkbox.tsx",
      api: ["CheckboxProps"],
      runtime: nativeSuite(
        "@gpuixui/primitives",
        "runtime/controls.runtime.test.tsx",
      ),
      dependencies: ["@gpuixui/icons"],
      related: ["switch", "radio-group"],
      limitations: [
        "No aria-checked: state is announced through aria-valuetext.",
        "No label-inside-the-control composition.",
        "No partial-state animation and no custom mark.",
      ],
    },
  ),
  delivered(
    "radio-group",
    "Radio groups",
    "1",
    "Selects one option from a set.",
    {
      gpuix: "partial",
      sourcePath: "packages/primitives/src/components/RadioGroup.tsx",
      api: ["RadioGroupProps"],
      runtime: nativeSuite(
        "@gpuixui/primitives",
        "runtime/controls.runtime.test.tsx",
      ),
      dependencies: ["effect/Array", "effect/Option", "text"],
      related: ["checkbox", "select"],
      limitations: [
        "Options are data: no compound item or rich child content.",
        "No type-ahead selection.",
        "An option description is not associated for assistive technology.",
      ],
    },
  ),
  delivered("select", "Selects", "1", "Selects one value from a list.", {
    gpuix: "reuse",
    sourcePath: "packages/primitives/src/components/Select.tsx",
    api: ["SelectProps"],
    runtime: nativeSuite(
      "@gpuixui/primitives",
      "runtime/fields.runtime.test.tsx",
    ),
    dependencies: [
      "@gpuix/react/floating",
      "@gpuix/react/select",
      "effect/Array",
    ],
    related: ["radio-group", "label"],
    limitations: [
      "Options are data: no groups, rich content or compound escape hatch.",
      "Dismissal and positioning are GPUix's.",
      "No search or type-ahead, and no multi-select.",
    ],
  }),
  delivered("switch", "Switches", "1", "Toggles a setting on or off.", {
    gpuix: "partial",
    sourcePath: "packages/primitives/src/components/Switch.tsx",
    api: ["SwitchProps"],
    runtime: nativeSuite(
      "@gpuixui/primitives",
      "runtime/controls.runtime.test.tsx",
    ),
    dependencies: [],
    related: ["checkbox", "radio-group"],
    limitations: [
      "No aria-checked and no on/off text inside the control.",
      "No slide animation: the thumb jumps between two positions.",
      "No loading or pending state; disable it while a request is in flight.",
    ],
  }),
  delivered(
    "progress",
    "Progress",
    "1",
    "Shows determinate or indeterminate progress.",
    {
      gpuix: "partial",
      sourcePath: "packages/primitives/src/components/Progress.tsx",
      api: ["ProgressProps"],
      runtime: nativeSuite(
        "@gpuixui/primitives",
        "runtime/loading.runtime.test.tsx",
      ),
      dependencies: [],
      related: ["spinner", "skeleton"],
      limitations: [
        "No aria-valuenow: the value is announced through aria-valuetext.",
        "The indeterminate segment is a discrete step, not a smooth sweep.",
        "No buffer value, stacked segments or label inside the track.",
      ],
    },
  ),
  delivered("tooltip", "Tooltips", "1", "Labels a control on hover or focus.", {
    gpuix: "reuse",
    sourcePath: "packages/primitives/src/components/Tooltip.tsx",
    api: ["TooltipProps"],
    runtime: nativeSuite(
      "@gpuixui/primitives",
      "runtime/fields.runtime.test.tsx",
    ),
    dependencies: ["@gpuix/react/floating", "@gpuix/react/tooltip"],
    related: ["button", "select"],
    limitations: [
      "No aria-describedby: the tip is not an associated description.",
      "The trigger must be a focusable host element that forwards hover and focus.",
      "No wrapping, rich content, arrow or touch-long-press behaviour.",
    ],
  }),
  delivered(
    "skeleton",
    "Skeletons",
    "1",
    "Placeholder shape for loading content.",
    {
      gpuix: "partial",
      sourcePath: "packages/primitives/src/components/Skeleton.tsx",
      api: ["SkeletonProps"],
      liveScene: "skeleton",
      runtime: nativeSuite(
        "@gpuixui/primitives",
        "runtime/loading.runtime.test.tsx",
      ),
      dependencies: [],
      related: ["spinner", "progress"],
      limitations: [
        "No shimmer sweep: the runtime has no moving-gradient motion.",
        "No automatic count or list-shape generation.",
        "No reduced-motion switch; the pulse is a plain interval.",
      ],
    },
  ),
  delivered(
    "spinner",
    "Loading indicators",
    "1",
    "Shows an indeterminate busy state.",
    {
      gpuix: "partial",
      sourcePath: "packages/primitives/src/components/Spinner.tsx",
      api: ["SpinnerProps"],
      liveScene: "spinner",
      runtime: nativeSuite(
        "@gpuixui/primitives",
        "runtime/loading.runtime.test.tsx",
      ),
      dependencies: ["effect/Array"],
      related: ["progress", "skeleton"],
      limitations: [
        "Cannot rotate: the runtime's motion has no rotation.",
        "The lit dot jumps by design; there is no smooth animation.",
        "No inline placement inside a text run; put it in a Stack.",
      ],
    },
  ),
  delivered(
    "slider",
    "Slider",
    "1",
    "Selects one value by click, drag or keyboard.",
    {
      gpuix: "ours",
      sourcePath: "packages/primitives/src/components/Slider.tsx",
      api: ["SliderProps"],
      runtime: nativeSuite(
        "@gpuixui/primitives",
        "runtime/value.runtime.test.tsx",
      ),
      dependencies: ["effect/Option"],
      related: ["range-slider", "meter", "progress"],
      limitations: [
        "No pointer capture: a drag stops tracking when the pointer leaves the track.",
        "No aria-valuenow/min/max: the value is announced through aria-valuetext.",
        "The thumb cannot rotate or transform; its position is a flex layout.",
      ],
    },
  ),
  delivered(
    "range-slider",
    "Range slider",
    "1",
    "Selects the two ends of an interval on one track.",
    {
      gpuix: "ours",
      sourcePath: "packages/primitives/src/components/Slider.tsx",
      api: ["RangeSliderProps"],
      runtime: nativeSuite(
        "@gpuixui/primitives",
        "runtime/value.runtime.test.tsx",
      ),
      dependencies: ["effect/Option"],
      related: ["slider", "meter", "text-input"],
      limitations: [
        "No pointer capture: a drag stops tracking when the pointer leaves the track.",
        "No aria-valuenow/min/max: each thumb announces its value through aria-valuetext.",
        "The thumbs cannot be given custom glyphs; both are Slider's pill.",
      ],
    },
  ),
  delivered(
    "meter",
    "Meter",
    "1",
    "Reports a measurement inside a known range.",
    {
      gpuix: "yes",
      sourcePath: "packages/primitives/src/components/Meter.tsx",
      api: ["MeterProps"],
      runtime: nativeSuite(
        "@gpuixui/primitives",
        "runtime/value.runtime.test.tsx",
      ),
      dependencies: [],
      related: ["progress", "slider"],
      limitations: [
        "No aria-valuenow/min/max: the measurement is announced through aria-valuetext.",
        "No threshold segments, tick marks or label inside the track.",
        "The fill repaints between values; it does not animate.",
      ],
    },
  ),
  delivered(
    "number-field",
    "Number Field",
    "1",
    "A numeric field with steps, bounds and formatting.",
    {
      gpuix: "ours",
      sourcePath: "packages/primitives/src/components/NumberField.tsx",
      api: ["NumberFieldProps"],
      runtime: nativeSuite(
        "@gpuixui/primitives",
        "runtime/number-field.runtime.test.tsx",
      ),
      dependencies: ["@gpuixui/icons", "effect/Option"],
      related: ["text-input", "slider", "label"],
      limitations: [
        "Decimal text only: 1,5, 0x10 and Infinity are rejected rather than guessed.",
        "No type=number, inputMode or maxLength: the host input takes text only.",
        "No drag-to-scrub: it needs pointer capture, which the runtime lacks.",
        "autoFocus paints no ring on mount, because no focus event is dispatched.",
      ],
    },
  ),
  delivered(
    "otp-field",
    "OTP Field",
    "1",
    "A one-time code in length cells, held as one string.",
    {
      gpuix: "ours",
      sourcePath: "packages/primitives/src/components/OTPField.tsx",
      api: ["OTPFieldProps"],
      runtime: nativeSuite(
        "@gpuixui/primitives",
        "runtime/otp.runtime.test.tsx",
      ),
      dependencies: ["effect/Array", "effect/Option"],
      related: ["text-input", "label"],
      limitations: [
        "Paste is unverified: 0.10.0 has no onPaste and the TestRenderer has no clipboard.",
        "Arrows do not repeat: they are handled on key up because the editor consumes key down.",
        "The code is contiguous; clearing a middle character shifts the rest left.",
        "autoFocus paints no ring on mount, because no focus event is dispatched.",
      ],
    },
  ),
  delivered("toggle", "Toggle", "1", "A button whose pressed state persists.", {
    gpuix: "ours",
    sourcePath: "packages/primitives/src/components/Toggle.tsx",
    api: ["ToggleProps"],
    runtime: nativeSuite(
      "@gpuixui/primitives",
      "runtime/toggle.runtime.test.tsx",
    ),
    dependencies: [],
    related: ["button", "switch", "checkbox"],
    limitations: [
      "No aria-pressed: the state is announced through aria-valuetext.",
      "No loading state; disable the toggle while a request is in flight.",
      "square sizes the control, not the icon inside it.",
    ],
  }),
  delivered("rating", "Rating", "1", "A whole-number star rating, or none.", {
    gpuix: "ours",
    sourcePath: "packages/primitives/src/components/Rating.tsx",
    api: ["RatingProps"],
    runtime: nativeSuite(
      "@gpuixui/primitives",
      "runtime/rating.runtime.test.tsx",
    ),
    dependencies: ["@gpuixui/icons", "effect/Array", "effect/Option"],
    related: ["radio-group", "slider"],
    limitations: [
      "Whole stars only: half stars need clipping or a transform the runtime lacks.",
      "No hover preview: the runtime does not report which star is under the pointer.",
      "No aria-checked: each star announces its state through aria-valuetext.",
      "Clearing is explicit (Delete/Backspace or the app), not a second click.",
    ],
  }),
];

const composition: ReadonlyArray<ComponentMetaInput> = [
  delivered(
    "card",
    "Cards",
    "2",
    "Frames a discrete unit of content and actions.",
    {
      gpuix: "yes",
      sourcePath: "packages/components/src/card.tsx",
      api: ["CardProps"],
      runtime: nativeSuite(
        "@gpuixui/components",
        "src/behaviour/card.test.tsx",
      ),
      status: "done",
      dependencies: ["@gpuix/react/floating", "effect"],
      related: ["list", "empty-state"],
      limitations: [
        "The surface clips overflow, so a scroller belongs in CardContent.",
        "No interactive or overlay behaviour: compose controls inside it.",
        "No live scene ships for this component yet; the example and source are real.",
      ],
    },
  ),
  delivered("badge", "Badges", "2", "A compact status or count label.", {
    gpuix: "yes",
    sourcePath: "packages/components/src/badge.tsx",
    api: ["BadgeProps"],
    runtime: nativeSuite("@gpuixui/components", "src/behaviour/badge.test.tsx"),
    status: "done",
    dependencies: ["@gpuix/react/floating", "effect"],
    related: ["alert", "avatar"],
    limitations: [
      "No dismiss, icon slot or count animation.",
      "Colour is decorative; the words must carry the status.",
    ],
  }),
  delivered(
    "avatar",
    "Avatars",
    "2",
    "Represents a person or entity by image or initials.",
    {
      gpuix: "yes",
      sourcePath: "packages/components/src/avatar.tsx",
      api: ["AvatarProps"],
      runtime: nativeSuite(
        "@gpuixui/components",
        "src/behaviour/avatar.test.tsx",
      ),
      status: "done",
      dependencies: ["@gpuix/react/floating", "effect"],
      related: ["badge", "list"],
      limitations: [
        "No image loading or error state; a missing file does not restore initials.",
        "The presence dot is visual only and is not announced.",
        "The four diameters are component constants, not tokens.",
      ],
    },
  ),
  delivered(
    "list",
    "Lists / list items",
    "2",
    "A vertical collection of selectable rows.",
    {
      gpuix: "yes",
      sourcePath: "packages/components/src/list.tsx",
      api: ["ListProps", "ListItemProps"],
      runtime: nativeSuite(
        "@gpuixui/components",
        "src/behaviour/list.test.tsx",
      ),
      status: "done",
      dependencies: [
        "@gpuix/react/floating",
        "effect",
        "effect/Array",
        "effect/Option",
      ],
      related: ["card", "badge"],
      limitations: [
        "No reorder, group headers or nested rows, and no aria-multiselectable.",
        "No virtualisation: every row mounts.",
        "The focus ring shows for a click too; 0.10.0 has no focusVisible.",
      ],
    },
  ),
  delivered(
    "empty-state",
    "Empty states",
    "2",
    "Explains an empty region and its next action.",
    {
      gpuix: "yes",
      sourcePath: "packages/components/src/empty-state.tsx",
      api: ["EmptyStateProps"],
      runtime: nativeSuite(
        "@gpuixui/components",
        "src/behaviour/empty-state.test.tsx",
      ),
      status: "done",
      dependencies: ["@gpuix/react/floating"],
      related: ["card", "list"],
      limitations: [
        "The 360px wrap width is a component constant, not a token.",
        "No illustration slot; an icon renders in the muted foreground.",
        "No role of its own; the title carries the meaning.",
      ],
    },
  ),
  delivered(
    "alert",
    "Alerts",
    "2",
    "A persistent message for the current context.",
    {
      gpuix: "yes",
      sourcePath: "packages/components/src/alert.tsx",
      api: ["AlertProps"],
      runtime: nativeSuite(
        "@gpuixui/components",
        "src/behaviour/alert.test.tsx",
      ),
      status: "done",
      dependencies: ["@gpuix/react/floating"],
      related: ["toast", "badge"],
      limitations: [
        "The live-region announcement cannot be verified headlessly.",
        "The dismiss control is the local icon-button stand-in.",
        "No automatic timeout; a message that vanishes is a toast.",
      ],
    },
  ),
  delivered(
    "inline-validation",
    "Inline validation",
    "2",
    "Field-level error and hint messaging.",
    {
      gpuix: "partial",
      sourcePath: "packages/components/src/field.tsx",
      api: ["FieldProps"],
      runtime: nativeSuite(
        "@gpuixui/components",
        "src/behaviour/field.test.tsx",
      ),
      status: "done",
      dependencies: ["@gpuix/react/floating", "effect/Option", "fieldset"],
      related: ["alert", "toast"],
      limitations: [
        "No aria-describedby, aria-invalid or aria-required in 0.10.0.",
        "FieldInput is the stand-in for the primitive text input.",
        "Not a form library: no submit, cross-field or async validation.",
      ],
    },
  ),
  delivered(
    "toast",
    "Toasts / notifications",
    "2",
    "A transient message about an action's outcome.",
    {
      gpuix: "yes",
      sourcePath: "packages/components/src/toast/provider.tsx",
      api: ["ToastProviderProps", "ToastViewportProps"],
      pattern: "stateful",
      parts: [
        {
          name: "ToastProvider",
          sourcePath: "packages/components/src/toast/provider.tsx",
        },
        {
          name: "ToastViewport",
          sourcePath: "packages/components/src/toast/viewport.tsx",
        },
      ],
      runtime: nativeSuite(
        "@gpuixui/components",
        "src/behaviour/toast.test.tsx",
      ),
      status: "done",
      dependencies: [
        "effect",
        "effect/Array",
        "effect/Fiber",
        "effect/HashMap",
        "effect/HashSet",
        "effect/ManagedRuntime",
        "effect/Option",
        "effect/Stream",
      ],
      related: ["alert", "dialog"],
      limitations: [
        "No aria-live or aria-atomic; the viewport is a status region.",
        "No progress indicator and no dismiss-countdown display.",
        "No portal: render the viewport last at the app root.",
      ],
    },
  ),
  delivered(
    "dialog",
    "Dialogs",
    "2",
    "A modal surface that interrupts for a task.",
    {
      gpuix: "partial",
      sourcePath: "packages/components/src/dialog.tsx",
      api: ["DialogProps"],
      liveScene: "dialog",
      runtime: nativeSuite(
        "@gpuixui/components",
        "src/behaviour/dialog.test.tsx",
      ),
      status: "done",
      dependencies: ["@gpuix/react/floating"],
      related: ["confirm-dialog", "popover"],
      limitations: [
        "No aria-modal or aria-labelledby; the name is the required label.",
        "No portal: mount the dialog at or near the tree root.",
        "The close control is a text glyph until an icon package lands.",
      ],
    },
  ),
  delivered(
    "confirm-dialog",
    "Confirmation dialogs",
    "2",
    "A dialog that confirms a consequential action.",
    {
      gpuix: "partial",
      sourcePath: "packages/components/src/confirm-dialog.tsx",
      api: ["ConfirmDialogProps"],
      liveScene: "confirm-dialog",
      runtime: nativeSuite(
        "@gpuixui/components",
        "src/behaviour/confirm-dialog.test.tsx",
      ),
      status: "done",
      dependencies: ["dialog", "effect"],
      related: ["dialog", "alert"],
      limitations: [
        "No aria-modal or aria-labelledby (same as Dialog).",
        "The busy indicator is a glyph, not a spinner.",
        "Controlled only: the caller owns the async work and the close.",
      ],
    },
  ),
  delivered(
    "popover",
    "Popovers",
    "2",
    "A non-modal floating surface anchored to a trigger.",
    {
      gpuix: "partial",
      sourcePath: "packages/components/src/popover.tsx",
      api: ["PopoverProps"],
      liveScene: "popover",
      runtime: nativeSuite(
        "@gpuixui/components",
        "src/behaviour/popover.test.tsx",
      ),
      status: "done",
      dependencies: ["@gpuix/react/floating", "effect"],
      related: ["dialog", "dropdown-menu"],
      limitations: [
        "No aria-haspopup, aria-controls or aria-labelledby.",
        "No arrow, custom anchor or backdrop.",
        "An outside press does not restore focus to the trigger.",
      ],
    },
  ),
  delivered(
    "dropdown-menu",
    "Dropdown menus",
    "2",
    "A list of actions from a trigger.",
    {
      gpuix: "partial",
      sourcePath: "packages/components/src/dropdown-menu.tsx",
      api: ["DropdownMenuProps"],
      liveScene: "dropdown-menu",
      runtime: nativeSuite(
        "@gpuixui/components",
        "src/behaviour/dropdown-menu.test.tsx",
      ),
      status: "done",
      dependencies: ["@gpuix/react/floating"],
      related: ["context-menu", "command-menu"],
      limitations: [
        "No aria-haspopup, aria-controls or aria-checked in 0.10.0.",
        "Submenus are one level deep and only open to the right.",
        "A hover does not preview the highlight.",
      ],
    },
  ),
  delivered(
    "context-menu",
    "Context menus",
    "2",
    "A list of actions for a region or item.",
    {
      gpuix: "partial",
      sourcePath: "packages/components/src/context-menu.tsx",
      api: ["ContextMenuProps"],
      runtime: nativeSuite(
        "@gpuixui/components",
        "src/behaviour/context-menu.test.tsx",
      ),
      status: "done",
      dependencies: ["@gpuix/react/floating", "effect", "effect/Option"],
      related: ["dropdown-menu", "command-menu"],
      limitations: [
        "No onContextMenu: opens from onAuxClick + isRightClick.",
        "No menu key: Shift+F10 opens at the trigger, not at the pointer.",
        "No portal; submenus are one level deep and open right.",
      ],
    },
  ),
  delivered(
    "command-menu",
    "Command menus",
    "2",
    "A searchable list of commands and destinations.",
    {
      gpuix: "partial",
      sourcePath: "packages/components/src/command-menu.tsx",
      api: ["CommandMenuProps"],
      liveScene: "command-menu",
      runtime: nativeSuite(
        "@gpuixui/components",
        "src/behaviour/command-menu.test.tsx",
      ),
      status: "done",
      dependencies: [
        "@gpuix/react/floating",
        "dialog",
        "effect/Array",
        "effect/Option",
      ],
      related: ["dialog", "combobox"],
      limitations: [
        "No aria-activedescendant or aria-controls in 0.10.0.",
        "The input is the host element until primitives lands.",
        "Per-group rather than global ranking; no recent-command memory.",
      ],
    },
  ),
  delivered("tabs", "Tabs", "2", "Switches between sibling views in place.", {
    gpuix: "partial",
    sourcePath: "packages/components/src/tabs.tsx",
    api: ["TabsProps"],
    pattern: "stateful",
    parts: [
      { name: "Tabs", sourcePath: "packages/components/src/tabs.tsx" },
      { name: "TabsList", sourcePath: "packages/components/src/tabs.tsx" },
      { name: "TabsTrigger", sourcePath: "packages/components/src/tabs.tsx" },
      { name: "TabsContent", sourcePath: "packages/components/src/tabs.tsx" },
    ],
    liveScene: "tabs",
    runtime: nativeSuite("@gpuixui/components", "src/behaviour/tabs.test.tsx"),
    status: "done",
    dependencies: [
      "@gpuix/react/floating",
      "effect",
      "effect/Array",
      "effect/Option",
    ],
    related: ["accordion", "list"],
    limitations: [
      "No aria-orientation, aria-controls or aria-labelledby in 0.10.0.",
      "The panel is named by its value; the trigger-panel link is positional.",
      "Vertical tab sets stack the triggers rather than using a separate rail.",
    ],
  }),
  delivered(
    "accordion",
    "Accordions",
    "2",
    "Expands and collapses stacked sections.",
    {
      gpuix: "yes",
      sourcePath: "packages/components/src/accordion.tsx",
      api: ["AccordionProps"],
      runtime: nativeSuite(
        "@gpuixui/components",
        "src/behaviour/accordion.test.tsx",
      ),
      status: "done",
      dependencies: [
        "@gpuix/react/floating",
        "effect",
        "effect/Array",
        "effect/Option",
      ],
      related: ["collapsible", "tabs"],
      limitations: [
        "No aria-controls in 0.10.0; the relationship is positional.",
        "No height animation; the indicator is a text glyph.",
      ],
    },
  ),
  delivered(
    "collapsible",
    "Collapsible sections",
    "2",
    "A single show/hide region.",
    {
      gpuix: "partial",
      sourcePath: "packages/components/src/collapsible.tsx",
      api: ["CollapsibleProps"],
      runtime: nativeSuite(
        "@gpuixui/components",
        "src/behaviour/collapsible.test.tsx",
      ),
      status: "done",
      dependencies: ["@gpuix/react/floating"],
      related: ["accordion", "card"],
      limitations: [
        "No aria-controls in 0.10.0.",
        "No height animation: the body mounts instantly.",
        "Closing unmounts the body and loses its local state.",
      ],
    },
  ),
  delivered(
    "breadcrumb",
    "Breadcrumbs",
    "2",
    "Shows and navigates the current hierarchy.",
    {
      gpuix: "partial",
      sourcePath: "packages/components/src/breadcrumb.tsx",
      api: ["BreadcrumbProps"],
      runtime: nativeSuite(
        "@gpuixui/components",
        "src/behaviour/breadcrumb.test.tsx",
      ),
      status: "done",
      dependencies: ["@gpuix/react/floating", "effect/Array"],
      related: ["tabs", "pagination"],
      limitations: [
        "No aria-current in 0.10.0; the current page is text plus colour.",
        "The ellipsis is a text node, not a button.",
        "A wrapper around an item counts as one entry.",
      ],
    },
  ),
  delivered(
    "pagination",
    "Pagination",
    "2",
    "Moves through a long result set.",
    {
      gpuix: "partial",
      sourcePath: "packages/components/src/pagination.tsx",
      api: ["PaginationProps"],
      runtime: nativeSuite(
        "@gpuixui/components",
        "src/behaviour/pagination.test.tsx",
      ),
      status: "done",
      dependencies: ["@gpuix/react/floating", "effect/Array"],
      related: ["breadcrumb", "list"],
      limitations: [
        "No aria-current=page in 0.10.0; the current page uses aria-selected.",
        "Controlled only; there is no uncontrolled copy.",
        "No page-size selector.",
      ],
    },
  ),
  delivered(
    "search-input",
    "Search inputs",
    "2",
    "A text field with search affordances.",
    {
      gpuix: "yes",
      sourcePath: "packages/components/src/search-input.tsx",
      api: ["SearchInputProps"],
      runtime: nativeSuite(
        "@gpuixui/components",
        "src/behaviour/search-input.test.tsx",
      ),
      status: "done",
      dependencies: ["@gpuix/react/floating"],
      related: ["combobox", "inline-validation"],
      limitations: [
        "No debounce: debouncing is the consumer's policy.",
        "No suggestions, search history or shortcut binding.",
        "The glyph is text until an icon set lands.",
      ],
    },
  ),
  delivered(
    "combobox",
    "Comboboxes",
    "2",
    "A text field that filters a list of options.",
    {
      gpuix: "partial",
      sourcePath: "packages/components/src/combobox.tsx",
      api: ["ComboboxProps"],
      runtime: nativeSuite(
        "@gpuixui/components",
        "src/behaviour/combobox.test.tsx",
      ),
      status: "done",
      dependencies: ["@gpuix/react/floating", "effect/Array", "effect/Option"],
      related: ["search-input", "list"],
      limitations: [
        "No aria-activedescendant in 0.10.0.",
        "No async loading, create-new or grouping headers.",
        "The trigger is a div with button semantics, not a native button.",
      ],
    },
  ),
  delivered(
    "date-picker",
    "Date pickers",
    "2",
    "Selects a calendar day through a popover.",
    {
      gpuix: "partial",
      sourcePath: "packages/components/src/date-picker.tsx",
      api: ["DatePickerProps"],
      runtime: nativeSuite(
        "@gpuixui/components",
        "src/behaviour/date-picker.test.tsx",
      ),
      status: "done",
      dependencies: [
        "@gpuix/react/floating",
        "effect",
        "effect/Array",
        "effect/DateTime",
        "effect/Option",
        "popover",
      ],
      related: ["popover", "inline-validation", "time-picker"],
      limitations: [
        "No aria-current; today is marked by a border.",
        "Fixed English labels; there is no i18n layer.",
        "No range selection or adjacent-month days.",
        "A date is picker-only; the time of day is the separate TimePicker field.",
      ],
    },
  ),
  delivered(
    "time-picker",
    "Time pickers",
    "2",
    "A time of day entered as an HH:mm hour and minute field.",
    {
      gpuix: "yes",
      sourcePath: "packages/components/src/time-picker.tsx",
      api: ["TimePickerProps", "TimePickerSegmentProps"],
      runtime: nativeSuite(
        "@gpuixui/components",
        "src/behaviour/time-picker.test.tsx",
      ),
      status: "done",
      dependencies: ["@gpuix/react/floating", "effect", "effect/Option"],
      related: ["date-picker", "inline-validation"],
      limitations: [
        "No aria-valuenow or spinbutton role in 0.10.0; the segments are text inputs.",
        "No aria-disabled; disabled is readOnly, out of the tab order and dimmed.",
        "Fixed 24-hour display with no locale, seconds or timezone.",
        "minuteStep affects the arrow keys only; it is not a validation rule.",
      ],
    },
  ),
  delivered(
    "message-scroller",
    "Message scroller",
    "2",
    "Keeps a transcript on new content while the reader stays in control.",
    {
      gpuix: "partial",
      sourcePath: "packages/components/src/message-scroller.tsx",
      api: ["MessageScrollerProps", "MessageScrollerViewportProps"],
      runtime: nativeSuite(
        "@gpuixui/components",
        "src/behaviour/message-scroller.test.tsx",
      ),
      status: "done",
      dependencies: ["@gpuix/react/floating"],
      related: ["list"],
      limitations: [
        "Not virtualized: every row renders.",
        "The jump-to-latest affordance sits beneath the viewport, not in a corner.",
        "No resize observer: a stream that does not re-render is not followed.",
        "No aria-live in 0.10.0, so new rows are not announced.",
      ],
    },
  ),
  delivered(
    "fieldset",
    "Fieldset",
    "2",
    "Groups related form controls under one legend.",
    {
      gpuix: "partial",
      sourcePath: "packages/components/src/fieldset.tsx",
      api: ["FieldsetProps"],
      runtime: nativeSuite(
        "@gpuixui/components",
        "src/behaviour/fieldset.test.tsx",
      ),
      status: "done",
      dependencies: ["@gpuix/react/floating"],
      related: ["inline-validation", "form", "card"],
      limitations: [
        "No fieldset element or aria-disabled in 0.10.0.",
        "Disabled propagation is opt-in: FieldInput honours it, other controls keep their own disabled.",
        "A disabled FieldInput is readOnly, not a disabled input.",
      ],
    },
  ),
  delivered(
    "form",
    "Form",
    "2",
    "Schema validation and a submit lifecycle around a group of fields.",
    {
      gpuix: "partial",
      sourcePath: "packages/components/src/form.tsx",
      api: ["FormProps"],
      runtime: nativeSuite(
        "@gpuixui/components",
        "src/behaviour/form.test.tsx",
      ),
      status: "done",
      dependencies: [
        "@gpuix/react/floating",
        "effect",
        "effect/Array",
        "effect/Result",
        "effect/Schema",
      ],
      related: ["fieldset", "inline-validation", "toast"],
      limitations: [
        "Owned-value: the caller passes the value and there is no field registration.",
        "Validation messages carry no paths, so per-field messages stay the Field API.",
        "No re-validation on edit; errors persist until the next submit.",
      ],
    },
  ),
  delivered(
    "navigation-menu",
    "Navigation Menu",
    "2",
    "A navigation bar whose items open anchored content panels.",
    {
      gpuix: "partial",
      sourcePath: "packages/components/src/navigation-menu.tsx",
      api: ["NavigationMenuProps", "NavigationMenuLinkProps"],
      liveScene: "navigation-menu",
      runtime: nativeSuite(
        "@gpuixui/components",
        "src/behaviour/navigation-menu.test.tsx",
      ),
      status: "done",
      dependencies: ["@gpuix/react/floating"],
      related: ["dropdown-menu"],
      limitations: [
        "No href in 0.10.0: links are buttons with onSelect.",
        "No hover-open, and no aria-haspopup to announce the panel.",
      ],
    },
  ),
  delivered(
    "preview-card",
    "Preview Card",
    "2",
    "A hover-triggered rich card with a positioner.",
    {
      gpuix: "partial",
      sourcePath: "packages/components/src/preview-card.tsx",
      api: ["PreviewCardProps", "PreviewCardContentProps"],
      runtime: nativeSuite(
        "@gpuixui/components",
        "src/behaviour/preview-card.test.tsx",
      ),
      status: "done",
      dependencies: ["@gpuix/react/floating"],
      related: ["popover", "tooltip"],
      limitations: [
        "No pointer-type signal: a touch press toggles instead of hovering.",
        "Not auto-focused on hover; no anchor arrow or aria-haspopup in 0.10.0.",
        "Open and close delays are component timers, not motion tokens.",
      ],
    },
  ),
  delivered(
    "drawer",
    "Drawer",
    "2",
    "An edge-anchored panel for navigation and secondary tasks.",
    {
      gpuix: "partial",
      sourcePath: "packages/components/src/drawer.tsx",
      api: ["DrawerProps", "DrawerContentProps"],
      liveScene: "drawer",
      runtime: nativeSuite(
        "@gpuixui/components",
        "src/behaviour/drawer.test.tsx",
      ),
      status: "done",
      dependencies: ["@gpuix/react/floating"],
      related: ["dialog", "popover"],
      limitations: [
        "No swipe-to-dismiss (no drag host feature) and no slide animation (no transform).",
        "No aria-modal/aria-labelledby and no portal; the veil is anchored.",
        "Sizes are layout constants, not tokens.",
      ],
    },
  ),
  delivered("stepper", "Stepper", "2", "A multi-step progress indicator.", {
    gpuix: "partial",
    sourcePath: "packages/components/src/stepper.tsx",
    api: ["StepperProps", "StepperStepProps"],
    runtime: nativeSuite(
      "@gpuixui/components",
      "src/behaviour/stepper.test.tsx",
    ),
    status: "done",
    dependencies: ["@gpuix/react/floating", "effect"],
    related: ["progress"],
    limitations: [
      "Display-only by design: a step is not clickable.",
      "No connector line, and aria-selected stands in for the missing aria-current.",
    ],
  }),
  delivered(
    "timeline",
    "Timeline",
    "2",
    "An ordered list of events with a current marker.",
    {
      gpuix: "partial",
      sourcePath: "packages/components/src/timeline.tsx",
      api: ["TimelineProps", "TimelineItemProps"],
      runtime: nativeSuite(
        "@gpuixui/components",
        "src/behaviour/timeline.test.tsx",
      ),
      status: "done",
      dependencies: ["@gpuix/react/floating"],
      related: ["list", "stepper"],
      limitations: [
        "Display-only; the status is passed per item, never derived.",
        "No aria-current; the current event uses aria-selected.",
        "The last event is detected from direct children.",
      ],
    },
  ),
  delivered(
    "color-picker",
    "Color picker",
    "2",
    "Selects a colour from a swatch grid or a HEX field.",
    {
      gpuix: "partial",
      sourcePath: "packages/components/src/color-picker.tsx",
      api: ["ColorPickerProps"],
      runtime: nativeSuite(
        "@gpuixui/components",
        "src/behaviour/color-picker.test.tsx",
      ),
      status: "done",
      dependencies: ["@gpuix/react/floating", "effect/Option"],
      related: ["badge"],
      limitations: [
        "No saturation/value square: 0.10.0 has no radial gradient, so the square is not faked.",
        "HEX plus swatches only: no alpha, HSL, RGB or eyedropper.",
      ],
    },
  ),
  delivered(
    "tag-input",
    "Tag / token input",
    "2",
    "An input that collects removable tokens.",
    {
      gpuix: "partial",
      sourcePath: "packages/components/src/tag-input.tsx",
      api: ["TagInputProps", "TagInputChipProps"],
      runtime: nativeSuite(
        "@gpuixui/components",
        "src/behaviour/tag-input.test.tsx",
      ),
      status: "done",
      dependencies: [
        "@gpuix/react/floating",
        "effect/Array",
        "effect/Option",
        "effect/String",
      ],
      related: ["text-input", "inline-validation"],
      limitations: [
        "No Backspace-on-empty: 0.10.0 emits no keyDown for Backspace/Delete in the test renderer.",
        "No aria-disabled (readOnly plus dimming) and no autocomplete.",
        "Controlled only: the value comes from the caller.",
      ],
    },
  ),
  delivered(
    "mention-input",
    "Mention input",
    "2",
    "An input with an anchored ranked suggestion list.",
    {
      gpuix: "partial",
      sourcePath: "packages/components/src/mention-input.tsx",
      api: ["MentionInputProps", "MentionInputItemProps"],
      liveScene: "mention-input",
      runtime: nativeSuite(
        "@gpuixui/components",
        "src/behaviour/mention-input.test.tsx",
      ),
      status: "done",
      dependencies: ["@gpuix/react/floating", "effect/Option"],
      related: ["combobox", "text-area"],
      limitations: [
        "The query comes from the text's last @ token, not the caret (no caret API).",
        "A space while the list is open is consumed by the runtime.",
        "Listbox/option roles are dropped from the accessibility dump; rows are selected buttons.",
      ],
    },
  ),
  delivered(
    "hotkey-input",
    "Hotkey-recorder input",
    "2",
    "Records a keyboard accelerator.",
    {
      gpuix: "partial",
      sourcePath: "packages/components/src/hotkey-recorder.tsx",
      api: ["HotkeyRecorderProps"],
      runtime: nativeSuite(
        "@gpuixui/components",
        "src/behaviour/hotkey-recorder.test.tsx",
      ),
      status: "done",
      dependencies: ["@gpuix/react/floating", "effect/Option", "keycap"],
      related: ["keycap"],
      limitations: [
        "No preventDefault in 0.10.0, so a captured system chord still fires.",
        "Clearing is a control because the test renderer emits no Backspace/Delete.",
        "No conflict detection.",
      ],
    },
  ),
  delivered(
    "countdown",
    "Countdown",
    "2",
    "Counts down to a moment using the app's clock.",
    {
      gpuix: "yes",
      sourcePath: "packages/components/src/countdown.tsx",
      api: ["CountdownProps"],
      runtime: nativeSuite(
        "@gpuixui/components",
        "src/behaviour/countdown.test.tsx",
      ),
      status: "done",
      dependencies: ["@gpuix/react/floating"],
      related: ["stepper"],
      limitations: [
        "The component owns no timer; the app ticks with Effect Clock.",
        "Fixed locale-free format, and no role=timer for a live announcement.",
      ],
    },
  ),
  delivered("carousel", "Carousel", "2", "Steps through a set of views.", {
    gpuix: "partial",
    sourcePath: "packages/components/src/carousel.tsx",
    api: ["CarouselProps", "CarouselSlideProps"],
    runtime: nativeSuite(
      "@gpuixui/components",
      "src/behaviour/carousel.test.tsx",
    ),
    status: "done",
    dependencies: ["@gpuix/react/floating"],
    related: ["tabs"],
    limitations: [
      "No slide animation (motion has no transform) and no swipe.",
      "No indicator dots or auto-advance; slides must be the track's direct children.",
    ],
  }),
  delivered(
    "inline-edit",
    "Inline edit",
    "2",
    "Swaps text for an input in place.",
    {
      gpuix: "partial",
      sourcePath: "packages/components/src/inline-edit.tsx",
      api: ["InlineEditProps"],
      runtime: nativeSuite(
        "@gpuixui/components",
        "src/behaviour/inline-edit.test.tsx",
      ),
      status: "done",
      dependencies: ["@gpuix/react/floating"],
      related: ["text-input"],
      limitations: [
        "No contenteditable in 0.10.0; the display swaps for a real input.",
        "No aria-invalid or aria-describedby.",
        "Blur commits by contract.",
      ],
    },
  ),
  delivered(
    "keycap",
    "Keyboard shortcuts / keycap display",
    "2",
    "A categorised shortcut table with keycaps.",
    {
      gpuix: "yes",
      sourcePath: "packages/components/src/keyboard-shortcuts.tsx",
      api: ["KeyboardShortcutsProps", "KeycapProps"],
      runtime: nativeSuite(
        "@gpuixui/components",
        "src/behaviour/keyboard-shortcuts.test.tsx",
      ),
      status: "done",
      dependencies: ["@gpuix/react/floating"],
      related: ["context-menu", "command-menu"],
      limitations: [
        "Display-only: a row documents a chord, never binds it.",
        "No aria-keyshortcuts in 0.10.0.",
        "Rows are separated by 1px elements because an element has one borderColor.",
      ],
    },
  ),
];

export const entries: ReadonlyArray<ComponentMetaInput> = [
  ...foundational,
  ...composition,
];
