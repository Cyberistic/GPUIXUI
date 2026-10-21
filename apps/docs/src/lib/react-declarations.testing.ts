import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

/**
 * The installed `@gpuix/react` declarations and the reconciler source that
 * attaches the instance methods (plan 624). Test-only: the docs bundle must not
 * import the runtime, and this page's claims are about what a consumer installs.
 */
const reactRoot = (): string => {
  const entry = createRequire(import.meta.url).resolve("@gpuix/react");
  return dirname(entry);
};

/** `dist/types/host.d.ts` — `Props`, `Instance` and `PublicInstance`. */
export const installedReactHostDeclarations = (): string =>
  readFileSync(join(reactRoot(), "types/host.d.ts"), "utf8");

/** `dist/reconciler/host-config.js` — where `scrollIntoView` is attached. */
export const installedReactReconcilerSource = (): string =>
  readFileSync(join(reactRoot(), "reconciler/host-config.js"), "utf8");

/** `dist/components/floating.d.ts` — `FloatingContentProps` (plan 636). */
export const installedFloatingDeclarations = (): string =>
  readFileSync(join(reactRoot(), "components/floating.d.ts"), "utf8");

/** `dist/components/floating.js` — the layer's defaults and `<anchored>` call. */
export const installedFloatingLayerSource = (): string =>
  readFileSync(join(reactRoot(), "components/floating.js"), "utf8");

/** `dist/components/tooltip.js` — the tooltip's own placement defaults. */
export const installedTooltipSource = (): string =>
  readFileSync(join(reactRoot(), "components/tooltip.js"), "utf8");
