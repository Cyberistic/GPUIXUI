/**
 * Guards the queue rules the toast probe depends on.
 *
 * The bugs these catch: an unbounded stack (so a burst of notifications hides
 * the window), dropping the **newest** instead of the oldest, and reusing an id
 * after a dismissal — the last one is the dangerous case, because a toast's
 * auto-dismiss timer is keyed by id and would remove the toast that replaced it.
 */
import { describe, expect, it } from "@effect/vitest";
import * as Arr from "effect/Array";
import {
  clearToasts,
  dismissToast,
  emptyToasts,
  pushToast,
  type ToastDraft,
} from "./toast-state.js";

const saved: ToastDraft = { title: "Saved", durationMs: 5000 };
const failed: ToastDraft = { title: "Sync failed", durationMs: 5000 };
const warning: ToastDraft = { title: "Low battery", durationMs: 5000 };
const info: ToastDraft = { title: "Update ready", durationMs: 5000 };

const ids = (state: { readonly toasts: ReadonlyArray<{ id: number }> }) =>
  Arr.map(state.toasts, (toast) => toast.id);
const titles = (state: { readonly toasts: ReadonlyArray<{ title: string }> }) =>
  Arr.map(state.toasts, (toast) => toast.title);

describe("pushToast", () => {
  it("appends in order with monotonic ids", () => {
    const first = pushToast(emptyToasts, saved);
    const second = pushToast(first, failed);
    expect(ids(second)).toEqual([1, 2]);
    expect(titles(second)).toEqual(["Saved", "Sync failed"]);
  });

  it("keeps only the newest three, dropping the oldest", () => {
    const state = Arr.reduce(
      [saved, failed, warning, info],
      emptyToasts,
      (current, draft) => pushToast(current, draft),
    );
    expect(Arr.length(state.toasts)).toBe(3);
    expect(titles(state)).toEqual([
      "Sync failed",
      "Low battery",
      "Update ready",
    ]);
  });
});

describe("dismissToast", () => {
  it("removes only the named toast and keeps the order of the rest", () => {
    const state = Arr.reduce(
      [saved, failed, warning],
      emptyToasts,
      (current, draft) => pushToast(current, draft),
    );
    const next = dismissToast(state, 2);
    expect(ids(next)).toEqual([1, 3]);
    expect(titles(next)).toEqual(["Saved", "Low battery"]);
  });

  it("never reuses a dismissed id", () => {
    const first = pushToast(emptyToasts, saved);
    const dismissed = dismissToast(first, 1);
    const second = pushToast(dismissed, failed);
    expect(ids(second)).toEqual([2]);
  });
});

describe("clearToasts", () => {
  it("empties the queue but keeps the counter moving", () => {
    const state = pushToast(pushToast(emptyToasts, saved), failed);
    const cleared = clearToasts(state);
    expect(cleared.toasts).toEqual([]);
    expect(ids(pushToast(cleared, warning))).toEqual([3]);
  });
});
