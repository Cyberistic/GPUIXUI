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
