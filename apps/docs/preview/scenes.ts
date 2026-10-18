/**
 * The scenes a live preview can run (plans 455 and 456).
 *
 * Kept JSX-free so the docs app's registry test and the smoke script can prove
 * that every record's `liveScene` names a scene the build ships, and that every
 * scene has real text to look for. Adding a scene means adding its key here, its
 * expectation below and its view in `scene-views.tsx`; no half may drift.
 */
export const LIVE_SCENES = [
  "button",
  "tabs",
  "dropdown-menu",
  "dialog",
  "popover",
  "command-menu",
  "confirm-dialog",
  "icon",
  "scroll-area",
  "skeleton",
  "spinner",
  "drawer",
  "navigation-menu",
  "mention-input",
  "preview-card",
  "toast",
  "tooltip",
  "context-menu",
  "date-picker",
  "combobox",
  "hotkey-input",
  "select",
  "checkbox",
  "switch",
  "radio-group",
  "slider",
  "range-slider",
  "search-input",
  "text-input",
  "text-area",
  "accordion",
  "number-field",
  "otp-field",
  "rating",
  "tag-input",
  "toggle",
] as const;

export type LiveScene = (typeof LIVE_SCENES)[number];

export const isLiveScene = (value: string): value is LiveScene =>
  LIVE_SCENES.some((scene) => scene === value);

/**
 * The text each scene must put in GPUI's tree (plan 456). The smoke check reads
 * this table, and `scene-contract.test.ts` proves every value still occurs in
 * the view that renders it — so a changed composition fails the guard instead
 * of leaving a stale assertion behind.
 */
export const SCENE_TEXT: Readonly<Record<LiveScene, string>> = {
  button: "Save changes",
  tabs: "Your name and avatar appear beside every comment you write.",
  "dropdown-menu": "Duplicate",
  dialog: "Delete this workspace?",
  popover: "Show columns",
  "command-menu": "Go to Components",
  "confirm-dialog": "Archive this project?",
  icon: "Folder",
  "scroll-area": "09:45  Saved layout",
  skeleton: "Loading profile",
  spinner: "Writing 3 files…",
  drawer: "Narrow the result set, then apply.",
  "navigation-menu": "Runtime",
  "mention-input": "@alice",
  "preview-card": "Tokens, semantic roles and the theme extension mechanism.",
  toast: "The site rebuilds in about a minute.",
  tooltip: "Revenue, net of refunds.",
  "context-menu": "Copy path",
  "date-picker": "Booked 21 October",
  combobox: "Ada Lovelace",
  "hotkey-input": "Recorded p",
  select: "Europe — West",
  checkbox: "Release notes enabled",
  switch: "System theme applied",
  "radio-group": "Team plan selected",
  slider: "Volume at maximum",
  "range-slider": "Range narrowed",
  "search-input": "Searching for grid",
  "text-input": "Typed ada",
  "text-area": "Draft saved",
  accordion: "Email me when a deployment finishes.",
  "number-field": "Quantity is 12",
  "otp-field": "Six digits entered",
  rating: "Rated 4 of 5",
  "tag-input": "runtime",
  toggle: "Bold is on",
};

/**
 * The gesture a scene needs before its documented state exists (plan 486).
 *
 * Some components own their open state and expose no `defaultOpen`; the
 * published renderer's automation API can still drive the real interaction
 * (`globalThis.gpuix` in the preview document), so the smoke proves the surface
 * opens the way a reader opens it. A scene with steps must **not** paint its
 * `SCENE_TEXT` until the steps have run — the smoke asserts both directions.
 */
export type SceneStep =
  | { readonly kind: "hover"; readonly testId: string }
  | { readonly kind: "click"; readonly testId: string; readonly button?: 0 | 2 }
  /** An option that owns no test id is still a real target by its label. */
  | {
      readonly kind: "click-text";
      readonly text: string;
      /** The painted test id scoping the search to the control, not the prose. */
      readonly within: string;
    }
  | { readonly kind: "press"; readonly testId: string; readonly keys: string }
  /** Types through the renderer's keyboard path; the field's own edit path. */
  | { readonly kind: "fill"; readonly testId: string; readonly text: string };

export const SCENE_GESTURE: Readonly<
  Partial<Record<LiveScene, readonly SceneStep[]>>
> = {
  tooltip: [{ kind: "hover", testId: "scene-tooltip-trigger" }],
  "context-menu": [{ kind: "click", testId: "scene-context-row", button: 2 }],
  "date-picker": [
    { kind: "click", testId: "scene-date-trigger" },
    { kind: "click", testId: "date-day-2026-10-21" },
  ],
  combobox: [{ kind: "click", testId: "scene-combobox-trigger" }],
  "hotkey-input": [
    { kind: "click", testId: "scene-hotkey" },
    { kind: "press", testId: "scene-hotkey", keys: "p" },
  ],
  select: [{ kind: "click", testId: "scene-select" }],
  checkbox: [{ kind: "click", testId: "scene-checkbox" }],
  switch: [{ kind: "click", testId: "scene-switch" }],
  "radio-group": [{ kind: "click-text", text: "Team", within: "scene-radio" }],
  slider: [{ kind: "press", testId: "scene-slider", keys: "end" }],
  "range-slider": [{ kind: "click", testId: "scene-range" }],
  "search-input": [{ kind: "fill", testId: "scene-search", text: "grid" }],
  "text-input": [{ kind: "fill", testId: "scene-name", text: "ada" }],
  "text-area": [{ kind: "fill", testId: "scene-note", text: "ship it" }],
};

/**
 * What a reader does to see the opened state. Rendered above the surface in the
 * docs and inside the preview document, so a scene is never a mystery frame.
 */
export const SCENE_INTERACTION: Readonly<Partial<Record<LiveScene, string>>> = {
  tooltip: "Hover the info control to open the tip.",
  "context-menu": "Right-click the project row to open the menu.",
  "date-picker": "Click the due-date field, then the 21st, to book it.",
  combobox: "Click the reviewer field to open the suggestions.",
  "hotkey-input": "Click the shortcut field, then press P.",
  select: "Click the region field to open its list.",
  checkbox: "Click the box to subscribe.",
  switch: "Click the switch to turn the system theme on.",
  "radio-group": "Click the Team option to select it.",
  slider: "Focus the volume slider and press End.",
  "range-slider": "Click the track to move its nearer thumb.",
  "search-input": "Type a search term into the field.",
  "text-input": "Type a name into the field.",
  "text-area": "Type a note into the field.",
};

/**
 * Scenes whose expectation is the scene's own prose because the component
 * paints no text. A reason is mandatory; `scene-contract.test.ts` pins the set
 * so an exemption is a deliberate act.
 */
export const SCENE_TEXT_IS_SCENE_PROSE: Readonly<
  Partial<Record<LiveScene, string>>
> = {
  skeleton:
    "Skeleton paints no text: the canvas plus three muted bars are the evidence.",
};
