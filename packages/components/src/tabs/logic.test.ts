/**
 * Tab activation and move-anchor rules.
 *
 * The bugs these guard: `activation="manual"` selected a tab as soon as the arrow
 * keys moved focus, so Enter had nothing left to do and every visited panel
 * rendered anyway — manual mode behaved exactly like automatic. And a move that
 * anchored on recorded focus alone re-anchored at the first enabled tab when no
 * focus event had recorded the row the reader is on (a key that reaches the
 * rail, or one sent before the event lands).
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import {
  activationOf,
  moveOrigin,
  orientationOf,
  selectsOnFocus,
} from "./logic.js";

describe("selectsOnFocus", () => {
  it("selects on focus in automatic mode", () => {
    expect(selectsOnFocus("automatic")).toBe(true);
  });

  it("waits for Enter or Space in manual mode", () => {
    expect(selectsOnFocus("manual")).toBe(false);
  });
});

describe("orientationOf", () => {
  it("keeps an axis this release names", () => {
    expect(orientationOf("horizontal")).toBe("horizontal");
    expect(orientationOf("vertical")).toBe("vertical");
  });

  it("reads a stored axis this release does not name as the documented horizontal set", () => {
    // A tab set is stored in a workspace layout, so `orientation` arrives as a
    // string as often as a literal. The raws read treated an unknown name as
    // "not horizontal": the root painted the vertical axis and the arrows
    // stepped Down/Up, while the component documents a horizontal default.
    expect(orientationOf("diagonal")).toBe("horizontal");
    expect(orientationOf(undefined)).toBe("horizontal");
    expect(orientationOf(2)).toBe("horizontal");
  });
});

describe("activationOf", () => {
  it("keeps a policy this release names", () => {
    expect(activationOf("automatic")).toBe("automatic");
    expect(activationOf("manual")).toBe("manual");
  });

  it("reads a stored policy this release does not name as automatic", () => {
    expect(activationOf("eager")).toBe("automatic");
    expect(activationOf(undefined)).toBe("automatic");
    expect(activationOf({ policy: "manual" })).toBe("automatic");
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

  it("starts from the selection when no focus event recorded a row", () => {
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
