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
  planned(
    "text",
    "Text / typography",
    "1",
    "Renders text at a named typography role.",
    { gpuix: "yes" },
  ),
  planned("icon", "Icons", "1", "A sized, aligned glyph from the icon set.", {
    gpuix: "yes",
    packageName: "@gpuixui/icons",
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
  planned(
    "button-group",
    "Button groups",
    "1",
    "Groups related buttons into one control.",
    { related: ["button"] },
  ),
  planned("label", "Labels", "1", "Names a control for sighted users."),
  planned(
    "text-input",
    "Text inputs",
    "1",
    "A single-line editable text field.",
    { gpuix: "yes" },
  ),
  planned("text-area", "Text areas", "1", "A multi-line editable text field.", {
    gpuix: "yes",
  }),
  planned(
    "checkbox",
    "Checkboxes",
    "1",
    "Toggles a single independent option.",
  ),
  planned("radio-group", "Radio groups", "1", "Selects one option from a set."),
  planned("select", "Selects", "1", "Selects one value from a list.", {
    gpuix: "yes",
  }),
  planned("switch", "Switches", "1", "Toggles a setting on or off."),
  planned(
    "progress",
    "Progress",
    "1",
    "Shows completion of a determinate task.",
  ),
  planned("tooltip", "Tooltips", "1", "Labels a control on hover or focus.", {
    gpuix: "yes",
  }),
  planned(
    "skeleton",
    "Skeletons",
    "1",
    "Placeholder shape for loading content.",
  ),
  planned(
    "spinner",
    "Loading indicators",
    "1",
    "Shows an indeterminate busy state.",
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
  planned(
    "card",
    "Cards",
    "2",
    "Frames a discrete unit of content and actions.",
    { related: ["collapsible"] },
  ),
  planned("badge", "Badges", "2", "A compact status or count label."),
  planned(
    "avatar",
    "Avatars",
    "2",
    "Represents a person or entity by image or initials.",
  ),
  planned(
    "list",
    "Lists / list items",
    "2",
    "A vertical collection of selectable rows.",
  ),
  planned(
    "message-scroller",
    "Message scroller",
    "2",
    "Keeps a transcript on new content while the reader stays in control.",
    { related: ["list"] },
  ),
  planned(
    "empty-state",
    "Empty states",
    "2",
    "Explains an empty region and its next action.",
  ),
  planned(
    "alert",
    "Alerts",
    "2",
    "A persistent message for the current context.",
  ),
  planned(
    "inline-validation",
    "Inline validation",
    "2",
    "Field-level error and hint messaging.",
  ),
  planned(
    "toast",
    "Toasts / notifications",
    "2",
    "A transient message about an action's outcome.",
  ),
  planned(
    "dialog",
    "Dialogs",
    "2",
    "A modal surface that interrupts for a task.",
    { related: ["confirm-dialog", "drawer"] },
  ),
  planned(
    "confirm-dialog",
    "Confirmation dialogs",
    "2",
    "A dialog that confirms a consequential action.",
    { related: ["dialog"] },
  ),
  planned(
    "popover",
    "Popovers",
    "2",
    "A non-modal floating surface anchored to a trigger.",
    { related: ["preview-card"] },
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
