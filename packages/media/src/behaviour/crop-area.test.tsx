/**
 * `CropArea`'s gestures, driven through the real GPUix renderer.
 *
 * The bug these guard: a controlled crop asked its caller for a rectangle on
 * **every delivered move**, including the moves of a drag held past the frame's
 * edge — where the clamped hole no longer changes. A caller that regenerates a
 * preview, uploads a crop or writes state on `onChange` did that work once per
 * frame for one rectangle. A crop reports a rectangle only when it differs from
 * the one already painted, and a press without a move reports nothing at all.
 */

import { createTestRoot, type TestRoot } from "@gpuix/react/testing";
import { lightTheme } from "@gpuixui/tokens";
import { ThemeProvider } from "@gpuixui/tokens/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { CropRect } from "../crop/logic.js";
import { CropArea } from "../crop-area.js";

const opening = new CropRect({ x: 60, y: 40, width: 100, height: 70 });

/** A controlled crop whose reports the suite counts. */
const Harness = ({
  start,
  onReport,
}: {
  readonly start: CropRect;
  readonly onReport: (crop: CropRect) => void;
}) => {
  const [crop, setCrop] = useState(start);
  return (
    <CropArea
      src=""
      alt="The picture being cropped"
      width={240}
      height={160}
      value={crop}
      testId="crop"
      label="Crop"
      onChange={(next) => {
        onReport(next);
        setCrop(next);
      }}
    />
  );
};

const mount = (
  start: CropRect = opening,
): { readonly root: TestRoot; readonly reports: CropRect[] } => {
  const reports: CropRect[] = [];
  const root = createTestRoot({ width: 1280, height: 800 });
  root.render(
    <ThemeProvider theme={lightTheme}>
      <Harness start={start} onReport={(crop) => reports.push(crop)} />
    </ThemeProvider>,
  );
  return { root, reports };
};

/** The centre of `testId` in window points; a missing element is a broken suite. */
const centreOf = (
  root: TestRoot,
  testId: string,
): { readonly x: number; readonly y: number } => {
  const element = root.renderer.findByTestId(testId);
  if (element === undefined) {
    throw new Error(`behaviour: no element with testId "${testId}"`);
  }
  const box = root.renderer.getElementBounds(element.id);
  if (box === null) {
    throw new Error(`behaviour: "${testId}" painted no box`);
  }
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};

const boxes = (crop: CropRect) => ({
  x: crop.x,
  y: crop.y,
  width: crop.width,
  height: crop.height,
});

describe("CropArea gestures", () => {
  it("reports a drag held past the frame's edge once", () => {
    const { root, reports } = mount();
    const at = centreOf(root, "crop-handle-se");
    root.renderer.nativeSimulateMouseDown(at.x, at.y);
    for (const step of [200, 240, 280, 320]) {
      root.renderer.nativeSimulateMouseMove(at.x + step, at.y + step);
    }
    root.renderer.nativeSimulateMouseUp(at.x + 320, at.y + 320);

    expect(reports.map(boxes)).toStrictEqual([
      { x: 60, y: 40, width: 180, height: 120 },
    ]);
    root.unmount();
  });

  it("reports each rectangle a drag inside the frame paints", () => {
    const { root, reports } = mount();
    const at = centreOf(root, "crop-handle-se");
    root.renderer.nativeSimulateMouseDown(at.x, at.y);
    root.renderer.nativeSimulateMouseMove(at.x + 10, at.y + 10);
    root.renderer.nativeSimulateMouseMove(at.x + 20, at.y + 20);
    root.renderer.nativeSimulateMouseUp(at.x + 20, at.y + 20);

    expect(reports.map(boxes)).toStrictEqual([
      { x: 60, y: 40, width: 110, height: 80 },
      { x: 60, y: 40, width: 120, height: 90 },
    ]);
    root.unmount();
  });

  it("reports nothing for a press the reader does not move", () => {
    const { root, reports } = mount();
    const at = centreOf(root, "crop-handle-se");
    root.renderer.nativeSimulateMouseDown(at.x, at.y);
    root.renderer.nativeSimulateMouseUp(at.x, at.y);

    expect(reports).toStrictEqual([]);
    root.unmount();
  });

  it("stays silent when an arrow asks for the rectangle already painted", () => {
    const edge = new CropRect({ x: 100, y: 60, width: 140, height: 100 });
    const { root, reports } = mount(edge);
    const handle = root.renderer.findByTestId("crop-handle-se");
    if (handle === undefined) {
      throw new Error("behaviour: the bottom-right handle is missing");
    }
    root.renderer.focusElement(handle.id);
    root.renderer.simulateKeystrokes("right");
    root.renderer.simulateKeystrokes("right");

    expect(reports).toStrictEqual([]);
    root.unmount();
  });
});
