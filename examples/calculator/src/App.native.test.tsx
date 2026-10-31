/**
 * The calculator in the real GPUix renderer.
 *
 * The claims this guards: the window, the keypad and the display mount; a
 * pointer press on `1 + 2 =` paints `3`; the mode rail switches to the matrix
 * editor; and the appearance switch repaints the body. The first mount loads the
 * native binding and fonts, so the timeout is generous.
 */

import { createTestRoot } from "@gpuix/react/testing";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CalculatorApp } from "./App.js";

vi.setConfig({ testTimeout: 30_000 });

let unmount = () => {};
afterEach(() => unmount());

const mount = () => {
  const root = createTestRoot({ width: 1060, height: 760 });
  root.render(<CalculatorApp />);
  root.renderer.flush();
  unmount = root.unmount;
  return root.renderer;
};

type Renderer = ReturnType<typeof mount>;

const centre = (renderer: Renderer, testId: string) => {
  const element = renderer.findByTestId(testId);
  const bounds =
    element === undefined ? null : renderer.getElementBounds(element.id);
  expect(bounds, testId).not.toBeNull();
  return {
    x: (bounds?.x ?? 0) + (bounds?.width ?? 0) / 2,
    y: (bounds?.y ?? 0) + (bounds?.height ?? 0) / 2,
  };
};

const click = (renderer: Renderer, testId: string) => {
  const point = centre(renderer, testId);
  renderer.nativeSimulateClick(point.x, point.y);
  renderer.flush();
};

describe("the calculator app", () => {
  it("paints the window, keypad and display", () => {
    const renderer = mount();
    expect(renderer.findByTestId("calculator-window")).toBeDefined();
    expect(renderer.findByTestId("calc-keypad")).toBeDefined();
    expect(renderer.findByTestId("calc-display")).toBeDefined();
  });

  it("evaluates 1 + 2 = 3 from pointer presses", () => {
    const renderer = mount();
    click(renderer, "calc-key-1");
    click(renderer, "calc-key-+");
    click(renderer, "calc-key-2");
    click(renderer, "calc-key-=");
    expect(renderer.getAllText()).toContain("3");
  });

  it("switches to the matrix mode from the mode rail", () => {
    const renderer = mount();
    click(renderer, "calc-mode-MATRIX");
    expect(renderer.findByTestId("calc-inspector")).toBeDefined();
    const texts = renderer.getAllText();
    expect(texts.some((text) => text.includes("MatA"))).toBe(true);
  });

  it("edits a fraction slot with DEL and re-evaluates it", () => {
    const renderer = mount();
    click(renderer, "calc-key-frac");
    click(renderer, "calc-key-1");
    click(renderer, "calc-key-right");
    click(renderer, "calc-key-3");
    click(renderer, "calc-key-DEL");
    click(renderer, "calc-key-4");
    click(renderer, "calc-key-=");
    expect(renderer.findByTestId("calc-result-layout")).toBeDefined();
    expect(renderer.getAllText()).toContain("4");
  });

  it("enters a radical slot and evaluates it", () => {
    const renderer = mount();
    click(renderer, "calc-key-√");
    click(renderer, "calc-key-2");
    click(renderer, "calc-key-)");
    click(renderer, "calc-key-=");
    expect(renderer.findByTestId("calc-result-layout")).toBeDefined();
    expect(renderer.getAllText()).toContain("√");
  });

  it("enters a stacked fraction with the a/b key and evaluates it", () => {
    const renderer = mount();
    click(renderer, "calc-key-frac");
    expect(renderer.findByTestId("calc-input-layout")).toBeDefined();
    click(renderer, "calc-key-1");
    click(renderer, "calc-key-right");
    click(renderer, "calc-key-3");
    click(renderer, "calc-key-=");
    expect(renderer.findByTestId("calc-result-layout")).toBeDefined();
    expect(renderer.getAllText()).toContain("3");
  });

  it("stacks a fraction in the Natural Display", () => {
    const renderer = mount();
    click(renderer, "calc-key-1");
    click(renderer, "calc-key-÷");
    click(renderer, "calc-key-3");
    click(renderer, "calc-key-=");
    const layout = renderer.findByTestId("calc-result-layout");
    expect(layout).toBeDefined();
    if (layout === undefined) return;
    const rule = renderer.findByType("div").find((element) => {
      const bounds = renderer.getElementBounds(element.id);
      return (
        element.style.backgroundColor !== undefined &&
        bounds !== null &&
        bounds.width > bounds.height * 5
      );
    });
    expect(rule).toBeDefined();
  });

  it("opens SETUP with SHIFT + MODE and changes the angle unit", () => {
    const renderer = mount();
    click(renderer, "calc-key-SHIFT");
    click(renderer, "calc-key-MODE");
    expect(renderer.findByTestId("calc-setup")).toBeDefined();
    click(renderer, "setup-angle-Rad");
    click(renderer, "setup-close");
    expect(renderer.getAllText()).toContain("Rad");
  });

  it("changes LCD contrast from SETUP", () => {
    const renderer = mount();
    const before = renderer.findByTestId("calc-lcd-content")?.style.opacity;
    click(renderer, "calc-key-SHIFT");
    click(renderer, "calc-key-MODE");
    click(renderer, "setup-contrast-up");
    click(renderer, "setup-close");
    const after = renderer.findByTestId("calc-lcd-content")?.style.opacity;
    expect(after).not.toEqual(before);
  });

  it("powers off with SHIFT + AC and wakes on a key", () => {
    const renderer = mount();
    click(renderer, "calc-key-SHIFT");
    click(renderer, "calc-key-AC");
    expect(renderer.findByTestId("calc-off")).toBeDefined();
    click(renderer, "calc-key-1");
    expect(renderer.findByTestId("calc-off")).toBeUndefined();
  });

  it("opens the command palette with ⌘K and finds determinant", () => {
    const renderer = mount();
    const window = renderer.findByTestId("calculator-window");
    expect(window).toBeDefined();
    if (window === undefined) return;
    renderer.nativeSimulateKeystrokes(window.id, "cmd-k");
    renderer.flush();
    const input = renderer.findByType("input")[0];
    expect(input).toBeDefined();
    renderer.simulateKeystrokes("determinant");
    renderer.flush();
    expect(renderer.getAllText()).toContain("det(MatA)");
  });

  it("repaints the calculator body when the appearance changes", () => {
    const renderer = mount();
    const before = renderer.findByTestId("calculator-body")?.style;
    expect(before).toBeDefined();
    click(renderer, "calc-appearance");
    const after = renderer.findByTestId("calculator-body")?.style;
    expect(after).not.toEqual(before);
  });
});
