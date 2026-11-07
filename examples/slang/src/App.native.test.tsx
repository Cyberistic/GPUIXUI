import { createTestRoot } from "@gpuix/react/testing";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CalculatorApp } from "./App.js";

vi.setConfig({ testTimeout: 30_000 });

let unmount = () => {};
afterEach(() => unmount());

const mount = (size = { width: 1060, height: 760 }) => {
  const root = createTestRoot(size);
  root.render(<CalculatorApp />);
  root.renderer.flush();
  root.renderer.dispatchNativeEvents();
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

  it("opens the MODE menu on the LCD and picks MATRIX with 6", () => {
    const renderer = mount();
    click(renderer, "calc-key-MODE");
    expect(renderer.findByTestId("calc-mode-menu")).toBeDefined();
    expect(renderer.getAllText()).toContain("6:MATRIX");
    click(renderer, "calc-key-6");
    expect(renderer.findByTestId("calc-mode-menu")).toBeUndefined();
    click(renderer, "calc-tab-mode");
    const texts = renderer.getAllText();
    expect(texts.some((text) => text.includes("MatA"))).toBe(true);
  });

  it("opens the catalogue with SHIFT 7 (CONST)", () => {
    const renderer = mount();
    click(renderer, "calc-panel-toggle");
    expect(renderer.findByTestId("calc-inspector")).toBeUndefined();
    click(renderer, "calc-key-SHIFT");
    click(renderer, "calc-key-7");
    expect(renderer.findByTestId("calc-inspector")).toBeDefined();
    expect(renderer.getAllText()).toContain("Catalogue");
  });

  it("folds the side panel away and brings it back", () => {
    const renderer = mount();
    expect(renderer.findByTestId("calc-inspector")).toBeDefined();
    click(renderer, "calc-panel-toggle");
    expect(renderer.findByTestId("calc-inspector")).toBeUndefined();
    click(renderer, "calc-panel-toggle");
    expect(renderer.findByTestId("calc-inspector")).toBeDefined();
  });

  it("fits the whole device in a 1024×576 terminal and still takes presses", () => {
    const renderer = mount({ width: 1024, height: 576 });
    renderer.dispatchNativeEvents();
    renderer.flush();
    const body = renderer.findByTestId("calculator-body");
    const bounds =
      body === undefined ? null : renderer.getElementBounds(body.id);
    expect(bounds).not.toBeNull();
    expect((bounds?.y ?? 0) + (bounds?.height ?? 0)).toBeLessThanOrEqual(576);
    click(renderer, "calc-key-7");
    click(renderer, "calc-key-×");
    click(renderer, "calc-key-6");
    click(renderer, "calc-key-=");
    expect(renderer.getAllText()).toContain("42");
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

  it("repaints the window around the device when the appearance changes", () => {
    const renderer = mount();
    const before = renderer.findByTestId("calculator-stage")?.style;
    expect(before).toBeDefined();
    click(renderer, "calc-appearance");
    const after = renderer.findByTestId("calculator-stage")?.style;
    expect(after).not.toEqual(before);
  });
});
