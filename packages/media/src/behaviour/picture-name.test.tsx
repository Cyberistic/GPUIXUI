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
