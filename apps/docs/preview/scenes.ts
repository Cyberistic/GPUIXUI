/**
 * The scenes a live preview can run (plan 455).
 *
 * Kept JSX-free so the docs app's registry test can prove that every record's
 * `liveScene` names a scene this build actually ships. Adding a scene means
 * adding its key here and its view in `scenes.tsx`; neither half may drift.
 */
export const LIVE_SCENES = ["button"] as const;

export type LiveScene = (typeof LIVE_SCENES)[number];

export const isLiveScene = (value: string): value is LiveScene =>
  LIVE_SCENES.some((scene) => scene === value);
