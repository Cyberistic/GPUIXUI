import { describe, expect, it } from "vitest";
import type { ReactElement } from "react";
import type { SvgProps } from "@gpuix/react";
import { Icon } from "./Icon.js";
import type { IconName } from "./names.js";
import { FALLBACK_ICON, icons } from "./registry.js";
import { ICON_SIZES } from "./sizes.js";

/**
 * Guards what `Icon` hands GPUix.
 *
 * `Icon` is a pure function of its props — it renders no children and holds no
 * state — so asserting on the element it *returns* is a real behavioural test,
 * not a snapshot: it catches the three mistakes that matter. A decorative icon
 * that announces itself as an image pollutes the accessibility tree for every
 * screen reader user; a blank label that promotes one publishes an unnamed
 * image, which is worse than decoration; and an icon that does not disable
 * pointer events eats the click meant for the button around it.
 *
 * There is no renderer in this package's own suite: `Icon` is a pure function,
 * so these cases assert on the element it returns and claim no painted result.
 * Painted behaviour is `packages/testing`'s job, run by the playground suite on
 * this host.
 */

const render = (props: Parameters<typeof Icon>[0]): ReactElement<SvgProps> =>
  Icon(props);

describe("Icon", () => {
  it("hides a decorative icon from the accessibility tree", () => {
    const { props } = render({ name: "check", color: "#123456" });
    expect(props.role).toBe("presentation");
    expect(props["aria-label"]).toBeUndefined();
  });

  it("announces a labelled icon as an image", () => {
    const { props } = render({
      name: "warning",
      color: "#123456",
      label: "Validation failed",
    });
    expect(props.role).toBe("img");
    expect(props["aria-label"]).toBe("Validation failed");
  });

  it("keeps a blank label decorative instead of naming nothing", () => {
    const empty = render({ name: "warning", color: "#123456", label: "" });
    expect(empty.props.role).toBe("presentation");
    expect(empty.props["aria-label"]).toBeUndefined();

    const padded = render({
      name: "warning",
      color: "#123456",
      label: "   ",
    });
    expect(padded.props.role).toBe("presentation");
    expect(padded.props["aria-label"]).toBeUndefined();
  });

  it("trims the name it publishes", () => {
    const { props } = render({
      name: "search",
      color: "#123456",
      label: "  Search  ",
    });
    expect(props.role).toBe("img");
    expect(props["aria-label"]).toBe("Search");
  });

  it("paints the requested geometry and tint", () => {
    const { props } = render({ name: "chevron-down", color: "#abcdef" });
    expect(props.source).toBe(icons["chevron-down"]);
    expect(props.style?.color).toBe("#abcdef");
  });

  it("sizes the icon from the scale and cannot intercept clicks", () => {
    const { props } = render({ name: "plus", color: "#000", size: "lg" });
    expect(props.style?.width).toBe(ICON_SIZES.lg);
    expect(props.style?.height).toBe(ICON_SIZES.lg);
    expect(props.style?.pointerEvents).toBe("none");
  });

  it("defaults to the middle size rather than the largest", () => {
    const { props } = render({ name: "x", color: "#000" });
    expect(props.style?.width).toBe(ICON_SIZES.md);
  });

  it("paints the placeholder mark for a name the set no longer carries", () => {
    // The bug guarded: `name` is a stored value as often as a literal — a saved
    // toolbar, a workspace layout, an action record — so a name a release
    // renamed or dropped arrives as a string the union does not name. `Icon`
    // read `icons[name]` and wrote the `undefined` straight into `source`: the
    // element kept its box and its `Image` node while painting nothing (measured
    // in the runtime suite), so an icon-only button showed a blank square while
    // it announced its action. A stored name paints the `help` mark, and the
    // caller's label still names the action.
    const { props } = render({
      name: "floppy" as IconName,
      color: "#123456",
      label: "Save",
    });
    expect(props.source).toBe(icons[FALLBACK_ICON]);
    expect(props["aria-label"]).toBe("Save");
    expect(props.style?.width).toBe(ICON_SIZES.md);
  });

  it("carries the automation locator through", () => {
    const { props } = render({
      name: "search",
      color: "#000",
      testId: "field-search-icon",
    });
    expect(props.testId).toBe("field-search-icon");
  });
});
