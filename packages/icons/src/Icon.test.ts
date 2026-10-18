import { describe, expect, it } from "vitest";
import type { ReactElement } from "react";
import type { SvgProps } from "@gpuix/react";
import { Icon } from "./Icon.js";
import { icons } from "./registry.js";
import { ICON_SIZES } from "./sizes.js";

/**
 * Guards what `Icon` hands GPUix.
 *
 * `Icon` is a pure function of its props — it renders no children and holds no
 * state — so asserting on the element it *returns* is a real behavioural test,
 * not a snapshot: it catches the two mistakes that matter. A decorative icon
 * that announces itself as an image pollutes the accessibility tree for every
 * screen reader user; an icon that does not disable pointer events eats the
 * click meant for the button around it.
 *
 * There is no GPUix renderer available in this environment (see
 * `.agents/slop/plans/020-gpuix-runtime-capability.md` §3), so nothing here
 * claims a painted result. That is `packages/testing`'s job.
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

  it("carries the automation locator through", () => {
    const { props } = render({
      name: "search",
      color: "#000",
      testId: "field-search-icon",
    });
    expect(props.testId).toBe("field-search-icon");
  });

  it("merges a caller's style last without losing the defaults", () => {
    const { props } = render({
      name: "check",
      color: "#123456",
      style: { marginTop: 2 },
    });
    expect(props.style?.marginTop).toBe(2);
    expect(props.style?.color).toBe("#123456");
    expect(props.style?.width).toBe(ICON_SIZES.md);
    expect(props.style?.pointerEvents).toBe("none");
  });

  it("lets a caller's paint over the default size and tint", () => {
    const { props } = render({
      name: "check",
      color: "#123456",
      style: { width: 32, color: "#abcdef" },
    });
    expect(props.style?.width).toBe(32);
    expect(props.style?.color).toBe("#abcdef");
    // The caller chose a stretched mark; the axis they did not name is default.
    expect(props.style?.height).toBe(ICON_SIZES.md);
  });
});
