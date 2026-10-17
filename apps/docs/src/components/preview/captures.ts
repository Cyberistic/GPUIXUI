/**
 * Real-capture provenance (plan 412 §5). A screenshot is only ever shown with
 * the sidecar the playground capture script wrote beside it: platform, GPUix
 * version, commit, command and timestamp. The site never invents these, so a
 * PNG with no sidecar is not shown at all.
 *
 * The client bundle must not import `effect` (plan 411 §5), so this module is
 * plain data and absence is `| undefined` rather than `Option` — `Option` would
 * pull the Effect runtime into the browser bundle. `captures.test.ts` validates
 * the sidecar files with Effect Schema at the test boundary instead.
 */

/** The sidecar the capture script writes: `public/screenshots/<slug>/provenance.json`. */
export interface CaptureProvenance {
  /** e.g. `darwin-x64`. */
  readonly platform: string;
  /** The GPUix version whose surface was captured. */
  readonly gpuixVersion: string;
  /** The commit the capture ran at. */
  readonly commit: string;
  /** The exact command that produced the image. */
  readonly command: string;
  /** ISO-8601 capture time. */
  readonly capturedAt: string;
}

/**
 * Every sidecar under `public/screenshots`, keyed by its path from the docs
 * root (e.g. `/public/screenshots/button/provenance.json`). Vite inlines these
 * at build time, so a caption is a build-time constant and cannot drift.
 */
const sidecars: Readonly<Record<string, CaptureProvenance>> = import.meta.glob(
  "/public/screenshots/*/provenance.json",
  { eager: true, import: "default" },
);

/** One proven capture: the image the registry lists plus its real provenance. */
export interface Capture {
  /** Registry path under `public`, e.g. `screenshots/button/default.png`. */
  readonly screenshot: string;
  readonly provenance: CaptureProvenance;
}

/**
 * The capture for a registry screenshot path, or `undefined` when the capture
 * script has not written its sidecar yet. Absence must never become a rendered
 * guess, which is why the caller reports the missing sidecar instead of
 * falling back to the file name.
 */
export const captureFor = (screenshot: string): Capture | undefined => {
  const directory = screenshot.slice(0, screenshot.lastIndexOf("/"));
  const provenance = sidecars[`/public/${directory}/provenance.json`];
  return provenance === undefined ? undefined : { screenshot, provenance };
};

/**
 * The only caption a screenshot may show. Auditable against the exact text in
 * `docs/preview-strategy.md` §"The four honest tiers".
 */
export const captureCaption = (provenance: CaptureProvenance): string =>
  `Captured from GPUix — ${provenance.platform}, GPUix ${provenance.gpuixVersion}, ${provenance.commit}`;
