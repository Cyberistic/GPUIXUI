/**
 * Status bar behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a `center` group that painted in tree order but ignored
 * its neighbours (so a one-sided bar centred labels against nothing), an item
 * painted in the sans scale instead of the mono readout, a tone that never
 * reached the label, and an empty group that still painted a separator.
 */

import type { TestRoot } from "@gpuix/react/testing";
import { createTestRoot } from "@gpuix/react/testing";
import { darkTheme } from "@gpuixui/tokens";
import { ThemeProvider } from "@gpuixui/tokens/react";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { StatusBar } from "../status-bar/status-bar.js";

let mounted: TestRoot | null = null;

const renderBar = (element: ReactElement): TestRoot => {
  const root = createTestRoot({ width: 900, height: 60 });
  root.render(<ThemeProvider theme={darkTheme}>{element}</ThemeProvider>);
  mounted = root;
  return root;
};

afterEach(() => {
  mounted?.unmount();
  mounted = null;
});

const element = (root: TestRoot, testId: string) => {
  const found = root.renderer.findByTestId(testId);
  if (found === undefined) throw new Error(`no element with testId ${testId}`);
  return found;
};

const left = [{ id: "branch", label: "main" }];
const center = [{ id: "file", label: "src/index.ts" }];
const right = [{ id: "encoding", label: "UTF-8" }];

describe("StatusBar", () => {
  it("paints the left, centre and right regions in order", () => {
    const root = renderBar(
      <StatusBar
        center={center}
        label="Editor status"
        left={left}
        right={right}
        testId="status"
      />,
    );

    expect(root.renderer.getAllText()).toEqual([
      "main",
      "src/index.ts",
      "UTF-8",
    ]);
  });

  it("centres the middle region between two pinned groups", () => {
    const root = renderBar(
      <StatusBar
        center={center}
        label="Editor status"
        left={left}
        right={right}
        testId="status"
      />,
    );
    const bar = element(root, "status");
    const middle = root.renderer.getElement(bar.children[1] ?? -1);

    expect(middle?.style.justifyContent).toBe("center");
  });

  it("ends the middle region against a lone leading group", () => {
    // The bug guarded: the centre kept `center` without a trailing group, so a
    // bar whose only pinned content was on the left floated its middle labels
    // in the middle of the strip.
    const root = renderBar(
      <StatusBar
        center={center}
        label="Editor status"
        left={left}
        testId="status"
      />,
    );
    const bar = element(root, "status");
    const middle = root.renderer.getElement(bar.children[1] ?? -1);

    expect(middle?.style.justifyContent).toBe("flex-end");
  });

  it("paints a label in the mono readout scale", () => {
    const root = renderBar(
      <StatusBar label="Editor status" left={left} testId="status" />,
    );
    const bar = element(root, "status");
    const group = root.renderer.getElement(bar.children[0] ?? -1);
    const label = root.renderer.getElement(group?.children[0] ?? -1);

    expect(label?.style.fontFamily).toBe(darkTheme.typography.mono);
  });

  it("paints a named tone's readable foreground", () => {
    const root = renderBar(
      <StatusBar
        label="Editor status"
        right={[{ id: "errors", label: "3 errors", tone: "destructive" }]}
        testId="status"
      />,
    );
    const bar = element(root, "status");
    const group = root.renderer.getElement(bar.children[2] ?? -1);
    const label = root.renderer.getElement(group?.children[0] ?? -1);

    expect(label?.style.color).not.toBe(darkTheme.colors.foreground);
  });

  it("paints no separator for an empty region", () => {
    const root = renderBar(
      <StatusBar label="Editor status" left={left} testId="status" />,
    );
    const bar = element(root, "status");
    const trailing = root.renderer.getElement(bar.children[2] ?? -1);

    expect(trailing?.children).toEqual([]);
  });
});
