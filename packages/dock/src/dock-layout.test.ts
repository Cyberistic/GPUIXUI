/**
 * The dock's tree and the tab state it carries.
 *
 * `DockNode` is a named tree of splits and tabbed groups. It round-trips
 * through a JSON string, `activeTab` included, so a workspace is restored by
 * decoding one string — the contract `workspace-restore` measured, where a
 * decode failure opens the default. Switching a tab rewrites that group's
 * `activeTab` and leaves every other group alone, reported as a new tree.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Effect } from "effect";
import * as Schema from "effect/Schema";
import {
  DockNodeJson,
  DockTab,
  setActiveTab,
  type DockNode,
  type DockSplit,
  type DockTabs,
} from "./logic.js";

const layoutSource = readFileSync(
  new URL("./dock-layout.tsx", import.meta.url),
  "utf8",
);

const editor: DockTabs = {
  kind: "tabs",
  id: "editor",
  activeTab: "code",
  tabs: [
    new DockTab({ id: "code", label: "Code" }),
    new DockTab({ id: "preview", label: "Preview" }),
  ],
};

const right: DockSplit = {
  kind: "split",
  id: "right",
  orientation: "vertical",
  size: 0.5,
  first: {
    kind: "tabs",
    id: "outline",
    activeTab: "symbols",
    tabs: [new DockTab({ id: "symbols", label: "Symbols" })],
  },
  second: {
    kind: "tabs",
    id: "terminal",
    activeTab: "shell",
    tabs: [new DockTab({ id: "shell", label: "Shell" })],
  },
};

const tree: DockNode = {
  kind: "split",
  id: "root",
  orientation: "horizontal",
  size: 0.3,
  first: editor,
  second: right,
};

describe("the dock tree", () => {
  it("round-trips a nested tree through a JSON string", async () => {
    const json = await Effect.runPromise(
      Schema.encodeUnknownEffect(DockNodeJson)(tree),
    );
    const decoded = await Effect.runPromise(
      Schema.decodeUnknownEffect(DockNodeJson)(json),
    );
    expect(decoded).toEqual(tree);
    expect(decoded).toMatchObject({ kind: "split" });
  });

  it("fails to decode a string that is not a tree", async () => {
    await expect(
      Effect.runPromise(
        Schema.decodeUnknownEffect(DockNodeJson)("not a layout"),
      ),
    ).rejects.toThrow();
  });
});

describe("active tab", () => {
  it("rewrites only the group it names", () => {
    const next = setActiveTab(tree, "editor", "preview");
    expect(next.kind).toBe("split");
    if (next.kind === "split") {
      expect(next.first).toMatchObject({ activeTab: "preview" });
      // The sibling subtree is untouched: the same reference, not a rewrite.
      expect(next.second).toBe(right);
    }
  });

  it("returns the tree unchanged for an unknown group or tab", () => {
    expect(setActiveTab(tree, "missing", "code")).toBe(tree);
    expect(setActiveTab(tree, "editor", "missing")).toBe(tree);
  });
});

describe("the dock's runtime rules", () => {
  it("renders a tree, not a flat pane list", () => {
    expect(layoutSource).toContain("DockNodeView");
    expect(layoutSource).toContain('role="tab"');
    expect(layoutSource).toContain("aria-selected");
  });

  it("resizes a split by fraction and never a transform", () => {
    expect(layoutSource).toContain("resizeSplit");
    expect(layoutSource).not.toMatch(/\btransform\s*:/);
  });
});
