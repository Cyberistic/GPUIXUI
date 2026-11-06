import { describe, expect, it } from "vitest";
import type { ReactElement } from "react";
import type { SvgProps } from "@gpuix/react";
import { Icon } from "./Icon.js";
import type { IconName } from "./names.js";
import {
  FALLBACK_ICON,
  iconMarkup,
  icons,
  rotatedIconMarkup,
} from "./registry.js";
import { ICON_SIZES } from "./sizes.js";

const render = (props: Parameters<typeof Icon>[0]): ReactElement<SvgProps> =>
  Icon(props);

describe("Icon", () => {
  it("hides a decorative icon from the accessibility tree", () => {
    const { props } = render({ name: "check", color: "#123456" });
    expect(props.role).toBe("presentation");
    expect(props["aria-label"]).toBeUndefined();
  });

  it("turns the icon in the markup, because the runtime has no transform", () => {
    const { props } = render({
      name: "chevron-right",
      color: "#123456",
      rotation: 90,
    });

    expect(props.source).toContain('<g transform="rotate(90 12 12)">');

    expect(props.source).toContain('<path d="m9 18 6-6-6-6"/>');
    expect(props.source).toBe(rotatedIconMarkup("chevron-right", 90));
  });

  it("normalises the turn and ignores a value that never arrived", () => {
    expect(
      render({ name: "arrow-up", color: "#123456", rotation: -90 }).props
        .source,
    ).toBe(rotatedIconMarkup("arrow-up", 270));
    expect(
      render({
        name: "arrow-up",
        color: "#123456",
        rotation: Number.NaN,
      }).props.source,
    ).toBe(iconMarkup("arrow-up"));
    expect(
      render({ name: "arrow-up", color: "#123456", rotation: 360 }).props
        .source,
    ).toBe(iconMarkup("arrow-up"));
  });

  it("turns the fallback mark rather than painting an unturned unknown", () => {
    expect(rotatedIconMarkup("not-an-icon", 180)).toContain(
      "rotate(180 12 12)",
    );
    const fallback = iconMarkup("not-an-icon");
    const geometry = fallback.slice(
      fallback.indexOf(">") + 1,
      fallback.lastIndexOf("</svg>"),
    );
    expect(rotatedIconMarkup("not-an-icon", 180)).toContain(
      "rotate(180 12 12)",
    );
    expect(rotatedIconMarkup("not-an-icon", 180)).toContain(geometry);
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

  it("hands over a tween and lets the caller's style win", () => {
    const frame = { width: 8, height: 8, left: 4, top: 4, opacity: 0 };
    const { props } = render({
      name: "moon",
      color: "#123456",
      motion: { initial: false, animate: frame },
      style: { position: "absolute" },
    });
    expect(props.motion?.animate).toStrictEqual(frame);
    expect(props.style?.position).toBe("absolute");
    expect(props.style?.width).toBe(ICON_SIZES.md);
  });
});
