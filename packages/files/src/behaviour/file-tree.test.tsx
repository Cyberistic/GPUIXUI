import { createTestRoot, type TestRoot } from "@gpuix/react/testing";
import { MotionProvider } from "@gpuixui/motion/react/presence";
import { lightTheme } from "@gpuixui/tokens";
import { ThemeProvider } from "@gpuixui/tokens/react";
import * as P from "effect/Predicate";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FileTree, FileTreeFile, FileTreeFolder } from "../tree/file-tree.js";

interface WorkspaceProps {
  readonly initialSelected?: string;
  readonly initialExpanded?: ReadonlyArray<string>;
  readonly onReport?: (path: string) => void;
}

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

const settle = (mounted: TestRoot): void => {
  mounted.renderer.dispatchNativeEvents();
  mounted.renderer.flush();
};

afterEach(() => {
  root?.unmount();
  root = undefined;
});

const rowId = (path: string): string => `files-row-${path}`;

const painted = (mounted: TestRoot): string =>
  mounted.renderer.getAllText().join(" ");

const tabIndex = (mounted: TestRoot, path: string): number | undefined => {
  const props: unknown = mounted.renderer.findByTestId(
    rowId(path),
  )?.customProps;
  if (!P.isObject(props) || !("tabIndex" in props)) return undefined;
  return P.isNumber(props.tabIndex) ? props.tabIndex : undefined;
};

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

const key = (mounted: TestRoot, path: string, stroke: string): void => {
  const element = mounted.renderer.findByTestId(rowId(path));
  if (element === undefined) {
    throw new Error(`behaviour: no row "${rowId(path)}"`);
  }
  mounted.renderer.focusElement(element.id);
  mounted.renderer.nativeSimulateKeystrokes(element.id, stroke);
  settle(mounted);
};

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

    expect(painted(mounted)).toContain("index.ts");
    expect(painted(mounted)).not.toContain("button.tsx");
    expect(painted(mounted)).toContain("opens=assets,src");
  });

  it("closes the same subtree on a second press", async () => {
    const { root: mounted } = mount();
    press(mounted, "assets");
    press(mounted, "assets");

    expect(painted(mounted)).toContain("logo.png");
    await vi.waitFor(() => expect(painted(mounted)).not.toContain("logo.png"));
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

  it("opens a closed folder with Right and closes it with Left", async () => {
    const { root: mounted } = mount({ initialSelected: "src/index.ts" });
    key(mounted, "src/index.ts", "down");

    key(mounted, "assets", "right");
    expect(painted(mounted)).toContain("logo.png");
    expect(focused(mounted)).toBe(rowId("assets"));

    key(mounted, "assets", "left");

    await vi.waitFor(() => expect(painted(mounted)).not.toContain("logo.png"));
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
  it("is the neutral wash the reference paints, not a brand fill", () => {
    const { root: mounted } = mount({ initialSelected: "src/index.ts" });
    const row = mounted.renderer.findByTestId(rowId("src/index.ts"));

    expect(row?.style.backgroundColor).toBe(lightTheme.colors.hover);
    expect(row?.style.backgroundColor).not.toBe(lightTheme.colors.selected);
    expect(row?.style.backgroundColor).not.toBe(lightTheme.colors.accent);
  });
});

describe("a fold's motion", () => {
  const fold = async (mounted: TestRoot): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    settle(mounted);
  };

  const height = (mounted: TestRoot, path: string): number | undefined => {
    const element = mounted.renderer.findByTestId(rowId(path));
    if (element === undefined) return undefined;
    return mounted.renderer.getElementBounds(element.id)?.height;
  };

  it("folds a closed branch through intermediate heights", async () => {
    const { root: mounted } = mount();
    try {
      press(mounted, "assets");
      mounted.renderer.clockFastForward(400);
      settle(mounted);
      expect(height(mounted, "assets/logo.png")).toBe(32);

      mounted.renderer.clockPause();
      press(mounted, "assets");
      await fold(mounted);

      expect(height(mounted, "assets/logo.png")).toBe(32);

      mounted.renderer.clockFastForward(120);
      settle(mounted);
      const middle = height(mounted, "assets/logo.png");
      expect(middle).toBeGreaterThan(0);
      expect(middle).toBeLessThan(32);

      mounted.renderer.clockFastForward(240);
      settle(mounted);
      expect(height(mounted, "assets/logo.png")).toBe(0);
    } finally {
      mounted.unmount();
    }
  });

  it("snaps the fold under the reduced preference", () => {
    const mounted = createTestRoot({ width: 1000, height: 700 });
    root = mounted;
    try {
      mounted.render(
        <ThemeProvider theme={lightTheme}>
          <MotionProvider preference="reduced">
            <Workspace initialExpanded={["src", "assets"]} />
          </MotionProvider>
        </ThemeProvider>,
      );
      settle(mounted);

      mounted.renderer.clockPause();
      press(mounted, "assets");
      settle(mounted);

      expect(height(mounted, "assets/logo.png")).toBeUndefined();
    } finally {
      mounted.unmount();
      root = undefined;
    }
  });

  it("leaves the selected row and the other branches where they were", () => {
    const { root: mounted } = mount({ initialSelected: "src/index.ts" });
    try {
      const selected = mounted.renderer.findByTestId(rowId("src/index.ts"));
      const docs = mounted.renderer.findByTestId(rowId("assets"));
      if (selected === undefined || docs === undefined) {
        throw new Error("behaviour: the workspace rows are missing");
      }
      const before = {
        selected: mounted.renderer.getElementBounds(selected.id),
        docs: mounted.renderer.getElementBounds(docs.id),
      };

      press(mounted, "assets");
      press(mounted, "assets");

      const after = {
        selected: mounted.renderer.getElementBounds(selected.id),
        docs: mounted.renderer.getElementBounds(docs.id),
      };
      expect(after.selected?.y).toBe(before.selected?.y);
      expect(after.docs?.y).toBe(before.docs?.y);
    } finally {
      mounted.unmount();
    }
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
