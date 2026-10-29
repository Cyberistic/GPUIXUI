/**
 * The number row's label as the inspector's scrub handle.
 *
 * The bug these guard: a number row was a text field with the runtime's own
 * steppers and an inert label, so a reader adjusting a size had to aim at a
 * 22px spin column or type a number. The label is the handle now — a horizontal
 * drag moves the value, Shift coarsens it, the row's bounds clamp it, a press
 * without travel is still a click, and the field beside it keeps typing.
 */

import type { TestRoot } from "@gpuix/react/testing";
import { createTestRoot } from "@gpuix/react/testing";
import { darkTheme } from "@gpuixui/tokens";
import { ThemeProvider } from "@gpuixui/tokens/react";
import { useState, type ReactElement } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { PropertyPanel } from "../property/property-panel.js";

const FRAME = { width: 520, height: 120 } as const;

let mounted: TestRoot | null = null;

afterEach(() => {
  mounted?.unmount();
  mounted = null;
});

/** One number row whose owner keeps the record the panel reports. */
const Row = ({
  initial,
  min,
  max,
}: {
  readonly initial: number;
  readonly min?: number;
  readonly max?: number;
}) => {
  const [width, setWidth] = useState(initial);
  return (
    <div style={{ display: "flex", flexDirection: "column", width: 480 }}>
      <PropertyPanel
        testId="panel"
        rows={[
          {
            type: "number",
            key: "width",
            label: "Width",
            value: width,
            min,
            max,
          },
        ]}
        onChange={(record) => setWidth(Number(record.width))}
      />
      <text testId="readout">{String(width)}</text>
    </div>
  );
};

const renderRow = (node: ReactElement): TestRoot => {
  const root = createTestRoot({ width: FRAME.width, height: FRAME.height });
  root.render(<ThemeProvider theme={darkTheme}>{node}</ThemeProvider>);
  mounted = root;
  root.renderer.flush();
  return root;
};

const element = (root: TestRoot, testId: string) => {
  const found = root.renderer.findByTestId(testId);
  if (found === undefined || found === null) {
    throw new Error(`no element with testId ${testId}`);
  }
  return found;
};

const boundsOf = (root: TestRoot, testId: string) => {
  const bounds = root.renderer.getElementBounds(element(root, testId).id);
  if (bounds === null) throw new Error(`no painted box for ${testId}`);
  return bounds;
};

/** Press the label's centre and drag `dx` pixels, optionally with Shift. */
const drag = (root: TestRoot, dx: number, shift = false): void => {
  const box = boundsOf(root, "panel-label-width");
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  root.renderer.nativeSimulateMouseDown(x, y);
  root.renderer.nativeSimulateMouseMove(
    x + dx,
    y,
    0,
    shift ? "shift" : undefined,
  );
  root.renderer.nativeSimulateMouseUp(x + dx, y);
  root.renderer.flush();
};

/** The field's native input, through the field's chrome and its hint frame. */
const inputOf = (root: TestRoot): number => {
  const chrome = element(root, "field-width");
  const frame = chrome.children[0] ?? 0;
  return root.renderer.getElement(frame)?.children[0] ?? 0;
};

/** Every painted `<text>` run; the readout is the row's own value. */
const readout = (root: TestRoot): ReadonlyArray<string> =>
  root.renderer.getAllText();

describe("the property panel's number label", () => {
  it("moves the value on a horizontal drag", () => {
    const root = renderRow(<Row initial={240} min={120} max={640} />);

    drag(root, 8);
    // Eight pixels is two steps at the scrub scale.
    expect(readout(root)).toContain("242");
  });

  it("does not move the value on a click, and the field still types", () => {
    const root = renderRow(<Row initial={240} min={120} max={640} />);

    drag(root, 0);
    expect(readout(root)).toContain("240");

    // The text entry path is the field's: focus its input and type.
    root.renderer.focusElement(inputOf(root));
    root.renderer.dispatchNativeEvents();
    root.renderer.flush();
    root.renderer.simulateKeystrokes("1");
    root.renderer.flush();
    expect(readout(root)).not.toContain("240");
  });

  it("clamps a drag to the row's bounds", () => {
    const root = renderRow(<Row initial={630} min={120} max={640} />);

    drag(root, 40);
    expect(readout(root)).toContain("640");
  });

  it("multiplies the travel by ten while Shift is held", () => {
    const root = renderRow(<Row initial={240} min={120} max={640} />);

    drag(root, 8, true);
    expect(readout(root)).toContain("260");
  });
});
