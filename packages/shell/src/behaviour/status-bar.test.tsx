/**
 * The status bar as the window paints it.
 *
 * The bug these guard: the strip read as a floating card — a rounded box with a
 * border on all four sides, sans text, and the page's tone demo inside it — on a
 * page whose whole subject is the chrome row at the bottom of a window. The
 * geometry is the renderer's (the bar spans its frame and sits on its bottom
 * edge); the surface is the recipe's (no radius, one top border, the chrome fill
 * and mono `text-xs`), because 0.11.0 publishes no radius query.
 */

import { readFileSync } from "node:fs";
import type { TestRoot } from "@gpuix/react/testing";
import { createTestRoot } from "@gpuix/react/testing";
import { darkTheme } from "@gpuixui/tokens";
import { ThemeProvider } from "@gpuixui/tokens/react";
import { afterEach, describe, expect, it } from "vitest";
import { StatusBar } from "../status-bar/status-bar.js";

const FRAME = { width: 900, height: 64 } as const;

const BOX = {
  display: "flex",
  flexDirection: "column",
  width: FRAME.width,
  height: FRAME.height,
} as const;

const BAR = [
  { id: "branch", label: "main" },
  { id: "position", label: "Ln 12, Col 4" },
] as const;

const RIGHT = [
  { id: "errors", label: "3 errors", tone: "destructive" },
] as const;

let mounted: TestRoot | null = null;

afterEach(() => {
  mounted?.unmount();
  mounted = null;
});

const renderBar = (): TestRoot => {
  const root = createTestRoot({ width: FRAME.width, height: FRAME.height });
  root.render(
    <ThemeProvider theme={darkTheme}>
      <div style={BOX} testId="frame">
        <div style={{ flexGrow: 1 }} />
        <StatusBar
          label="Editor status"
          left={[...BAR]}
          right={[...RIGHT]}
          testId="status"
        />
      </div>
    </ThemeProvider>,
  );
  mounted = root;
  root.renderer.flush();
  return root;
};

const boundsOf = (root: TestRoot, testId: string) => {
  const found = root.renderer.findByTestId(testId);
  if (found === undefined || found === null) {
    throw new Error(`no element with testId ${testId}`);
  }
  const bounds = root.renderer.getElementBounds(found.id);
  if (bounds === null) throw new Error(`no painted box for ${testId}`);
  return bounds;
};

describe("the status bar in a window", () => {
  it("spans its frame and rests on the bottom edge", () => {
    const root = renderBar();
    const frame = boundsOf(root, "frame");
    const bar = boundsOf(root, "status");

    expect(bar.x).toBe(frame.x);
    expect(bar.width).toBe(frame.width);
    expect(bar.y + bar.height).toBe(frame.y + frame.height);
    // A strip has the row's height, not the window's.
    expect(bar.height).toBeLessThan(frame.height);
  });

  it("paints the chrome strip: no radius, one top border, mono text-xs", () => {
    const source = readFileSync(
      new URL("../status-bar/status-bar.tsx", import.meta.url),
      "utf8",
    );
    const recipe = /const STATUS_BAR =\s*"([^"]+)"/.exec(source)?.[1] ?? "";
    const item = /const STATUS_ITEM =\s*"([^"]+)"/.exec(source)?.[1] ?? "";

    expect(recipe).toContain("w-full");
    expect(recipe).toContain("border-t");
    expect(recipe).toContain("bg-muted");
    expect(recipe).not.toContain("rounded");
    expect(recipe).not.toContain("border border-input");
    expect(item).toBe("text-xs font-mono");
  });
});
