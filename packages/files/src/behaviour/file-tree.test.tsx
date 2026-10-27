/**
 * `FileTree`'s gestures, driven through the real GPUix renderer.
 *
 * The bugs these guard:
 *
 * - a folder press that opens a sibling as well, or closes the folder the
 *   reader was working in;
 * - a file press that reports the path twice (once for the row and once for the
 *   keyboard), or reports a folder the tree merely opened;
 * - a tab stop on every row, or on a row that is not painted, so Tab lands in a
 *   collapsed branch;
 * - arrow keys that move the cursor without moving native focus;
 * - a stored expansion list that opens nothing because it is not a `Set`.
 *
 * The workspace is deliberately small so every row the assertions name is one
 * of six, not a scroll hunt. The tree is mounted through the shipped parts,
 * not a probe-local list.
 */

import { createTestRoot, type TestRoot } from "@gpuix/react/testing";
import { lightTheme } from "@gpuixui/tokens";
import { ThemeProvider } from "@gpuixui/tokens/react";
import * as P from "effect/Predicate";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { FileTree, FileTreeFile, FileTreeFolder } from "../tree/file-tree.js";

interface WorkspaceProps {
  readonly initialSelected?: string;
  readonly initialExpanded?: ReadonlyArray<string>;
  readonly onReport?: (path: string) => void;
}

/** The tree and a readout a suite can read without reaching into the rows. */
const Workspace = ({
  initialSelected,
  initialExpanded = ["src"],
  onReport,
}: WorkspaceProps) => {
  const [selected, setSelected] = useState<string | undefined>(initialSelected);
  const [opens, setOpens] = useState<ReadonlyArray<string>>(initialExpanded);
  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 8, width: 360 }}
    >
      <text testId="readout">
        {`selected=${selected ?? "-"} opens=${opens.join(",")}`}
      </text>
      <FileTree
        testId="files"
        aria-label="Project files"
        height={320}
        defaultExpanded={initialExpanded}
        selected={selected}
        onSelect={(path) => {
          onReport?.(path);
          setSelected(path);
        }}
        onExpandedChange={setOpens}
      >
        <FileTreeFolder path="src" name="src">
          <FileTreeFolder path="src/components" name="components">
            <FileTreeFile path="src/components/button.tsx" name="button.tsx" />
          </FileTreeFolder>
          <FileTreeFile path="src/index.ts" name="index.ts" />
        </FileTreeFolder>
        <FileTreeFolder path="assets" name="assets">
          <FileTreeFile path="assets/logo.png" name="logo.png" />
        </FileTreeFolder>
        <FileTreeFile path="readme.md" name="readme.md" />
      </FileTree>
    </div>
  );
};

let root: TestRoot | undefined;

/** Mount the workspace; `afterEach` tears it down even when an assertion fails. */
const mount = (
  props: WorkspaceProps = {},
): { readonly root: TestRoot; readonly reports: Array<string> } => {
  const reports: Array<string> = [];
  const mounted = createTestRoot({ width: 1000, height: 700 });
  mounted.render(
    <ThemeProvider theme={lightTheme}>
      <Workspace
        {...props}
        onReport={(path) => {
          reports.push(path);
          props.onReport?.(path);
        }}
      />
    </ThemeProvider>,
  );
  root = mounted;
  settle(mounted);
  return { root: mounted, reports };
};

/** Dispatch the paint-driven events a render queued, then paint. */
const settle = (mounted: TestRoot): void => {
  mounted.renderer.dispatchNativeEvents();
  mounted.renderer.flush();
};

afterEach(() => {
  root?.unmount();
  root = undefined;
});

/** One row's id, from the path the component keys it by. */
const rowId = (path: string): string => `files-row-${path}`;

/** Every painted string, so an unpainted row is read as absent. */
const painted = (mounted: TestRoot): string =>
  mounted.renderer.getAllText().join(" ");

/** The tab stop a row holds, from the props the runtime painted. */
const tabIndex = (mounted: TestRoot, path: string): number | undefined => {
  const props: unknown = mounted.renderer.findByTestId(
    rowId(path),
  )?.customProps;
  if (!P.isObject(props) || !("tabIndex" in props)) return undefined;
  return P.isNumber(props.tabIndex) ? props.tabIndex : undefined;
};

/** Press the centre of a row through the runtime's real hit testing. */
const press = (mounted: TestRoot, path: string): void => {
  const element = mounted.renderer.findByTestId(rowId(path));
  if (element === undefined) {
    throw new Error(`behaviour: no row "${rowId(path)}"`);
  }
  const bounds = mounted.renderer.getElementBounds(element.id);
  if (bounds === null || bounds === undefined) {
    throw new Error(`behaviour: "${rowId(path)}" paints no box`);
  }
  mounted.renderer.nativeSimulateClick(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
    0,
  );
  settle(mounted);
};

/** Focus a row, then send one key. */
const key = (mounted: TestRoot, path: string, stroke: string): void => {
  const element = mounted.renderer.findByTestId(rowId(path));
  if (element === undefined) {
    throw new Error(`behaviour: no row "${rowId(path)}"`);
  }
  mounted.renderer.focusElement(element.id);
  mounted.renderer.nativeSimulateKeystrokes(element.id, stroke);
  settle(mounted);
};

/** The row that holds native focus, by test id. */
const focused = (mounted: TestRoot): string | undefined => {
  const id = mounted.renderer.getFocusedElementId();
  return id === null || id === undefined
    ? undefined
    : mounted.renderer.getElement(id)?.testId;
};

describe("a folder press", () => {
  it("opens only its own subtree", () => {
    const { root: mounted } = mount();
    expect(painted(mounted)).not.toContain("logo.png");

    press(mounted, "assets");

    expect(painted(mounted)).toContain("logo.png");
    // The folder the reader was in stays open, and the closed grandchild stays
    // closed: the press flipped one branch, not the tree.
    expect(painted(mounted)).toContain("index.ts");
    expect(painted(mounted)).not.toContain("button.tsx");
    expect(painted(mounted)).toContain("opens=assets,src");
  });

  it("closes the same subtree on a second press", () => {
    const { root: mounted } = mount();
    press(mounted, "assets");
    press(mounted, "assets");

    expect(painted(mounted)).not.toContain("logo.png");
    expect(painted(mounted)).toContain("opens=src");
  });
});

describe("a file press", () => {
  it("selects the file and reports it once", () => {
    const { root: mounted, reports } = mount();

    press(mounted, "readme.md");

    expect(reports).toEqual(["readme.md"]);
    expect(painted(mounted)).toContain("selected=readme.md");
  });

  it("does not report the folder a press opens", () => {
    const { root: mounted, reports } = mount();

    press(mounted, "assets");

    expect(reports).toEqual([]);
  });
});

describe("the tab stop", () => {
  it("stands on the selected file at mount", () => {
    const { root: mounted } = mount({ initialSelected: "src/index.ts" });

    expect(tabIndex(mounted, "src/index.ts")).toBe(0);
    expect(tabIndex(mounted, "src")).toBe(-1);
    expect(tabIndex(mounted, "readme.md")).toBe(-1);
  });

  it("falls back to the first row without a selection", () => {
    const { root: mounted } = mount();

    expect(tabIndex(mounted, "src")).toBe(0);
    expect(tabIndex(mounted, "assets")).toBe(-1);
  });
});

describe("the keyboard", () => {
  it("walks the visible rows and moves native focus with them", () => {
    const { root: mounted } = mount({ initialSelected: "src/index.ts" });

    key(mounted, "src/index.ts", "down");

    expect(focused(mounted)).toBe(rowId("assets"));
    expect(tabIndex(mounted, "assets")).toBe(0);
    expect(tabIndex(mounted, "src/index.ts")).toBe(-1);

    key(mounted, "assets", "up");

    expect(focused(mounted)).toBe(rowId("src/index.ts"));
  });

  it("opens a closed folder with Right and closes it with Left", () => {
    const { root: mounted } = mount({ initialSelected: "src/index.ts" });
    key(mounted, "src/index.ts", "down");

    key(mounted, "assets", "right");
    expect(painted(mounted)).toContain("logo.png");
    expect(focused(mounted)).toBe(rowId("assets"));

    key(mounted, "assets", "left");
    expect(painted(mounted)).not.toContain("logo.png");
    expect(focused(mounted)).toBe(rowId("assets"));
  });

  it("selects the file Enter lands on", () => {
    const { root: mounted, reports } = mount({
      initialSelected: "src/index.ts",
    });

    key(mounted, "src/index.ts", "enter");

    expect(reports).toEqual(["src/index.ts"]);
  });
});

describe("the selection's paint", () => {
  it("is the accent pair the reference paints, not the brand fill", () => {
    // The bug: the selected row wore `colors.selected` — a fill role designed to
    // carry `selectedForeground` — so one row of a file tree read as a pressed
    // primary button. shadcn's file tree selects with `bg-accent
    // text-accent-foreground`, the wash every other row-level selection uses.
    const { root: mounted } = mount({ initialSelected: "src/index.ts" });
    const row = mounted.renderer.findByTestId(rowId("src/index.ts"));

    expect(row?.style.backgroundColor).toBe(lightTheme.colors.accent);
    expect(row?.style.backgroundColor).not.toBe(lightTheme.colors.selected);
  });
});

describe("a stored expansion", () => {
  it("paints the same tree a press opens", () => {
    const stored = mount({ initialExpanded: ["src"] });
    const storedRows = painted(stored.root);
    stored.root.unmount();
    root = undefined;

    const pressed = mount({ initialExpanded: [] });
    press(pressed.root, "src");

    expect(painted(pressed.root)).toBe(storedRows);
  });
});
