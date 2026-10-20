/**
 * The JSX-free, dependency-free half of the live-scene contract: the scene
 * names, their pages, the reader instruction and the automation steps (plan
 * 582). `scenes.ts` re-exports all of it and adds the text assertions, including
 * the form schema that pulls `effect`; the search document imports this module
 * so the server bundle never reaches the runtime-only half.
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
  "color-picker",
  "inline-edit",
  "form",
  "accordion",
  "number-field",
  "otp-field",
  "rating",
  "tag-input",
  "toggle",
  "list",
  "collapsible",
  "pagination",
  "time-picker",
  "carousel",
  "message-scroller",
  "showcase",
  "confirmation-flow",
  "command-palette",
  "project-browser",
  "app-shell",
] as const;

export type LiveScene = (typeof LIVE_SCENES)[number];

export const isLiveScene = (value: string): value is LiveScene =>
  LIVE_SCENES.some((scene) => scene === value);

/**
 * The docs page that embeds a scene, when it is not the component page that
 * shares its slug (plan 560). The showcase is a composition, not a component
 * record, so its smoke page is named here; every other scene is driven on
 * `/docs/components/<scene>`.
 */
export const SCENE_PAGE: Readonly<Partial<Record<LiveScene, string>>> = {
  showcase: "/docs/showcase",
  "confirmation-flow": "/docs/patterns/confirmation-flow",
  "command-palette": "/docs/patterns/command-palette",
  "project-browser": "/docs/patterns/project-browser",
  "app-shell": "/docs/patterns/app-shell",
};

/**
 * The reader-facing name of a composition scene. A component scene borrows its
 * registry title; a composed page has no record, so the strategy's tier and
 * gesture tables read the name here instead of guessing one from the key.
 */
export const SCENE_LABEL: ReadonlyArray<{
  readonly scene: LiveScene;
  readonly title: string;
}> = [
  { scene: "showcase", title: "Showcase" },
  { scene: "confirmation-flow", title: "Confirmation flow" },
  { scene: "command-palette", title: "Command palette" },
  { scene: "project-browser", title: "Project browser" },
  { scene: "app-shell", title: "App shell" },
];

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
  | { readonly kind: "fill"; readonly testId: string; readonly text: string }
  /** Wheels over an element's painted centre; positive Y scrolls up. */
  | {
      readonly kind: "wheel";
      readonly testId: string;
      readonly deltaY: number;
      readonly deltaX?: number;
    };

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
  "color-picker": [{ kind: "click", testId: "scene-color-swatch-0" }],
  "inline-edit": [
    { kind: "click", testId: "scene-inline-edit" },
    { kind: "fill", testId: "scene-inline-edit", text: "Atlas Prime" },
    { kind: "press", testId: "scene-inline-edit", keys: "enter" },
  ],
  form: [
    { kind: "click", testId: "scene-form-submit" },
    { kind: "fill", testId: "scene-form-email", text: "ada@example.com" },
    { kind: "fill", testId: "scene-form-name", text: "Ada Lovelace" },
    { kind: "click", testId: "scene-form-submit" },
  ],
  list: [{ kind: "click-text", text: "Weekly report", within: "scene-list" }],
  collapsible: [{ kind: "click", testId: "scene-collapsible-trigger" }],
  pagination: [
    { kind: "click", testId: "scene-pagination-next" },
    { kind: "click", testId: "scene-pagination-next" },
    { kind: "click", testId: "scene-pagination-next" },
  ],
  "time-picker": [
    { kind: "click", testId: "scene-time-hours" },
    { kind: "press", testId: "scene-time-hours", keys: "up" },
  ],
  carousel: [{ kind: "click", testId: "scene-carousel-next" }],
  "message-scroller": [
    { kind: "wheel", testId: "scene-message-viewport", deltaY: 600 },
  ],
  "confirmation-flow": [
    { kind: "fill", testId: "scene-confirm-name", text: "atlas" },
    { kind: "click", testId: "confirm-accept" },
  ],
  "command-palette": [
    { kind: "click", testId: "scene-palette-trigger" },
    { kind: "click", testId: "command-duplicate" },
  ],
  "project-browser": [
    { kind: "fill", testId: "scene-project-search", text: "zzz" },
    { kind: "click", testId: "scene-project-clear" },
    { kind: "click-text", text: "Atlas", within: "scene-project-list" },
  ],
  "app-shell": [{ kind: "click", testId: "scene-shell-toggle" }],
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
  "color-picker": "Press the red swatch to commit it.",
  "inline-edit": "Click the name, type a new one and press Enter.",
  form: "Press Create account with an empty email to see the schema message, then fill both fields and press again.",
  list: "Click the weekly report to open it.",
  collapsible: "Open the advanced section.",
  pagination: "Press next three times to reach page four.",
  "time-picker": "Click the hour field, then press Up.",
  carousel: "Press the next control to see the second slide.",
  "message-scroller": "Wheel up in the log to leave the tail.",
  "confirmation-flow": "Type the workspace name, then confirm.",
  "command-palette": "Open the palette, then run Duplicate project.",
  "project-browser":
    "Type a query that matches nothing, clear it, then open a project.",
  "app-shell": "Open the navigation rail to see its destinations.",
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
