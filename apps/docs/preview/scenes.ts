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
  tabs: "Notifications",
  "dropdown-menu": "Duplicate",
  dialog: "Delete this workspace?",
  popover: "Show columns",
  "command-menu": "Go to Components",
  "confirm-dialog": "Archive this project?",
  icon: "Icon set",
  "scroll-area": "Activity log",
  skeleton: "Loading profile",
  spinner: "Saving changes",
};
