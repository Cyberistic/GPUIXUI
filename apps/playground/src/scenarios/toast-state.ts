/**
 * The toast probe's pure half: the queue rules the native lifecycle asserts on.
 *
 * Kept out of the view so the two rules a weaker implementation gets wrong — a
 * bounded stack that drops the **oldest**, and ids that are never reused (a
 * stale timer must not dismiss the toast that replaced its own) — are provable
 * on a host with no GPUix binding.
 */
import * as Arr from "effect/Array";

/** What a caller asks to show; the queue assigns the id. */
export interface ToastDraft {
  readonly title: string;
  readonly durationMs: number;
}

/** One queued toast. */
export interface Toast {
  readonly id: number;
  readonly title: string;
  readonly durationMs: number;
}

/** The queue plus its id counter. */
export interface ToastState {
  readonly seq: number;
  readonly toasts: ReadonlyArray<Toast>;
}

/** No toasts, and the next id is 1. */
export const emptyToasts: ToastState = { seq: 0, toasts: [] };

/**
 * Appends `draft` and keeps at most `max` toasts, dropping the oldest.
 *
 * The id is the previous counter plus one, so dismissing a toast never frees
 * its id for reuse.
 */
export const pushToast = (
  state: ToastState,
  draft: ToastDraft,
  max = 3,
): ToastState => {
  const id = state.seq + 1;
  const keep = Math.max(1, Math.trunc(max));
  return {
    seq: id,
    toasts: Arr.takeRight(Arr.append(state.toasts, { id, ...draft }), keep),
  };
};

/** Removes exactly the toast with `id`; every other toast keeps its order. */
export const dismissToast = (state: ToastState, id: number): ToastState => ({
  ...state,
  toasts: Arr.filter(state.toasts, (toast) => toast.id !== id),
});

/** Removes every toast. The id counter is kept, so ids stay monotonic. */
export const clearToasts = (state: ToastState): ToastState => ({
  ...state,
  toasts: [],
});
