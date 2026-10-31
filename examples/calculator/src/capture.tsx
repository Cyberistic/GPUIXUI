/**
 * Capture the checked-in calculator screenshots from the real GPUix test
 * renderer. Tooling boundary only: this file writes files and executes the
 * renderer; the app itself has no Node access.
 *
 *   nub run --filter @gpuixui/calculator capture
 */

import { createTestRoot } from "@gpuix/react/testing";
import * as Arr from "effect/Array";
import { CalculatorApp } from "./App.js";

const capture = (dark: boolean): void => {
  const root = createTestRoot({ width: 1060, height: 760 });
  root.render(<CalculatorApp initialDark={dark} />);
  root.renderer.flush();
  Arr.forEach([0, 1, 2], () => {
    root.renderer.dispatchNativeEvents();
    root.renderer.clockFastForward(1_000);
    root.renderer.flush();
  });
  root.renderer.captureScreenshot(
    `media/calculator-${dark ? "dark" : "light"}.png`,
  );
  root.unmount();
};

capture(false);
capture(true);

const captureFraction = (): void => {
  const root = createTestRoot({ width: 1060, height: 760 });
  root.render(<CalculatorApp />);
  root.renderer.flush();
  const click = (testId: string): void => {
    const element = root.renderer.findByTestId(testId);
    const bounds =
      element === undefined ? null : root.renderer.getElementBounds(element.id);
    if (bounds !== null) {
      root.renderer.nativeSimulateClick(
        bounds.x + bounds.width / 2,
        bounds.y + bounds.height / 2,
      );
      root.renderer.flush();
    }
  };
  for (const key of ["calc-key-1", "calc-key-÷", "calc-key-3", "calc-key-="]) {
    click(key);
  }
  root.renderer.captureScreenshot("media/calculator-natural.png");
  root.unmount();
};

captureFraction();

const captureSetup = (): void => {
  const root = createTestRoot({ width: 1060, height: 760 });
  root.render(<CalculatorApp />);
  root.renderer.flush();
  root.renderer.clockFastForward(1_000);
  root.renderer.flush();
  const click = (testId: string): void => {
    const element = root.renderer.findByTestId(testId);
    const bounds =
      element === undefined ? null : root.renderer.getElementBounds(element.id);
    if (bounds !== null) {
      root.renderer.nativeSimulateClick(
        bounds.x + bounds.width / 2,
        bounds.y + bounds.height / 2,
      );
      root.renderer.flush();
    }
  };
  click("calc-key-SHIFT");
  click("calc-key-MODE");
  root.renderer.clockFastForward(1_000);
  root.renderer.flush();
  root.renderer.captureScreenshot("media/calculator-setup.png");
  root.unmount();
};

captureSetup();

const captureInput = (): void => {
  const root = createTestRoot({ width: 1060, height: 760 });
  root.render(<CalculatorApp />);
  root.renderer.flush();
  const click = (testId: string): void => {
    const element = root.renderer.findByTestId(testId);
    const bounds =
      element === undefined ? null : root.renderer.getElementBounds(element.id);
    if (bounds !== null) {
      root.renderer.nativeSimulateClick(
        bounds.x + bounds.width / 2,
        bounds.y + bounds.height / 2,
      );
      root.renderer.flush();
    }
  };
  for (const key of [
    "calc-key-frac",
    "calc-key-1",
    "calc-key-right",
    "calc-key-3",
  ]) {
    click(key);
  }
  root.renderer.captureScreenshot("media/calculator-input.png");
  root.unmount();
};

captureInput();
