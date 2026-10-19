/**
 * Guards the boundary between the native `selectionChange` payload and the text
 * a view sees.
 *
 * The bug it guards: `EventPayload.value` is **absent** for an empty selection
 * (`@gpuix/native`'s own contract), so reading it as a string would carry
 * `undefined` into component state and paint "undefined" in a copy affordance.
 * The mapper turns absence into the empty string, which is what a view means by
 * "nothing is selected".
 */
import { describe, expect, it } from "vitest";
import { selectionText } from "./selection.js";

const event = (value?: string) => ({
  elementId: 0,
  eventType: "selectionChange",
  ...(value === undefined ? {} : { value }),
});

describe("selectionText", () => {
  it("carries the selected text", () => {
    expect(selectionText(event("first line\nsecond line"))).toBe(
      "first line\nsecond line",
    );
  });

  it("reads an empty string as an empty selection", () => {
    expect(selectionText(event(""))).toBe("");
  });

  it("turns an absent value into an empty selection, never undefined", () => {
    expect(selectionText(event())).toBe("");
  });
});
