/**
 * `CropArea`'s gestures, driven through the real GPUix renderer.
 *
 * The bugs these guard: a controlled crop asked its caller for a rectangle on
 * **every delivered move**, including the moves of a drag held past the frame's
 * edge — where the clamped hole no longer changes. A caller that regenerates a
 * preview, uploads a crop or writes state on `onChange` did that work once per
 * frame for one rectangle. A crop reports a rectangle only when it differs from
 * the one already painted, and a press without a move reports nothing at all.
 * The second: both move paths clamped with the **default** minimum, so a hole
 * the caller allowed to be smaller (a `minSize` below 24) grew to 24 on a
 * pointer drag or an `Alt`+arrow — a move changed the hole's sides.
 * The third: both gestures began on **any** button, so a right press on the
 * picture or on a handle armed a move/resize — a right-drag dragged the hole,
 * and a release delivered outside the frame left the gesture armed for a plain
 * hover. A gesture begins on the primary press alone.
 * The fourth: a disabled window kept the drag that was in flight, so the frame
 * resumed it on the next plain hover once it could act again — a disabled crop
 * still moved its hole without a press.
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
  minSize,
  disabled,
  onReport,
}: {
  readonly start: CropRect;
  readonly minSize?: number;
  readonly disabled?: boolean;
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
      minSize={minSize}
      disabled={disabled}
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
  minSize?: number,
): {
  readonly root: TestRoot;
  readonly reports: CropRect[];
  readonly show: (disabled: boolean) => void;
} => {
  const reports: CropRect[] = [];
  const root = createTestRoot({ width: 1280, height: 800 });
  const show = (disabled: boolean): void => {
    root.render(
      <ThemeProvider theme={lightTheme}>
        <Harness
          start={start}
          minSize={minSize}
          disabled={disabled}
          onReport={(crop) => reports.push(crop)}
        />
      </ThemeProvider>,
    );
  };
  show(false);
  return { root, reports, show };
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

  it("does not begin a move on a secondary press", () => {
    // A right press on the picture is the reader asking for a context menu, not
    // a drag: it used to arm a move, so a right-drag dragged the hole and a
    // release delivered outside the frame left the gesture armed for a hover.
    const { root, reports } = mount();
    const at = centreOf(root, "crop");
    root.renderer.nativeSimulateMouseDown(at.x, at.y, 2);
    root.renderer.nativeSimulateMouseMove(at.x + 10, at.y + 10);
    root.renderer.nativeSimulateMouseUp(at.x + 10, at.y + 10);

    expect(reports).toStrictEqual([]);
    root.unmount();
  });

  it("does not begin a resize on a secondary press", () => {
    const { root, reports } = mount();
    const at = centreOf(root, "crop-handle-se");
    root.renderer.nativeSimulateMouseDown(at.x, at.y, 2);
    root.renderer.nativeSimulateMouseMove(at.x + 10, at.y + 10);
    root.renderer.nativeSimulateMouseUp(at.x + 10, at.y + 10);

    expect(reports).toStrictEqual([]);
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

  it("drops a drag a disabled window interrupts", () => {
    // A crop disabled mid-drag kept the armed gesture, so once it could act
    // again the next plain hover continued the interrupted drag and moved the
    // hole with no press at all.
    const { root, reports, show } = mount();
    const at = centreOf(root, "crop-handle-se");
    root.renderer.nativeSimulateMouseDown(at.x, at.y);
    root.renderer.nativeSimulateMouseMove(at.x + 10, at.y + 10);
    expect(reports.map(boxes)).toStrictEqual([
      { x: 60, y: 40, width: 110, height: 80 },
    ]);

    show(true);
    show(false);
    root.renderer.nativeSimulateMouseMove(at.x + 60, at.y + 50);

    expect(reports.map(boxes)).toStrictEqual([
      { x: 60, y: 40, width: 110, height: 80 },
    ]);

    // A fresh primary press still drags the corner, so the drop is not a
    // disabled window that leaves the frame permanently deaf.
    root.renderer.nativeSimulateMouseDown(at.x + 10, at.y + 10);
    root.renderer.nativeSimulateMouseMove(at.x + 20, at.y + 20);
    expect(reports.map(boxes)).toStrictEqual([
      { x: 60, y: 40, width: 110, height: 80 },
      { x: 60, y: 40, width: 120, height: 90 },
    ]);
    root.renderer.nativeSimulateMouseUp(at.x + 20, at.y + 20);
    root.unmount();
  });

  it("paints the default hole when the stored crop is absent", () => {
    // The bug guarded: a saved record that carried no crop threw while the
    // wrapper read its sides, so the whole surface failed to paint. An absent
    // rectangle reads as the origin at the smallest side, and a drag from it
    // still reports the rectangle the reader moves to.
    const { root, reports } = mount(null as unknown as CropRect);
    const at = centreOf(root, "crop");
    root.renderer.nativeSimulateMouseDown(at.x, at.y);
    root.renderer.nativeSimulateMouseMove(at.x + 10, at.y + 10);
    root.renderer.nativeSimulateMouseUp(at.x + 10, at.y + 10);

    expect(reports.map(boxes)).toStrictEqual([
      { x: 10, y: 10, width: 24, height: 24 },
    ]);
    root.unmount();
  });

  it("moves a hole below the default minimum without growing it", () => {
    // `minSize` may be smaller than the 24-point default; the move path used
    // to clamp with the default, so Alt+Right grew a 10-point hole to 24.
    const tiny = new CropRect({ x: 10, y: 10, width: 10, height: 10 });
    const { root, reports } = mount(tiny, 8);
    const handle = root.renderer.findByTestId("crop-handle-se");
    if (handle === undefined) {
      throw new Error("behaviour: the bottom-right handle is missing");
    }
    root.renderer.focusElement(handle.id);
    root.renderer.simulateKeystrokes("alt-right");

    expect(reports.map(boxes)).toStrictEqual([
      { x: 11, y: 10, width: 10, height: 10 },
    ]);
    root.unmount();
  });
});
