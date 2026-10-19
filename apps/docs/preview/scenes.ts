/**
 * The scenes a live preview can run (plans 455 and 456).
 *
 * The dependency-free contract (names, pages, labels, instructions and steps)
 * lives in `scene-contract.ts`; this module re-exports it and adds the text
 * assertions. The split keeps `effect` (through `form-scene`) out of the server
 * search bundle while every existing importer keeps one entry point (plan 582).
 *
 * Adding a scene means adding its key to the contract, its expectation below
 * and its view in `scene-views.tsx`; no half may drift.
 */
import { FORM_MESSAGE } from "./form-scene";
import type { LiveScene } from "./scene-contract";

export {
  LIVE_SCENES,
  SCENE_GESTURE,
  SCENE_INTERACTION,
  SCENE_LABEL,
  SCENE_PAGE,
  SCENE_TEXT_IS_SCENE_PROSE,
  isLiveScene,
  type LiveScene,
  type SceneStep,
} from "./scene-contract";

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
  "color-picker": "Accent set to red",
  "inline-edit": "Renamed Atlas Prime",
  form: "Account created",
  accordion: "Email me when a deployment finishes.",
  "number-field": "Quantity is 12",
  "otp-field": "Six digits entered",
  rating: "Rated 4 of 5",
  "tag-input": "runtime",
  toggle: "Bold is on",
  list: "Weekly report opened",
  collapsible: "Only failed runs are reported.",
  pagination: "Showing results 31–40",
  "time-picker": "Reminder at 10:30",
  carousel: "Release notes slide 2 of 2",
  "message-scroller": "Jump to latest",
  showcase: "Three people can edit this workspace.",
  "confirmation-flow": "Workspace deleted",
  "command-palette": "Duplicated the project into a new copy.",
  "project-browser": "Opened from the project list.",
};

/**
 * Text a multi-phase gesture paints at an intermediate step (plan 573).
 *
 * `SCENE_TEXT` proves the scene's final state. A lifecycle with two documented
 * outcomes needs the first one checked too, or a regression that swallowed the
 * invalid branch would still pass the final-state assertion. The key is the
 * **1-based** step that paints the text; the smoke asserts the text is absent
 * before that step and present after it.
 */
export const SCENE_STEP_TEXT: Readonly<
  Partial<Record<LiveScene, Readonly<Record<number, string>>>>
> = {
  form: { 1: FORM_MESSAGE },
  "project-browser": { 1: "No projects match" },
};
