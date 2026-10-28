/**
 * One reload when a route's chunk has gone.
 *
 * A deploy replaces every hashed asset, so a tab that loaded the previous build
 * asks for a file the new deployment no longer has: Vite raises
 * `vite:preloadError`, the router cannot import the route, and the reader sees
 * the error page on every page they navigate to until they reload by hand.
 * Reloading is the whole fix, and once is enough — a second failure inside the
 * minute means the deployment itself is broken, so the flag stops a loop and
 * lets the error surface.
 */

/** The key the guard writes; a reader's own reload never sets it. */
const RELOADED_KEY = "gpuixui:preload-reloaded-at";

/** How long a reload is trusted to have fixed the chunk. */
const RELOAD_WINDOW_MS = 60_000;

/** Reload once if a preload failed and nothing reloaded in the last minute. */
export const reloadOnPreloadError = (
  now: number = Date.now(),
  reload: () => void = () => window.location.reload(),
): void => {
  const previous = window.sessionStorage.getItem(RELOADED_KEY);
  const at = previous === null ? Number.NaN : Number(previous);
  if (Number.isFinite(at) && now - at < RELOAD_WINDOW_MS) return;
  window.sessionStorage.setItem(RELOADED_KEY, String(now));
  reload();
};

/**
 * Install the listener. Called once by the root route in the browser.
 *
 * `vite:preloadError` is Vite's own event for a dynamic import that never
 * arrived; it does not bubble, so the listener sits on the document.
 */
export const watchPreloadErrors = (): void => {
  if (typeof window === "undefined") return;
  window.addEventListener("vite:preloadError", () => reloadOnPreloadError());
};
