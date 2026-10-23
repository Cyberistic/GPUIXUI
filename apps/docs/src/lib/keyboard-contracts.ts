/**
 * The keys each component handles, and what they do.
 *
 * `MISSION.md` asks every component page for its keyboard notes, and the
 * template had no shape for them: the pages are Markdown this site mounts or
 * MDX it writes, so a hand-written list would drift the first time a handler
 * moved. This model is the authored half — the sentence a key is worth — and
 * `keyboard-contracts.test.ts` is the derived half: it reads the cited modules
 * and requires every fixed key they handle to be named here, so a page cannot
 * teach a key its component dropped or stay silent about one it gained.
 *
 * A component whose keys belong to the runtime's headless surface (the
 * primitives' `Select`) has no entry to read, and a page that writes its own
 * `## Keyboard` section keeps it: `<KeyboardStrip>` renders nothing there.
 */

/** Every key name a page may print, spelled the way a keyboard reads it. */
export const keyLabels = [
  "Enter",
  "Space",
  "Escape",
  "Tab",
  "Home",
  "End",
  "Arrow Up",
  "Arrow Down",
  "Arrow Left",
  "Arrow Right",
  "Page Up",
  "Page Down",
  "Ctrl+N",
  "Ctrl+P",
  "Cmd/Ctrl+A",
  "Shift+F10",
] as const;

export type KeyLabel = (typeof keyLabels)[number];

/** One row of the strip: the keys, and what pressing them does. */
export interface KeyboardNote {
  readonly keys: readonly KeyLabel[];
  readonly action: string;
}

/** A page's keyboard contract, read from the modules that implement it. */
export interface KeyboardContract {
  /** The page the strip renders on. */
  readonly url: string;
  /** The modules the keys are read from, repository-relative. */
  readonly sources: readonly string[];
  readonly notes: readonly KeyboardNote[];
  /** Keys that are not fixed names — type-ahead, a submitted value. */
  readonly also?: string;
}

const modal: readonly string[] = ["packages/components/src/internal/modal.ts"];
const menu: readonly string[] = [
  "packages/components/src/menu/surface.tsx",
  "packages/components/src/internal/modal.ts",
];

/** Enter and Space activate on opposite halves: Enter on the press, Space on the release. */
const activation: readonly KeyLabel[] = ["Enter", "Space"];

export const keyboardContracts: readonly KeyboardContract[] = [
  {
    url: "/docs/components/accordion",
    sources: ["packages/components/src/accordion.tsx"],
    notes: [
      {
        keys: activation,
        action: "expands or collapses the focused section",
      },
      {
        keys: ["Arrow Down", "Arrow Up", "Ctrl+N", "Ctrl+P"],
        action: "moves to the next or previous trigger",
      },
      { keys: ["Home", "End"], action: "the first or last trigger" },
    ],
  },
  {
    url: "/docs/components/alert",
    sources: ["packages/components/src/alert.tsx"],
    notes: [{ keys: activation, action: "runs the alert's action" }],
  },
  {
    url: "/docs/components/breadcrumb",
    sources: ["packages/components/src/breadcrumb.tsx"],
    notes: [{ keys: activation, action: "follows the focused crumb" }],
  },
  {
    url: "/docs/components/button",
    sources: ["packages/primitives/src/components/Button.tsx"],
    notes: [{ keys: activation, action: "activates the button" }],
  },
  {
    url: "/docs/components/carousel",
    sources: ["packages/components/src/carousel.tsx"],
    notes: [
      { keys: ["Arrow Right", "Arrow Left"], action: "steps one slide" },
      { keys: ["Home", "End"], action: "the first or last slide" },
      { keys: activation, action: "chooses the focused dot" },
    ],
  },
  {
    url: "/docs/components/checkbox",
    sources: ["packages/primitives/src/components/Checkbox.tsx"],
    notes: [{ keys: activation, action: "toggles the box" }],
  },
  {
    url: "/docs/components/collapsible",
    sources: ["packages/components/src/collapsible.tsx"],
    notes: [
      {
        keys: activation,
        action: "expands or collapses the section",
      },
    ],
  },
  {
    url: "/docs/components/color-picker",
    sources: ["packages/components/src/color-picker.tsx"],
    notes: [{ keys: activation, action: "chooses the focused swatch" }],
  },
  {
    url: "/docs/components/combobox",
    sources: ["packages/components/src/combobox.tsx"],
    notes: [{ keys: ["Escape"], action: "closes the open list" }],
    also: "The option list's arrows and Enter belong to the runtime's headless list (`@gpuix/react`), not to this package.",
  },
  {
    url: "/docs/components/command-menu",
    sources: [
      "packages/components/src/command-menu.tsx",
      "packages/components/src/internal/modal.ts",
    ],
    notes: [
      {
        keys: ["Arrow Down", "Arrow Up", "Ctrl+N", "Ctrl+P"],
        action: "moves the highlight",
      },
      { keys: ["Home", "End"], action: "the first or last action" },
      { keys: ["Escape"], action: "closes the palette" },
      { keys: ["Tab"], action: "keeps focus inside the dialog" },
    ],
    also: "Enter runs the highlighted action through the search field's submit.",
  },
  {
    url: "/docs/components/confirm-dialog",
    sources: modal,
    notes: [
      { keys: ["Escape"], action: "cancels, unless a confirm is busy" },
      { keys: ["Tab"], action: "keeps focus inside the dialog" },
    ],
    also: "Cancel is focused first; confirming reports and never closes.",
  },
  {
    url: "/docs/components/context-menu",
    sources: ["packages/components/src/context-menu.tsx", ...menu],
    notes: [
      {
        keys: ["Shift+F10"],
        action: "opens the menu at the trigger, as the Menu key does",
      },
      {
        keys: ["Arrow Down", "Arrow Up", "Ctrl+N", "Ctrl+P"],
        action: "moves the highlighted row",
      },
      { keys: ["Home", "End"], action: "the first or last row" },
      { keys: activation, action: "runs the highlighted row" },
      { keys: ["Escape"], action: "closes the topmost surface" },
      { keys: ["Tab"], action: "closes the menu and lets focus move on" },
    ],
  },
  {
    url: "/docs/components/date-picker",
    sources: [
      "packages/components/src/date-picker.tsx",
      "packages/components/src/popover.tsx",
    ],
    notes: [
      {
        keys: ["Arrow Left", "Arrow Right"],
        action: "moves a day",
      },
      {
        keys: ["Arrow Down", "Arrow Up", "Ctrl+N", "Ctrl+P"],
        action: "moves a week",
      },
      { keys: ["Home", "End"], action: "the week's first or last day" },
      { keys: ["Page Up", "Page Down"], action: "the previous or next month" },
      { keys: activation, action: "chooses the focused day" },
      { keys: ["Escape"], action: "closes the calendar" },
      { keys: ["Tab"], action: "closes the calendar and lets focus move on" },
    ],
  },
  {
    url: "/docs/components/dialog",
    sources: modal,
    notes: [
      { keys: ["Escape"], action: "dismisses the topmost overlay" },
      {
        keys: ["Tab"],
        action: "keeps focus inside the dialog, wrapping with `Shift+Tab`",
      },
    ],
  },
  {
    url: "/docs/components/drawer",
    sources: modal,
    notes: [
      { keys: ["Escape"], action: "dismisses the drawer" },
      { keys: ["Tab"], action: "keeps focus inside the drawer" },
    ],
  },
  {
    url: "/docs/components/dropdown-menu",
    sources: ["packages/components/src/dropdown-menu.tsx", ...menu],
    notes: [
      {
        keys: ["Arrow Down", "Ctrl+N"],
        action: "opens on the first row, and moves down a row once open",
      },
      {
        keys: ["Arrow Up", "Ctrl+P"],
        action: "opens on the last row, and moves up a row once open",
      },
      { keys: ["Home", "End"], action: "the first or last row" },
      {
        keys: activation,
        action: "opens the trigger, then runs the highlighted row",
      },
      { keys: ["Escape"], action: "closes the topmost surface" },
      { keys: ["Tab"], action: "closes the menu and lets focus move on" },
    ],
  },
  {
    url: "/docs/components/inline-edit",
    sources: ["packages/components/src/inline-edit.tsx"],
    notes: [
      { keys: ["Enter"], action: "starts an edit, and commits the input" },
      { keys: ["Space"], action: "starts an edit on the display" },
      { keys: ["Escape"], action: "cancels and restores the stored value" },
    ],
  },
  {
    url: "/docs/components/list",
    sources: ["packages/components/src/list.tsx"],
    notes: [
      {
        keys: ["Arrow Down", "Arrow Up", "Ctrl+N", "Ctrl+P"],
        action: "moves the focus ring",
      },
      { keys: ["Home", "End"], action: "the first or last row" },
      {
        keys: ["Enter"],
        action: "activates the row, and selects it when the list is selectable",
      },
      { keys: ["Space"], action: "selects the focused row" },
      { keys: ["Cmd/Ctrl+A"], action: "selects every row" },
    ],
    also: "A typed letter jumps to the first row whose label starts with it.",
  },
  {
    url: "/docs/components/navigation-menu",
    sources: ["packages/components/src/navigation-menu.tsx"],
    notes: [
      {
        keys: ["Arrow Down", "Ctrl+N"],
        action: "opens the trigger's panel and moves focus into it",
      },
      {
        keys: ["Arrow Left", "Arrow Right"],
        action: "moves between triggers",
      },
      { keys: ["Home", "End"], action: "the first or last trigger" },
      { keys: ["Escape"], action: "dismisses the open panel" },
    ],
  },
  {
    url: "/docs/components/popover",
    sources: ["packages/components/src/popover.tsx"],
    notes: [
      { keys: ["Escape"], action: "closes the popover" },
      { keys: ["Tab"], action: "closes it and lets focus leave" },
    ],
  },
  {
    url: "/docs/components/search-input",
    sources: ["packages/components/src/search-input.tsx"],
    notes: [
      { keys: ["Escape"], action: "clears the field" },
      { keys: activation, action: "clears through the clear target" },
    ],
    also: "Enter in the field submits through `onSubmit`.",
  },
  {
    url: "/docs/components/switch",
    sources: ["packages/primitives/src/components/Switch.tsx"],
    notes: [{ keys: activation, action: "toggles the switch" }],
  },
  {
    url: "/docs/components/tabs",
    sources: ["packages/components/src/tabs.tsx"],
    notes: [
      {
        keys: [
          "Arrow Left",
          "Arrow Right",
          "Arrow Up",
          "Arrow Down",
          "Ctrl+N",
          "Ctrl+P",
        ],
        action: "moves along the rail's axis",
      },
      { keys: ["Home", "End"], action: "the first or last tab" },
      {
        keys: activation,
        action: 'selects the focused tab with `activation="manual"`',
      },
    ],
  },
  {
    url: "/docs/components/tag-input",
    sources: ["packages/components/src/tag-input.tsx"],
    notes: [
      { keys: ["Enter"], action: "commits the draft as a tag" },
      {
        keys: ["Space"],
        action: "removes a chip from its remove target",
      },
    ],
  },
  {
    url: "/docs/components/time-picker",
    sources: ["packages/components/src/time-picker.tsx"],
    notes: [
      {
        keys: ["Arrow Up", "Arrow Down"],
        action: "moves the focused segment by an hour, or by a minute step",
      },
      { keys: activation, action: "clears through the clear target" },
    ],
  },
];

/** The contract for a page, or nothing when the page has none. */
export const keyboardContractFor = (
  url: string,
): KeyboardContract | undefined =>
  keyboardContracts.find((contract) => contract.url === url);
