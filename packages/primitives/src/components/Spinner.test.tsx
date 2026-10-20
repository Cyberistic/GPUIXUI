/**
 * `Spinner`'s accessibility contract.
 *
 * The bug guarded (plan 785): a busy `Button` announced "Loading" in its own
 * description *and* painted a `Spinner` whose `role="status"` published a second
 * `Status: Loading` node inside the button. An indicator inside a control that
 * already says it is busy must be decoration; a standalone one must stay a
 * named status.
 */

import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { testTheme } from "../core/testing/theme.fixture.js";
import { renderSpinner } from "./Spinner.js";
import { elementChildren, hostProp, expectSome } from "./testing/element.js";

const spinner = (props: Parameters<typeof renderSpinner>[0]) =>
  renderSpinner(props, testTheme, 0);

describe("Spinner", () => {
  it("is a named status by default", () => {
    const element = spinner({});
    expect(expectSome(hostProp(element, "role"))).toBe("status");
    expect(expectSome(hostProp(element, "aria-label"))).toBe("Loading");
    expect(Arr.length(elementChildren(element))).toBe(3);
  });

  it("produces no accessibility node when decorative", () => {
    const element = spinner({ decorative: true });
    expect(expectSome(hostProp(element, "role"))).toBe("presentation");
    expect(hostProp(element, "aria-label")).toStrictEqual(Option.none());
    // The dots are the same: decoration changes the tree, not the paint.
    expect(Arr.length(elementChildren(element))).toBe(3);
  });

  it("trims a real label and falls back from a blank one", () => {
    expect(
      expectSome(hostProp(spinner({ label: "  Uploading  " }), "aria-label")),
    ).toBe("Uploading");
    expect(expectSome(hostProp(spinner({ label: "   " }), "aria-label"))).toBe(
      "Loading",
    );
  });
});
