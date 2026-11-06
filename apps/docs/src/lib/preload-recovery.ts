const RELOADED_KEY = "gpuixui:preload-reloaded-at";

const RELOAD_WINDOW_MS = 60_000;

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

export const watchPreloadErrors = (): void => {
  if (typeof window === "undefined") return;
  window.addEventListener("vite:preloadError", () => reloadOnPreloadError());
};
