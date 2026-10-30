/**
 * The blocks, in the real GPUix renderer. The bugs these guard: a block that
 * paints nothing, a Look control that does not restyle the tree, a thread click
 * that does not open the thread, and a kanban drag that leaves the card where
 * it was (or drops it in a column the pointer was not over).
 */
import { createTestRoot } from "@gpuix/react/testing";
import { lightTheme, platformTheme } from "@gpuixui/tokens";
import { ThemeProvider } from "@gpuixui/tokens/react";
import { useState, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Inbox } from "./inbox.js";
import { Kanban } from "./kanban.js";
import { Settings, type Look } from "./settings.js";

// The first mount in a file loads the native binding and its fonts: measured at
// 7.3 s cold against vitest's 5 s default.
vi.setConfig({ testTimeout: 20_000 });

let unmount = () => {};
afterEach(() => unmount());

const mount = (node: ReactNode) => {
  const root = createTestRoot({ width: 1024, height: 640 });
  root.render(<ThemeProvider theme={lightTheme}>{node}</ThemeProvider>);
  root.renderer.flush();
  unmount = root.unmount;
  return root.renderer;
};

type Renderer = ReturnType<typeof mount>;

const centre = (r: Renderer, testId: string) => {
  const element = r.findByTestId(testId);
  const b = element === undefined ? null : r.getElementBounds(element.id);
  expect(b, testId).not.toBeNull();
  return { x: b!.x + b!.width / 2, y: b!.y + b!.height / 2, width: b!.width };
};

const parentColumn = (r: Renderer, testId: string) => {
  let id = r.findByTestId(testId)?.parentId ?? null;
  while (id !== null) {
    const element = r.getElement(id);
    if (element?.testId?.startsWith("column-") === true) return element.testId;
    id = element?.parentId ?? null;
  }
  return null;
};

describe("Settings", () => {
  const Host = () => {
    const [look, setLook] = useState<Look>("darwin");
    return (
      <ThemeProvider theme={platformTheme(lightTheme, look)}>
        <Settings look={look} onLookChange={setLook} dark={false} onDarkChange={() => {}} />
      </ThemeProvider>
    );
  };

  it("restyles every control when the Look changes", () => {
    const r = mount(<Host />);
    const before = r.findByTestId("dark")?.style;
    const target = centre(r, "look-win32");
    r.nativeSimulateClick(target.x, target.y);
    r.flush();
    expect(r.findByTestId("dark")?.style).not.toEqual(before);
  });
});

describe("Inbox", () => {
  it("opens the thread that is clicked", () => {
    const r = mount(<Inbox />);
    const shown = () => r.getAllText().filter((t) => t === "Theme follow on Omarchy").length;
    expect(shown()).toBe(1);
    const row = centre(r, "thread-omarchy");
    r.nativeSimulateClick(row.x, row.y);
    r.flush();
    expect(shown()).toBe(2);
  });
});

describe("Kanban", () => {
  it("moves a dragged card to the column it is dropped on", () => {
    const r = mount(<Kanban />);
    expect(parentColumn(r, "task-theme")).toBe("column-In progress");
    const from = centre(r, "task-theme");
    const to = centre(r, "column-Done");
    r.nativeSimulateMouseMove(from.x, from.y);
    r.nativeSimulateMouseDown(from.x, from.y, 0);
    for (let step = 1; step <= 6; step += 1)
      r.nativeSimulateMouseMove(from.x + ((to.x - from.x) * step) / 6, from.y, 0);
    r.nativeSimulateMouseUp(to.x, from.y, 0);
    r.flush();
    expect(parentColumn(r, "task-theme")).toBe("column-Done");
  });
});
