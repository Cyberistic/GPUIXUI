/**
 * Tab activation and move-anchor rules.
 *
 * The bugs these guard: `activation="manual"` selected a tab as soon as the arrow
 * keys moved focus, so Enter had nothing left to do and every visited panel
 * rendered anyway — manual mode behaved exactly like automatic. And a Tab
 * traversal into the strip focuses the selected trigger without delivering
 * `onFocus` (measured in a window on 0.11.0), so a move that anchors on recorded
 * focus alone re-anchored at the first enabled tab instead of moving on.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import { moveOrigin, selectsOnFocus } from "./logic.js";

describe("selectsOnFocus", () => {
  it("selects on focus in automatic mode", () => {
    expect(selectsOnFocus("automatic")).toBe(true);
  });

  it("waits for Enter or Space in manual mode", () => {
    expect(selectsOnFocus("manual")).toBe(false);
  });
});

/** The tab order the component moves through. */
const values: ReadonlyArray<string> = ["profile", "billing", "danger"];

const indexOf = (value: string): Option.Option<number> =>
  Arr.findFirstIndex(values, (candidate) => candidate === value);

/** The start index for one set of anchors, with `None` for an unnamed anchor. */
const origin = (anchors: {
  readonly keyOrigin?: string;
  readonly active?: string;
  readonly selected: string;
}): Option.Option<number> =>
  moveOrigin(
    {
      keyOrigin: Option.fromNullishOr(anchors.keyOrigin),
      active: Option.fromNullishOr(anchors.active),
      selected: anchors.selected,
    },
    indexOf,
  );

describe("moveOrigin", () => {
  it("starts from the trigger that sent the key", () => {
    expect(
      origin({ keyOrigin: "billing", active: "profile", selected: "danger" }),
    ).toEqual(Option.some(1));
  });

  it("falls back to the row onFocus recorded when no key origin is named", () => {
    expect(origin({ active: "billing", selected: "danger" })).toEqual(
      Option.some(1),
    );
  });

  it("starts from the selection when a traversal delivered no focus event", () => {
    expect(origin({ selected: "danger" })).toEqual(Option.some(2));
  });

  it("ignores a key origin for a row that has since unregistered", () => {
    const stale = origin({
      keyOrigin: "gone",
      active: "profile",
      selected: "danger",
    });

    expect(stale).toEqual(Option.some(0));
  });
});
