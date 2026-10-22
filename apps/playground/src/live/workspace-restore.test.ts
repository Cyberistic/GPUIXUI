/**
 * Guards the persisted-layout rule the `workspace-restore` probe measures.
 *
 * The probe asserts that a saved arrangement paints again after a remount, so a
 * fixture that dropped the tab, trusted an out-of-bounds width or decoded a
 * random string into a layout would make the probe compare the runtime against
 * a state no app should write. These cases hold the boundary the probe relies
 * on: a layout round-trips through the string an app persists, a string that is
 * not a layout falls back to the default rather than a partial state, and a
 * stored width is clamped to the pane this window paints.
 */
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  CORRUPT_WORKSPACE,
  WORKSPACE_DOCUMENT,
  WORKSPACE_SIDEBAR,
  WORKSPACE_TABS,
  WorkspaceLayout,
  clampDocument,
  clampedSample,
  decodeTab,
  decodeWorkspace,
  defaultWorkspace,
  encodeWorkspace,
  restoreWorkspace,
  stepDocument,
  toggleSidebar,
  updateWorkspace,
  workspaceEquals,
} from "./workspace-restore.js";

describe("the workspace-restore fixture", () => {
  it("round-trips a layout through the string an app persists", () => {
    const layouts = [
      defaultWorkspace(),
      new WorkspaceLayout({
        sidebar: 0,
        document: 360,
        tab: "output",
        scroll: 120,
      }),
      new WorkspaceLayout({
        sidebar: 80,
        document: 180,
        tab: "problems",
        scroll: 0,
      }),
    ];
    expect(
      Arr.map(layouts, (layout) =>
        Option.match(decodeWorkspace(encodeWorkspace(layout)), {
          onNone: () => false,
          onSome: (decoded) => workspaceEquals(decoded, layout),
        }),
      ),
    ).toEqual([true, true, true]);
  });

  it("holds every document the layout can name through the stored string", () => {
    expect(
      Arr.map(WORKSPACE_TABS, (tab) => {
        const stored = encodeWorkspace(
          updateWorkspace(defaultWorkspace(), { tab }),
        );
        return Option.map(decodeWorkspace(stored), (layout) => layout.tab);
      }),
    ).toEqual(Arr.map(WORKSPACE_TABS, Option.some));
    expect(Option.isNone(decodeTab("terminal"))).toBe(true);
  });

  it("falls back to the default arrangement for a string that is not one", () => {
    const restored = restoreWorkspace(CORRUPT_WORKSPACE);
    expect(restored.source).toBe("default");
    expect(workspaceEquals(restored.layout, defaultWorkspace())).toBe(true);
  });

  it("falls back rather than keeping a partial layout", () => {
    const restored = restoreWorkspace('{"tab":"output"}');
    expect(restored.source).toBe("default");
    expect(workspaceEquals(restored.layout, defaultWorkspace())).toBe(true);
  });

  it("clamps a stored width and scroll to what the window can paint", () => {
    const restored = restoreWorkspace(encodeWorkspace(clampedSample()));
    expect(restored.source).toBe("stored");
    expect(restored.layout.sidebar).toBe(0);
    expect(restored.layout.document).toBe(WORKSPACE_DOCUMENT.max);
    expect(restored.layout.scroll).toBe(0);
    expect(clampDocument(-40)).toBe(WORKSPACE_DOCUMENT.min);
  });

  it("steps the document width by one control and stops at both bounds", () => {
    expect(
      stepDocument(WORKSPACE_DOCUMENT.initial, WORKSPACE_DOCUMENT.step),
    ).toBe(280);
    expect(stepDocument(WORKSPACE_DOCUMENT.max, WORKSPACE_DOCUMENT.step)).toBe(
      WORKSPACE_DOCUMENT.max,
    );
    expect(stepDocument(WORKSPACE_DOCUMENT.min, -WORKSPACE_DOCUMENT.step)).toBe(
      WORKSPACE_DOCUMENT.min,
    );
    expect(toggleSidebar(WORKSPACE_SIDEBAR)).toBe(0);
    expect(toggleSidebar(0)).toBe(WORKSPACE_SIDEBAR);
  });

  it("changes one field without carrying the rest of the layout away", () => {
    const before = updateWorkspace(defaultWorkspace(), {
      sidebar: 0,
      document: 320,
      tab: "output",
      scroll: 120,
    });
    const after = updateWorkspace(before, { tab: "problems" });
    expect(workspaceEquals(after, before)).toBe(false);
    expect(after.tab).toBe("problems");
    expect([after.sidebar, after.document, after.scroll]).toEqual([
      before.sidebar,
      before.document,
      before.scroll,
    ]);
  });
});
