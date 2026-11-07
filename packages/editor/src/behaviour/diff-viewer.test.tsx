import { createTestRoot } from "@gpuix/react/testing";
import { darkTheme, textStyle } from "@gpuixui/tokens";
import { ThemeProvider } from "@gpuixui/tokens/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { DiffViewer } from "../diff/diff-viewer.js";
import type { DiffMode } from "../diff/logic.js";

interface Root {
  readonly renderer: ReturnType<typeof createTestRoot>["renderer"];
  readonly unmount: () => void;
}

let current: Root | undefined;

const render = (node: ReactNode): Root => {
  const root = createTestRoot({ width: 900, height: 500 });
  root.render(<ThemeProvider theme={darkTheme}>{node}</ThemeProvider>);
  const mounted: Root = {
    renderer: root.renderer,
    unmount: () => {
      root.unmount();
      current = undefined;
    },
  };
  current = mounted;
  return mounted;
};

afterEach(() => {
  current?.unmount();
});

const rowText = (root: Root, testId: string): ReadonlyArray<string> => {
  const row = root.renderer.findByTestId(testId);
  if (row === undefined) return [];
  const found: Array<string> = [];
  const walk = (id: number): void => {
    const element = root.renderer.getElement(id);
    if (element === undefined) return;
    if (element.type === "text" && element.text !== null) {
      found.push(element.text);
    }
    element.children.forEach(walk);
  };
  walk(row.id);
  return found;
};

describe("DiffViewer in split mode", () => {
  it("puts a changed line and its replacement on one row", () => {
    const root = render(
      <DiffViewer
        before={"alpha\nbeta\ngamma"}
        after={"alpha\nBETA\ngamma"}
        mode="split"
      />,
    );

    expect(rowText(root, "diff-viewer-row-1-before")).toEqual(["2", "beta"]);
    expect(rowText(root, "diff-viewer-row-1-after")).toEqual(["2", "BETA"]);

    expect(
      root.renderer.findByTestId("diff-viewer-row-3-before"),
    ).toBeUndefined();
  });

  it("gives the two columns equal widths and a visible divider", () => {
    const root = render(
      <DiffViewer
        before={"a very long removed line that would push its column wide"}
        after={"short"}
        mode="split"
      />,
    );
    const before = root.renderer.findByTestId("diff-viewer-before");
    const after = root.renderer.findByTestId("diff-viewer-after");
    expect(before?.style.flexGrow).toBe(1);
    expect(after?.style.flexGrow).toBe(1);
    expect(before?.style.minWidth).toBe(0);
    expect(after?.style.minWidth).toBe(0);
    expect(before?.style.overflowX).toBe("scroll");
    expect(after?.style.overflowX).toBe("scroll");
    const divider = root.renderer.findByTestId("diff-viewer-divider");
    expect(divider?.style.width).toBe(darkTheme.borderWidth.thin);
    expect(divider?.style.backgroundColor).toBe(darkTheme.colors.border);
  });

  it("holds both sides of a row on one height, and both views on that height", () => {
    const root = render(
      <DiffViewer
        before={"alpha\nbeta\ngamma"}
        after={"alpha\nBETA\ngamma"}
        mode="split"
      />,
    );
    const lineHeight = textStyle(darkTheme, "codeBlock").lineHeight;
    const left = root.renderer.findByTestId("diff-viewer-row-1-before");
    const right = root.renderer.findByTestId("diff-viewer-row-1-after");
    expect(left?.style.height).toBe(lineHeight);
    expect(right?.style.height).toBe(lineHeight);
    root.unmount();

    const merged = render(
      <DiffViewer before={"alpha\nbeta\ngamma"} after={"alpha\nBETA\ngamma"} />,
    );
    expect(
      merged.renderer.findByTestId("diff-viewer-row-1")?.style.height,
    ).toBe(lineHeight);
  });

  it("paints a hunk heading once across both columns", () => {
    const before = Array.from({ length: 12 }, (_, index) =>
      String(index + 1).padStart(2, "0"),
    );
    const after = before.map((line) =>
      line === "02" ? "02 changed" : line === "11" ? "11 changed" : line,
    );
    const root = render(
      <DiffViewer
        before={before.join("\n")}
        after={after.join("\n")}
        mode="split"
        contextLines={1}
      />,
    );

    expect(rowText(root, "diff-viewer-hunk-0")).toEqual(["@@ -1,3 +1,3 @@"]);
    expect(rowText(root, "diff-viewer-row-1-before")).toEqual(["2", "02"]);
    expect(rowText(root, "diff-viewer-row-1-after")).toEqual([
      "2",
      "02 changed",
    ]);
  });

  it("names the surface when the stored label is blank", () => {
    const root = render(
      <DiffViewer before={"alpha"} after={"beta"} label="   " />,
    );
    expect(
      root.renderer.findByTestId("diff-viewer")?.customProps?.["aria-label"],
    ).toBe("Diff");
    root.unmount();

    const stored = render(
      <DiffViewer
        before={"alpha"}
        after={"beta"}
        label={42 as unknown as string}
      />,
    );
    expect(
      stored.renderer.findByTestId("diff-viewer")?.customProps?.["aria-label"],
    ).toBe("Diff");
    stored.unmount();
  });

  it("reads a side that carried no document as an empty source", () => {
    const root = render(
      <DiffViewer
        before={null as unknown as string}
        after={"beta"}
        lineNumbers={false}
      />,
    );
    expect(rowText(root, "diff-viewer-row-0")).toEqual(["+", "beta"]);
    root.unmount();
  });

  it("leaves the side blank when a run only adds lines", () => {
    const root = render(
      <DiffViewer
        before={"alpha"}
        after={"alpha\nbeta"}
        mode="split"
        lineNumbers={false}
      />,
    );
    expect(rowText(root, "diff-viewer-row-1-after")).toEqual(["beta"]);
    expect(
      root.renderer.findByTestId("diff-viewer-row-2-after"),
    ).toBeUndefined();
  });

  it("paints the default layout for a stored mode name it does not declare", () => {
    const root = render(
      <DiffViewer
        before={"alpha\nbeta\ngamma"}
        after={"alpha\nBETA\ngamma"}
        mode={"inline" as unknown as DiffMode}
      />,
    );
    expect(rowText(root, "diff-viewer-row-1")).toEqual(["-", "2", "beta"]);
    expect(rowText(root, "diff-viewer-row-3")).toEqual([
      " ",
      "3",
      "3",
      "gamma",
    ]);
    root.unmount();
  });

  it("grows both cells of a wrapped row together", () => {
    const root = createTestRoot({ width: 800, height: 400 });
    root.render(
      <ThemeProvider theme={darkTheme}>
        <DiffViewer
          testId="wrap"
          mode="split"
          wrapColumns={10}
          before={"short"}
          after={"a line well past ten columns"}
        />
      </ThemeProvider>,
    );
    root.renderer.flush();
    const height = (side: string) => {
      const element = root.renderer.findByTestId(`wrap-row-0-${side}`);
      return element === null || element === undefined
        ? -1
        : (root.renderer.getElementBounds(element.id)?.height ?? -1);
    };
    const line = textStyle(darkTheme, "codeBlock").lineHeight;
    expect(height("before")).toBe(line * 3);
    expect(height("after")).toBe(line * 3);
    root.unmount();
  });

  it("keeps both columns level under an annotation", () => {
    const root = renderDiffForNote();
    const before = root.bounds("note-note-2-before");
    const after = root.bounds("note-note-2-after");
    expect(before.height).toBe(40);
    expect(after.y).toBe(before.y);
    root.unmount();
  });
});

const renderDiffForNote = () => {
  const root = createTestRoot({ width: 800, height: 400 });
  root.render(
    <ThemeProvider theme={darkTheme}>
      <DiffViewer
        testId="note"
        mode="split"
        before={"one\ntwo\nthree"}
        after={"one\nTWO\nthree"}
        annotations={[
          { line: 2, height: 40, content: <text>looks right</text> },
        ]}
      />
    </ThemeProvider>,
  );
  root.renderer.flush();
  return {
    bounds: (testId: string) => {
      const element = root.renderer.findByTestId(testId);
      const box =
        element === null || element === undefined
          ? null
          : root.renderer.getElementBounds(element.id);
      if (box === null) throw new Error(`no element ${testId}`);
      return box;
    },
    unmount: root.unmount,
  };
};
