/**
 * The panel group's collapse, resize and persisted shape.
 *
 * `PanelLayout` is the one shape a workspace persists: it round-trips through a
 * JSON string at the app's boundary, and a corrupt string is a decode failure
 * the caller opens its default over (`workspace-restore`). The collapse and
 * resize reducers are pure, so the same flags and fractions an Effect-driven
 * workspace writes are the ones the group paints.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Effect } from "effect";
import * as Schema from "effect/Schema";
import {
  Panel,
  PanelLayout,
  PanelLayoutJson,
  resizePanels,
  togglePanelCollapsed,
} from "./logic.js";

const groupSource = readFileSync(
  new URL("./panel-group.tsx", import.meta.url),
  "utf8",
);

const layout = new PanelLayout({
  orientation: "horizontal",
  panels: [
    new Panel({
      id: "sidebar",
      label: "Sidebar",
      size: 0.25,
      collapsible: true,
    }),
    new Panel({ id: "main", label: "Main", size: 0.75 }),
  ],
});

describe("collapse", () => {
  it("flips a collapsible panel's flag", () => {
    const next = togglePanelCollapsed(layout, "sidebar");
    expect(next.panels[0]?.collapsed).toBe(true);
    expect(next.panels[1]?.collapsed).toBe(false);
  });

  it("refuses a non-collapsible panel and an unknown id", () => {
    expect(togglePanelCollapsed(layout, "main")).toBe(layout);
    expect(togglePanelCollapsed(layout, "missing")).toBe(layout);
  });

  it("round-trips through the divider's collapse, so a restore re-opens it", () => {
    const collapsed = togglePanelCollapsed(layout, "sidebar");
    const opened = togglePanelCollapsed(collapsed, "sidebar");
    expect(opened.panels[0]?.collapsed).toBe(false);
  });
});

describe("resize", () => {
  it("trades space between the two panes the divider names", () => {
    const next = resizePanels(layout.panels, 0, 0.1);
    expect(next[0]?.size).toBeCloseTo(0.35);
    expect(next[1]?.size).toBeCloseTo(0.65);
  });

  it("clamps a pane to empty instead of inverting", () => {
    const next = resizePanels(layout.panels, 0, 1);
    expect(next[0]?.size).toBe(1);
    expect(next[1]?.size).toBe(0);
  });

  it("returns the list unchanged for a divider with no neighbour", () => {
    expect(resizePanels(layout.panels, 1, 0.1)).toBe(layout.panels);
  });
});

describe("the persisted shape", () => {
  it("round-trips through a JSON string", async () => {
    const json = await Effect.runPromise(
      Schema.encodeUnknownEffect(PanelLayoutJson)(layout),
    );
    const decoded = await Effect.runPromise(
      Schema.decodeUnknownEffect(PanelLayoutJson)(json),
    );
    expect(decoded).toEqual(layout);
    expect(decoded.panels).toHaveLength(2);
    expect(decoded.panels[0]?.collapsible).toBe(true);
  });

  it("fails to decode a string that is not a layout", async () => {
    await expect(
      Effect.runPromise(
        Schema.decodeUnknownEffect(PanelLayoutJson)("not a workspace"),
      ),
    ).rejects.toThrow();
  });
});

describe("the group's runtime rules", () => {
  it("drives each pane's share from its fraction, never a transform", () => {
    expect(groupSource).toContain("flexGrow");
    expect(groupSource).toContain("panel.size");
    expect(groupSource).not.toMatch(/\btransform\s*:/);
  });

  it("keeps the collapse toggle on the primitives' Button", () => {
    expect(groupSource).toContain("@gpuixui/primitives/button");
    expect(groupSource).toContain("togglePanelCollapsed");
  });
});
