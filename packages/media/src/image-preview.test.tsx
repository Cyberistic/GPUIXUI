/**
 * `ImagePreview` — the error state for a bad source, and the loaded picture.
 *
 * The bug guarded: a blank `src` must paint the error state, never a bare
 * `<img>` that the runtime's `img: no src` fallback would leave blank. The
 * negative control is a real source, which must paint the picture (the shipped
 * `ImageZoom`), not the error.
 */

import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import { ImageZoom } from "@gpuixui/components/image-zoom";
import { lightTheme } from "@gpuixui/tokens";
import { renderImagePreview } from "./image-preview.js";
import {
  elementChildren,
  findByTestId,
  hostTag,
  expectSome,
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

  it("paints the picture, not the error, for a real src", () => {
    const root = renderImagePreview(
      { src: "data:image/png;base64,AA==", alt: "photo" },
      lightTheme,
    );
    expect(Option.isNone(findByTestId(root, "image-preview-error"))).toBe(true);
    const body = elementChildren(box("data:image/png;base64,AA=="))[0];
    expect(body?.type).toBe(ImageZoom);
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
});
