/**
 * A picture's name, read from the accessibility tree of a real window.
 *
 * The bug guarded: `ImagePreview` and `CropArea` handed the caller's `alt`
 * straight to an `<img>`, and the pinned runtime publishes an `<img>` as an
 * `Image` node named by that `alt`. A blank name from an i18n table, or a
 * `null` a saved record writes where it carried no name, therefore published
 * an `Image` node with no name at all while every other label in the package
 * already read a blank as its documented default. Both surfaces name the
 * picture `Picture` now, and this suite reads that name back off the dump.
 */

import { createTestRoot, type TestRoot } from "@gpuix/react/testing";
import { lightTheme } from "@gpuixui/tokens";
import { ThemeProvider } from "@gpuixui/tokens/react";
import * as Arr from "effect/Array";
import * as R from "effect/Record";
import { describe, expect, it } from "vitest";
import { CropRect } from "../crop/logic.js";
import { CropArea } from "../crop-area.js";
import { ImagePreview } from "../image-preview.js";

const PNG = "data:image/png;base64,AA==";

/** Every `Image` node's name, in tree order, after a real paint. */
const imageNames = (root: TestRoot): ReadonlyArray<string> => {
  root.renderer.flush();
  const nodes = R.values(root.renderer.getA11yTree().nodes ?? {});
  return Arr.map(
    Arr.filter(nodes, (node) => node.aria?.role === "Image"),
    (node) => node.aria?.label ?? "",
  );
};

describe("a picture's name in a window", () => {
  it("names a preview's picture the caller left blank", () => {
    const root = createTestRoot({ width: 800, height: 600 });
    root.render(
      <ThemeProvider theme={lightTheme}>
        <ImagePreview src={PNG} alt="" />
      </ThemeProvider>,
    );
    expect(imageNames(root)).toStrictEqual(["Picture"]);
    root.unmount();
  });

  it("names a crop's picture the caller left blank", () => {
    const root = createTestRoot({ width: 800, height: 600 });
    root.render(
      <ThemeProvider theme={lightTheme}>
        <CropArea
          src={PNG}
          alt=""
          width={240}
          height={160}
          value={new CropRect({ x: 60, y: 40, width: 100, height: 70 })}
          onChange={() => undefined}
          label="Crop"
        />
      </ThemeProvider>,
    );
    expect(imageNames(root)).toStrictEqual(["Picture"]);
    root.unmount();
  });
});
