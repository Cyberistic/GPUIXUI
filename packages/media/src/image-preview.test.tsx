/**
 * `ImagePreview` — the error state for a bad source, and the loaded picture.
 *
 * The bug guarded: a blank `src` must paint the error state, never a bare
 * `<img>` that the runtime's `img: no src` fallback would leave blank — and a
 * stored frame size or corner the runtime cannot lay out must read as the
 * documented default rather than dropping the box or the radius. The negative
 * control is a real source, which must paint the picture (the shipped
 * `ImageZoom`), not the error. A blank `loadingLabel`, `errorLabel` or
 * `retryLabel` reads as its default too, so no state is published unnamed.
 */

import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { ImageZoom } from "@gpuixui/components/image-zoom";
import { lightTheme } from "@gpuixui/tokens";
import { renderImagePreview } from "./image-preview.js";
import type { ImagePreviewStatus } from "./image-preview.js";
import {
  elementChildren,
  elementProp,
  findByTestId,
  hostStyleNumber,
  hostTag,
  expectSome,
  textElements,
} from "./testing/element.js";

const box = (src: string, props: object = {}) => {
  const root = renderImagePreview({ src, alt: "photo", ...props }, lightTheme);
  return elementChildren(root)[0] ?? expect.fail("the preview drew no box");
};

describe("ImagePreview", () => {
  it("shows the error state for a blank src", () => {
    const root = renderImagePreview({ src: "   ", alt: "photo" }, lightTheme);
    const error = expectSome(findByTestId(root, "image-preview-error"));
    expect(hostTag(error)).toStrictEqual(Option.some("div"));
  });

  it("paints the error state for a source that is not text", () => {
    // The bug guarded: a record restored from storage writes `null` where it
    // carried no picture, and `isBlank` trimmed it, throwing out of the render
    // instead of painting the error state a blank source paints.
    const root = renderImagePreview(
      { src: null as unknown as string, alt: "photo" },
      lightTheme,
    );
    expect(Option.isSome(findByTestId(root, "image-preview-error"))).toBe(true);
  });

  it("paints the picture, not the error, for a real src", () => {
    const root = renderImagePreview(
      { src: "data:image/png;base64,AA==", alt: "photo" },
      lightTheme,
    );
    expect(Option.isNone(findByTestId(root, "image-preview-error"))).toBe(true);
    const body = elementChildren(box("data:image/png;base64,AA=="))[0];
    expect(body?.type).toBe(ImageZoom);
  });

  it("names a picture the caller did not, never an unnamed image", () => {
    // The bug guarded: `alt` was handed to the `<img>`/`ImageZoom` untouched,
    // and a default covers only `undefined` — a blank name from an i18n table,
    // or a `null` a saved record writes where it carried no name, published an
    // `Image` node with no name in the renderer (measured in a real window).
    Arr.forEach(["", "   ", null as unknown as string], (alt) => {
      const root = renderImagePreview(
        { src: "data:image/png;base64,AA==", alt },
        lightTheme,
      );
      const frame = elementChildren(root)[0] ?? expect.fail("no frame");
      const body =
        elementChildren(frame)[0] ?? expect.fail("the preview drew no body");
      expect(elementProp(body, "alt")).toStrictEqual(Option.some("Picture"));
    });
    const bare = renderImagePreview(
      {
        src: "data:image/png;base64,AA==",
        alt: "  ",
        zoom: false,
      },
      lightTheme,
    );
    const frame = elementChildren(bare)[0] ?? expect.fail("no frame");
    const host = elementChildren(frame)[0] ?? expect.fail("no picture");
    expect(expectSome(hostTag(host))).toBe("img");
    expect(elementProp(host, "alt")).toStrictEqual(Option.some("Picture"));
    const named = renderImagePreview(
      { src: "x.png", alt: "  Ada  " },
      lightTheme,
    );
    const namedFrame = elementChildren(named)[0] ?? expect.fail("no frame");
    const namedBody =
      elementChildren(namedFrame)[0] ?? expect.fail("the preview drew no body");
    expect(elementProp(namedBody, "alt")).toStrictEqual(Option.some("Ada"));
  });

  it("paints the loading state when the caller says it is loading", () => {
    const root = renderImagePreview(
      { src: "x.png", alt: "photo", status: "loading" },
      lightTheme,
    );
    expect(Option.isSome(findByTestId(root, "image-preview-loading"))).toBe(
      true,
    );
  });

  it("reads a stored status the union does not name as the derived state", () => {
    // The bug guarded: Match.exhaustive threw out of the render for a status
    // restored from storage whose name the union no longer carried.
    const stored = "ready" as ImagePreviewStatus;
    const real = renderImagePreview(
      { src: "x.png", alt: "photo", status: stored },
      lightTheme,
    );
    expect(Option.isNone(findByTestId(real, "image-preview-error"))).toBe(true);
    const blank = renderImagePreview(
      { src: "  ", alt: "photo", status: stored },
      lightTheme,
    );
    expect(Option.isSome(findByTestId(blank, "image-preview-error"))).toBe(
      true,
    );
  });

  it("reads a stored frame it cannot lay out as the default box", () => {
    // The frame used `width < 1`/`height < 1` and `radius ??`: `NaN` fails both
    // comparisons and reached the style, which the runtime reads as no box at
    // all, while a `NaN` corner dropped the radius.
    const frame = box("data:image/png;base64,AA==", {
      width: Number.NaN,
      height: Number.POSITIVE_INFINITY,
      radius: Number.NaN,
    });
    expect(hostStyleNumber(frame, "width")).toStrictEqual(Option.some(240));
    expect(hostStyleNumber(frame, "height")).toStrictEqual(Option.some(160));
    expect(hostStyleNumber(frame, "borderRadius")).toStrictEqual(
      Option.some(lightTheme.radius.md),
    );
  });

  it("reads a blank label as the documented default, never an unnamed state", () => {
    // A label table can hand over an empty string, and a destructuring default
    // only covers `undefined`: the spinner, the error sentence and the retry
    // action were published with no name at all.
    const loading = renderImagePreview(
      { src: "x.png", alt: "photo", status: "loading", loadingLabel: "  " },
      lightTheme,
    );
    expect(
      elementProp(
        expectSome(findByTestId(loading, "image-preview-loading")),
        "label",
      ),
    ).toStrictEqual(Option.some("Loading"));

    const failed = renderImagePreview(
      {
        src: "",
        alt: "photo",
        errorLabel: "",
        retryLabel: "",
        onRetry: () => undefined,
      },
      lightTheme,
    );
    const error = expectSome(findByTestId(failed, "image-preview-error"));
    const text = expectSome(
      Arr.findFirst(
        elementChildren(error),
        (child) => Option.getOrElse(hostTag(child), () => "") === "text",
      ),
    );
    expect(expectSome(elementProp(text, "children"))).toBe(
      "Could not load image",
    );
    const retry = expectSome(
      Arr.findFirst(elementChildren(error), (child) =>
        Option.isSome(elementProp(child, "onActivate")),
      ),
    );
    expect(expectSome(elementProp(retry, "children"))).toBe("Retry");
  });

  it("paints no caption line for a caption that arrived blank", () => {
    // The bug guarded: `caption === undefined` covered only an absent prop, so a
    // caption an i18n table or a saved record handed over blank laid out a full
    // blank line under the picture — measured on the pinned runtime, `""` is
    // 0px tall and a run of spaces is 16px (`visibleCopy`, which the wizard's
    // step description already uses).
    Arr.forEach(["", "   ", "\t\n"], (caption) => {
      const root = renderImagePreview(
        { src: "data:image/png;base64,AA==", alt: "photo", caption },
        lightTheme,
      );
      expect(textElements(root)).toStrictEqual([]);
    });
    // The negative control: a real caption is painted exactly as written.
    const captioned = renderImagePreview(
      {
        src: "data:image/png;base64,AA==",
        alt: "photo",
        caption: "  By Ada  ",
      },
      lightTheme,
    );
    expect(
      Arr.map(textElements(captioned), (line) => elementProp(line, "children")),
    ).toStrictEqual([Option.some("  By Ada  ")]);
  });
});
