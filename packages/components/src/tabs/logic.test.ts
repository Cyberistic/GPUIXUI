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

const values: ReadonlyArray<string> = ["profile", "billing", "danger"];

const indexOf = (value: string): Option.Option<number> =>
  Arr.findFirstIndex(values, (candidate) => candidate === value);

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
