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

interface PlannedOptions {
  readonly gpuix?: Support;
  readonly related?: readonly string[];
  /** Overrides the tier's default package when a component lives in its own package. */
  readonly packageName?: string;
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
  dependencies: [],
  related: options.related ?? [],
  playgroundScreen: null,
  screenshots: [],
  limitations: [],
});

interface DeliveredOptions extends PlannedOptions {
  /** Repo-relative path to the shipped component. */
  readonly sourcePath: string;
  /** The runtime gaps a reader must know before adopting it. */
  readonly limitations: readonly string[];
  readonly dependencies?: readonly string[];
}

/**
 * A component that exists in the repository. `wip`, not `done`: the docs page,
 * the props table and the source are real, while `done` waits on the published
 * GPUix binary (the primitives workstream's rule).
 */
const delivered = (
  slug: string,
  title: string,
  tier: Tier,
  summary: string,
  options: DeliveredOptions,
): ComponentMetaInput => ({
  ...planned(slug, title, tier, summary, options),
  status: "wip",
  sourcePath: options.sourcePath,
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
      related: ["box", "stack"],
      limitations: [
        "No scrollbar tint or width control in GPUix 0.10.0.",
        "No fade mask at the edges.",
        "onScroll carries deltas only; there is no absolute offset.",
        "No virtualisation: a long list mounts every row.",
      ],
    },
  ),
  {
    slug: "button",
    title: "Buttons",
    tier: "1",
    group: "foundational",
    status: "wip",
    gpuix: "yes",
    summary: "Triggers an action; the primary interactive control.",
    packageName: "@gpuixui/primitives",
    sourcePath: "packages/primitives/src/components/Button.tsx",
    dependencies: [],
    related: ["button-group"],
    playgroundScreen: null,
    screenshots: [],
    limitations: [
      "No focusVisible: the focus ring cannot distinguish pointer from keyboard focus.",
      "No aria-disabled, aria-pressed or toggle state; a disabled button leaves the tab order.",
      "An icon-only button must pass label; the component cannot infer one.",
      "No native button element: the runtime renders a div with role and handlers.",
    ],
  },
  delivered(
    "button-group",
    "Button groups",
    "1",
    "Groups related buttons into one control.",
    {
      gpuix: "yes",
      sourcePath: "packages/primitives/src/components/ButtonGroup.tsx",
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
      related: ["checkbox", "select"],
      limitations: [
        "Options are data: no compound item or rich child content.",
        "No type-ahead selection.",
        "An option description is not associated for assistive technology.",
      ],
    },
  ),
  delivered("select", "Selects", "1", "Selects one value from a list.", {
    gpuix: "yes",
    sourcePath: "packages/primitives/src/components/Select.tsx",
    dependencies: ["@gpuix/react/select"],
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
      related: ["spinner", "skeleton"],
      limitations: [
        "No aria-valuenow: the value is announced through aria-valuetext.",
        "The indeterminate segment is a discrete step, not a smooth sweep.",
        "No buffer value, stacked segments or label inside the track.",
      ],
    },
  ),
  delivered("tooltip", "Tooltips", "1", "Labels a control on hover or focus.", {
    gpuix: "yes",
    sourcePath: "packages/primitives/src/components/Tooltip.tsx",
    dependencies: ["@gpuix/react/tooltip"],
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
      related: ["progress", "skeleton"],
      limitations: [
        "Cannot rotate: the runtime's motion has no rotation.",
        "The lit dot jumps by design; there is no smooth animation.",
        "No inline placement inside a text run; put it in a Stack.",
      ],
    },
  ),
  planned(
    "slider",
    "Slider",
    "1",
    "Selects a value or range by dragging a thumb.",
  ),
  planned(
    "range-slider",
    "Range slider",
    "1",
    "A two-thumb variant of Slider.",
    { related: ["slider"] },
  ),
  planned(
    "meter",
    "Meter",
    "1",
    "A value within a known range, not task completion.",
    { related: ["progress"] },
  ),
  planned(
    "number-field",
    "Number Field",
    "1",
    "A numeric input with stepper, clamping and formatting.",
  ),
  planned("otp-field", "OTP Field", "1", "A segmented one-time-code input."),
  planned("toggle", "Toggle", "1", "A momentary pressed control.", {
    related: ["switch"],
  }),
  planned("rating", "Rating", "1", "A radio-like score input.", {
    related: ["radio-group"],
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
      related: ["list", "empty-state"],
      limitations: [
        "The surface clips overflow, so a scroller belongs in CardContent.",
        "No interactive or overlay behaviour: compose controls inside it.",
        "The docs site cannot render it live; the example and source are real.",
      ],
    },
  ),
  delivered("badge", "Badges", "2", "A compact status or count label.", {
    gpuix: "yes",
    sourcePath: "packages/components/src/badge.tsx",
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
      related: ["card", "badge"],
      limitations: [
        "Single selection only: no multi-select, type-ahead or reorder.",
        "No virtualisation: every row mounts.",
        "The focus ring shows for a click too; 0.10.0 has no focusVisible.",
      ],
    },
  ),
  planned(
    "message-scroller",
    "Message scroller",
    "2",
    "Keeps a transcript on new content while the reader stays in control.",
    { related: ["list"] },
  ),
  delivered(
    "empty-state",
    "Empty states",
    "2",
    "Explains an empty region and its next action.",
    {
      gpuix: "yes",
      sourcePath: "packages/components/src/empty-state.tsx",
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
      related: ["alert", "dialog"],
      limitations: [
        "No aria-live or aria-atomic; the viewport is a status region.",
        "No progress indicator and no pause-on-hover.",
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
      gpuix: "yes",
      sourcePath: "packages/components/src/popover.tsx",
      related: ["dialog", "dropdown-menu"],
      limitations: [
        "No aria-haspopup, aria-controls or aria-labelledby.",
        "No arrow, custom anchor or backdrop.",
        "An outside press does not restore focus to the trigger.",
      ],
    },
  ),
  planned(
    "dropdown-menu",
    "Dropdown menus",
    "2",
    "A list of actions from a trigger.",
    { related: ["context-menu", "navigation-menu"] },
  ),
  planned(
    "context-menu",
    "Context menus",
    "2",
    "A list of actions for a region or item.",
    { related: ["dropdown-menu"] },
  ),
  planned(
    "command-menu",
    "Command menus",
    "2",
    "A searchable list of commands and destinations.",
  ),
  planned("tabs", "Tabs", "2", "Switches between sibling views in place.", {
    related: ["button-group"],
  }),
  planned(
    "accordion",
    "Accordions",
    "2",
    "Expands and collapses stacked sections.",
    { related: ["collapsible"] },
  ),
  planned(
    "collapsible",
    "Collapsible sections",
    "2",
    "A single show/hide region.",
    { related: ["accordion"] },
  ),
  planned(
    "breadcrumb",
    "Breadcrumbs",
    "2",
    "Shows and navigates the current hierarchy.",
  ),
  planned("pagination", "Pagination", "2", "Moves through a long result set."),
  planned(
    "search-input",
    "Search inputs",
    "2",
    "A text field with search affordances.",
    { related: ["combobox"] },
  ),
  planned(
    "combobox",
    "Comboboxes",
    "2",
    "A text field that filters a list of options.",
    { gpuix: "yes", related: ["search-input"] },
  ),
  planned("date-picker", "Date / time pickers", "2", "Selects a date or time."),
  planned(
    "fieldset",
    "Fieldset",
    "2",
    "Groups related form controls with a legend.",
  ),
  planned(
    "form",
    "Form",
    "2",
    "Validation orchestration and submit lifecycle.",
  ),
  planned(
    "navigation-menu",
    "Navigation Menu",
    "2",
    "A nav whose items open content panels.",
    { related: ["dropdown-menu"] },
  ),
  planned(
    "preview-card",
    "Preview Card",
    "2",
    "A hover-triggered rich card with a positioner.",
    { related: ["popover"] },
  ),
  planned(
    "drawer",
    "Drawer",
    "2",
    "An edge-anchored panel with swipe-to-dismiss.",
    { related: ["dialog"] },
  ),
  planned("stepper", "Stepper", "2", "A multi-step progress indicator.", {
    related: ["progress"],
  }),
  planned(
    "timeline",
    "Timeline",
    "2",
    "An event timeline with connector styles.",
  ),
  planned(
    "color-picker",
    "Color picker",
    "2",
    "Selects a colour from HSL, RGB, HEX and swatches.",
  ),
  planned(
    "tag-input",
    "Tag / token input",
    "2",
    "An input that collects removable tokens.",
  ),
  planned(
    "mention-input",
    "Mention input",
    "2",
    "An input with an anchored suggestion list.",
    { related: ["combobox"] },
  ),
  planned(
    "hotkey-input",
    "Hotkey-recorder input",
    "2",
    "Records a keyboard accelerator.",
  ),
  planned(
    "countdown",
    "Countdown",
    "2",
    "Counts down to a moment using the app's clock.",
  ),
  planned("carousel", "Carousel", "2", "Steps through a set of views."),
  planned(
    "inline-edit",
    "Inline edit",
    "2",
    "Swaps text for an input in place.",
    { related: ["text-input"] },
  ),
  planned(
    "keycap",
    "Keyboard shortcuts / keycap display",
    "2",
    "A categorised shortcut table with keycaps.",
  ),
];

export const entries: ReadonlyArray<ComponentMetaInput> = [
  ...foundational,
  ...composition,
];
