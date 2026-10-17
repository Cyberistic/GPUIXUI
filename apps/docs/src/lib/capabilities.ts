/**
 * The measured GPUix capability matrix (plan 448).
 *
 * `COMPONENTS.md` owns the verdicts; this module mirrors its "Measured native
 * evidence" table so the site can render it. `capabilities.test.ts` fails when
 * the two disagree or when a named scenario is missing from the playground
 * registry. Plain data, no Effect import: the browser bundle reads it.
 */
export type CapabilityVerdict = "verified" | "partial" | "unsupported";

export interface CapabilityEvidence {
  /** The capability name `COMPONENTS.md` uses. */
  readonly capability: string;
  /** The heading the reader sees. */
  readonly label: string;
  /** The playground scenario ids that prove it. */
  readonly scenarios: ReadonlyArray<string>;
  /** Mirrors the inventory verdict; never stronger. */
  readonly verdict: CapabilityVerdict;
  /** One sentence: what the native run establishes. */
  readonly proves: string;
  /** The plans that recorded the measurement. */
  readonly plans: ReadonlyArray<number>;
}

export const capabilities: ReadonlyArray<CapabilityEvidence> = [
  {
    capability: "layout",
    label: "Layout",
    scenarios: ["layout-flex", "shell-navigation"],
    verdict: "verified",
    proves:
      "Flex rows and columns land at the theme's gaps, absolute insets are exact, and the shell's sidebar scrolls without clipping.",
    plans: [120, 140, 151],
  },
  {
    capability: "text",
    label: "Text",
    scenarios: ["text-native"],
    verdict: "verified",
    proves:
      "A string paints in its role's family, size and line height, and its box height is the role's leading.",
    plans: [140],
  },
  {
    capability: "input",
    label: "Input",
    scenarios: ["input-edit"],
    verdict: "verified",
    proves:
      "Native keystrokes reach `onChange` with the accumulated text, and Enter reaches `onSubmit`.",
    plans: [140],
  },
  {
    capability: "focus",
    label: "Focus",
    scenarios: ["focus-traversal"],
    verdict: "verified",
    proves:
      "Tab order moves native focus, focus and blur events are delivered, and the focused element paints its ring.",
    plans: [140],
  },
  {
    capability: "overlay",
    label: "Overlay",
    scenarios: ["overlay-dialog"],
    verdict: "verified",
    proves:
      "A layer paints above the page, and a press outside it dismisses the topmost layer only.",
    plans: [120, 140],
  },
  {
    capability: "modal",
    label: "Modal",
    scenarios: ["modal-focus-trap"],
    verdict: "verified",
    proves:
      "Focus enters the surface, Tab wraps inside it, focus returns to the trigger, and a nested popover's Escape closes only the popover.",
    plans: [155],
  },
  {
    capability: "floating",
    label: "Floating layer",
    scenarios: ["floating-placement"],
    verdict: "verified",
    proves:
      '`side`, `sideOffset` and `align="start"` place a layer exactly; `align="center"` and `fit="snap"` are measured and documented as limited.',
    plans: [156],
  },
  {
    capability: "scroll",
    label: "Scroll",
    scenarios: ["scroll-container"],
    verdict: "verified",
    proves:
      "A wheel with `deltaY: -100` moves the offset to `-100`, and the component receives that delta.",
    plans: [120, 140],
  },
  {
    capability: "panel",
    label: "Panel",
    scenarios: ["panel-resize"],
    verdict: "verified",
    proves:
      "A divider drag resizes the split, and panes clamp at their minimum and maximum instead of collapsing.",
    plans: [120, 140],
  },
  {
    capability: "virtual-list",
    label: "Virtual list",
    scenarios: ["virtual-list-window"],
    verdict: "verified",
    proves:
      "A 5,000-row list retains every row in the tree but paints a window of about nine around the viewport.",
    plans: [120, 140],
  },
  {
    capability: "table",
    label: "Table",
    scenarios: [
      "table-select-sort",
      "table-column-resize",
      "virtualized-table",
    ],
    verdict: "verified",
    proves:
      "A painted row is hit-tested and selected, selection survives scrolling, columns sort, and a column resize follows the pointer.",
    plans: [130, 152],
  },
  {
    capability: "tree",
    label: "Tree",
    scenarios: ["tree-view"],
    verdict: "verified",
    proves:
      "Indentation is exact per depth, expand and collapse repaint, and a clicked row receives arrow keys.",
    plans: [153],
  },
  {
    capability: "log",
    label: "Log",
    scenarios: ["log-viewer"],
    verdict: "verified",
    proves:
      "A bottom-anchored list starts at the tail and re-anchors on appends.",
    plans: [154],
  },
  {
    capability: "workspace",
    label: "Workspace",
    scenarios: ["workspace-tab-drag"],
    verdict: "verified",
    proves:
      "A click activates a tab, a drag moves it to the other pane, and a divider drag resizes the split.",
    plans: [130, 140],
  },
  {
    capability: "theme",
    label: "Theme",
    scenarios: ["theme-color-roles", "theme-type-and-shadow"],
    verdict: "verified",
    proves:
      "Every colour role, every type role, the focus ring and the elevation shadow reach the renderer's own style report.",
    plans: [150],
  },
];

/** The rows `names` asks for, in matrix order; an unknown name is omitted. */
export const selectCapabilities = (
  names: ReadonlyArray<string> | undefined,
): ReadonlyArray<CapabilityEvidence> =>
  names === undefined
    ? capabilities
    : capabilities.filter((entry) => names.includes(entry.capability));
