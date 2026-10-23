/**
 * `CropArea` — the mask, the handles and the gestures a wrapper forwards.
 *
 * The bug guarded: the mask must be the hole's complement with no bar over the
 * picture, the handle must resize **its** corner rather than moving the hole,
 * and a keyboard resize must reach the caller with the default swallowed. A
 * press on the picture moves the hole; a press on a handle resizes it and must
 * not also start the move.
 */

import { describe, expect, it, vi } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { lightTheme } from "@gpuixui/tokens";
import { CropRect } from "./crop/logic.js";
import {
  cropBounds,
  renderCropArea,
  type CropAreaProps,
  type CropAreaSurface,
} from "./crop-area.js";
import {
  elementChildren,
  elementHandler,
  elementProp,
  expectSome,
  findByTestId,
  hostProp,
  hostStyleString,
  hostTag,
} from "./testing/element.js";

const opening = new CropRect({ x: 60, y: 40, width: 100, height: 70 });

const props = (overrides: Partial<CropAreaProps> = {}): CropAreaProps => ({
  src: "",
  alt: "A picture",
  width: 240,
  height: 160,
  value: opening,
  onChange: () => undefined,
  testId: "crop",
  label: "Crop",
  ...overrides,
});

const surfaceOf = (): CropAreaSurface & {
  readonly down: ReturnType<typeof vi.fn>;
  readonly move: ReturnType<typeof vi.fn>;
  readonly release: ReturnType<typeof vi.fn>;
  readonly handleDown: ReturnType<typeof vi.fn>;
  readonly handleKey: ReturnType<typeof vi.fn>;
} => {
  const down = vi.fn();
  const move = vi.fn();
  const release = vi.fn();
  const handleDown = vi.fn();
  const handleKey = vi.fn();
  return {
    down,
    move,
    release,
    handleDown,
    handleKey,
    onFrameDown: down,
    onFrameMove: move,
    onRelease: release,
    onHandleDown: handleDown,
    onHandleKey: handleKey,
  };
};

const handleOf = (root: ReturnType<typeof renderCropArea>, corner: string) =>
  expectSome(findByTestId(root, `crop-handle-${corner}`));

function handler<A>(
  element: Parameters<typeof elementHandler>[0],
  name: string,
): (event: A) => void {
  return expectSome(elementHandler(element, name)) as (event: A) => void;
}

describe("renderCropArea", () => {
  it("paints a frame on the picture's own box", () => {
    const root = renderCropArea(props(), lightTheme, surfaceOf());
    expect(expectSome(hostTag(root))).toBe("div");
    expect(expectSome(elementProp(root, "role"))).toBe("group");
    expect(expectSome(elementProp(root, "aria-label"))).toBe("Crop");
    expect(expectSome(hostProp(root, "style"))).toMatchObject({
      width: 240,
      height: 160,
    });
  });

  it("reads a blank name as the default, never an unnamed frame", () => {
    Arr.forEach(["", "   "], (label) => {
      const root = renderCropArea(props({ label }), lightTheme, surfaceOf());
      expect(expectSome(elementProp(root, "aria-label"))).toBe("Crop area");
      expect(expectSome(elementProp(handleOf(root, "se"), "aria-label"))).toBe(
        "Crop area bottom right handle",
      );
    });
  });

  it("publishes the name it was given without its padding", () => {
    const root = renderCropArea(
      props({ label: "  Thumbnail  " }),
      lightTheme,
      surfaceOf(),
    );
    expect(expectSome(elementProp(root, "aria-label"))).toBe("Thumbnail");
    expect(expectSome(elementProp(handleOf(root, "nw"), "aria-label"))).toBe(
      "Thumbnail top left handle",
    );
  });

  it("masks everything but the hole, and the bars take no pointer", () => {
    const root = renderCropArea(props(), lightTheme, surfaceOf());
    const top = expectSome(findByTestId(root, "crop-bar-top"));
    expect(expectSome(hostProp(top, "style"))).toMatchObject({
      left: 0,
      top: 0,
      width: 240,
      height: 40,
      pointerEvents: "none",
    });
    const right = expectSome(findByTestId(root, "crop-bar-right"));
    expect(expectSome(hostProp(right, "style"))).toMatchObject({
      left: 160,
      top: 40,
      width: 80,
      height: 70,
    });
    expect(expectSome(hostStyleString(top, "backgroundColor"))).toBe(
      lightTheme.colors.overlay,
    );
  });

  it("paints a focusable slider handle on every corner", () => {
    const root = renderCropArea(props(), lightTheme, surfaceOf());
    const se = handleOf(root, "se");
    expect(expectSome(elementProp(se, "role"))).toBe("slider");
    expect(expectSome(elementProp(se, "tabIndex"))).toBe(0);
    expect(expectSome(elementProp(se, "aria-valuetext"))).toBe(
      "60, 40, 100 × 70",
    );
    expect(expectSome(elementProp(se, "aria-label"))).toBe(
      "Crop bottom right handle",
    );
    expect(expectSome(hostProp(se, "style"))).toMatchObject({
      left: 155,
      top: 105,
      width: 10,
      height: 10,
    });
    const ring = expectSome(hostProp(se, "style")) as {
      readonly focusVisible?: { readonly outlineWidth?: number };
    };
    expect(ring.focusVisible?.outlineWidth).toBe(lightTheme.borderWidth.strong);
    expect(handleOf(root, "nw")).toBeDefined();
    expect(handleOf(root, "ne")).toBeDefined();
    expect(handleOf(root, "sw")).toBeDefined();
  });

  it("keeps a touched edge's handles inside the clipping frame", () => {
    // The bug guarded: the frame clips its children, so a handle centred on a
    // full-frame hole's corner painted half a box and kept half a press target.
    const full = new CropRect({ x: 0, y: 0, width: 240, height: 160 });
    const root = renderCropArea(
      props({ value: full }),
      lightTheme,
      surfaceOf(),
    );
    const styleOf = (corner: "nw" | "ne" | "sw" | "se") =>
      expectSome(hostProp(handleOf(root, corner), "style"));
    expect(styleOf("nw")).toMatchObject({ left: 0, top: 0 });
    expect(styleOf("ne")).toMatchObject({ left: 230, top: 0 });
    expect(styleOf("sw")).toMatchObject({ left: 0, top: 150 });
    expect(styleOf("se")).toMatchObject({ left: 230, top: 150 });
  });

  it("paints the resize cursor along each corner's own diagonal", () => {
    // The bug guarded: every handle painted `nwse-resize`, so the top-right and
    // bottom-left handles pointed across the diagonal they drag on.
    const root = renderCropArea(props(), lightTheme, surfaceOf());
    const cursorOf = (corner: "nw" | "ne" | "sw" | "se") =>
      expectSome(hostProp(handleOf(root, corner), "style"));
    expect(cursorOf("nw")).toMatchObject({ cursor: "nwse-resize" });
    expect(cursorOf("se")).toMatchObject({ cursor: "nwse-resize" });
    expect(cursorOf("ne")).toMatchObject({ cursor: "nesw-resize" });
    expect(cursorOf("sw")).toMatchObject({ cursor: "nesw-resize" });
  });

  it("reads an unreadable handle side and minimum as the defaults", () => {
    const tiny = new CropRect({ x: 60, y: 40, width: 10, height: 10 });
    const root = renderCropArea(
      props({ value: tiny, handleSize: Number.NaN, minSize: Number.NaN }),
      lightTheme,
      surfaceOf(),
    );
    expect(expectSome(hostProp(handleOf(root, "se"), "style"))).toMatchObject({
      left: 79,
      top: 59,
      width: 10,
      height: 10,
    });
    expect(
      expectSome(elementProp(handleOf(root, "se"), "aria-valuetext")),
    ).toBe("60, 40, 24 × 24");
  });

  it("reads a zero or negative handle side and minimum as the defaults", () => {
    const tiny = new CropRect({ x: 60, y: 40, width: 10, height: 10 });
    const root = renderCropArea(
      props({ value: tiny, handleSize: 0, minSize: -20 }),
      lightTheme,
      surfaceOf(),
    );
    const se = handleOf(root, "se");
    expect(expectSome(hostProp(se, "style"))).toMatchObject({
      left: 79,
      top: 59,
      width: 10,
      height: 10,
    });
    expect(expectSome(elementProp(se, "aria-valuetext"))).toBe(
      "60, 40, 24 × 24",
    );
  });

  it("reads a rectangle it cannot lay out as the origin and the floor", () => {
    const broken = new CropRect({
      x: Number.NaN,
      y: Number.NaN,
      width: Number.NaN,
      height: Number.NaN,
    });
    const root = renderCropArea(
      props({ value: broken }),
      lightTheme,
      surfaceOf(),
    );
    expect(expectSome(hostProp(root, "style"))).toMatchObject({
      width: 240,
      height: 160,
    });
    const se = handleOf(root, "se");
    expect(expectSome(elementProp(se, "aria-valuetext"))).toBe("0, 0, 24 × 24");
    expect(expectSome(hostProp(se, "style"))).toMatchObject({
      left: 19,
      top: 19,
      width: 10,
      height: 10,
    });
  });

  it("paints and announces a hole on the caller's ratio", () => {
    const root = renderCropArea(
      props({
        aspectRatio: 2,
        value: new CropRect({ x: 60, y: 40, width: 100, height: 100 }),
      }),
      lightTheme,
      surfaceOf(),
    );
    expect(
      expectSome(elementProp(handleOf(root, "se"), "aria-valuetext")),
    ).toBe("60, 40, 100 × 50");
    expect(
      expectSome(
        hostProp(expectSome(findByTestId(root, "crop-bar-bottom")), "style"),
      ),
    ).toMatchObject({ top: 90, height: 70 });
  });

  it("paints the rule-of-thirds guides only when asked", () => {
    const plain = renderCropArea(props(), lightTheme, surfaceOf());
    expect(Option.isNone(findByTestId(plain, "crop-guide-v1"))).toBe(true);

    const ruled = renderCropArea(
      props({ guides: true }),
      lightTheme,
      surfaceOf(),
    );
    const v1 = expectSome(findByTestId(ruled, "crop-guide-v1"));
    expect(expectSome(hostProp(v1, "style"))).toMatchObject({
      left: 60 + 100 / 3,
      top: 40,
      width: 1,
      height: 70,
      pointerEvents: "none",
      backgroundColor: lightTheme.colors.background,
    });
    expect(
      ["v1", "v2", "h1", "h2"].every((name) =>
        Option.isSome(findByTestId(ruled, `crop-guide-${name}`)),
      ),
    ).toBe(true);
  });

  it("paints no picture for a blank source", () => {
    const root = renderCropArea(props({ src: "  " }), lightTheme, surfaceOf());
    const images = elementChildren(root).filter(
      (child) => expectSome(hostTag(child)) === "img",
    );
    expect(images).toStrictEqual([]);
  });

  it("paints no picture for a source that is not text", () => {
    // The bug guarded: a record restored from storage writes `null` where it
    // carried no picture, and `src.trim()` threw out of the render — so the
    // frame, its mask and its handles painted nothing at all.
    const root = renderCropArea(
      props({ src: null as unknown as string }),
      lightTheme,
      surfaceOf(),
    );
    const images = elementChildren(root).filter(
      (child) => expectSome(hostTag(child)) === "img",
    );
    expect(images).toStrictEqual([]);
    expect(Option.isSome(findByTestId(root, "crop-bar-top"))).toBe(true);
    expect(Option.isSome(findByTestId(root, "crop-handle-se"))).toBe(true);
  });

  it("repaints the mask when the hole moves", () => {
    const moved = new CropRect({ x: 20, y: 10, width: 50, height: 40 });
    const root = renderCropArea(
      props({ value: moved }),
      lightTheme,
      surfaceOf(),
    );
    expect(
      expectSome(
        hostProp(expectSome(findByTestId(root, "crop-bar-top")), "style"),
      ),
    ).toMatchObject({
      height: 10,
    });
    expect(
      expectSome(elementProp(handleOf(root, "se"), "aria-valuetext")),
    ).toBe("20, 10, 50 × 40");
  });

  it("refuses the gestures while disabled, and leaves the tab order", () => {
    const surface = surfaceOf();
    const root = renderCropArea(props({ disabled: true }), lightTheme, surface);
    handler(root, "onMouseDown")({ x: 100, y: 60 });
    handler(handleOf(root, "se"), "onMouseDown")({ x: 160, y: 110 });
    expect(surface.down).not.toHaveBeenCalled();
    expect(surface.handleDown).not.toHaveBeenCalled();
    expect(expectSome(elementProp(handleOf(root, "se"), "tabIndex"))).toBe(-1);
    expect(
      expectSome(hostStyleString(handleOf(root, "se"), "backgroundColor")),
    ).toBe(lightTheme.colors.muted);
  });
});

describe("cropBounds", () => {
  it("reads a side that cannot be laid out as an empty frame", () => {
    expect(cropBounds(Number.NaN, -4)).toStrictEqual({ width: 0, height: 0 });
    expect(cropBounds(240, 160)).toStrictEqual({ width: 240, height: 160 });
  });
});
