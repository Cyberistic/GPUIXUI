/**
 * The blocks, in the real GPUix renderer. The bugs these guard: a block that
 * paints nothing, a Look control that does not restyle the tree, a thread click
 * that does not open the thread, and a kanban drag that leaves the card where
 * it was (or drops it in a column the pointer was not over). The desktop: a
 * Start button that does not open the menu, a taskbar button that does not
 * bring its window to the front, and a menu a press on the desktop leaves open.
 * Stats: a range control that leaves the numbers on the old range. SettingsApp:
 * a Dark mode switch that changes nothing (its handlers were no-ops in main.tsx).
 * Console: a sidebar trigger that does not collapse the sidebar, and a Deploy
 * button that raises no toast (the toasts once never painted: two root children).
 */
import { createTestRoot } from "@gpuix/react/testing";
import { lightTheme, platformTheme } from "@gpuixui/tokens";
import { ThemeProvider } from "@gpuixui/tokens/react";
import { useState, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Console } from "./console/console.js";
import { DesktopBlock } from "./desktop/desktop.js";
import { Inbox } from "./inbox/inbox.js";
import { Kanban } from "./kanban/kanban.js";
import { Settings, SettingsApp, type Look } from "./settings/settings.js";
import { Stats } from "./stats/stats.js";
import { TilingDesktop } from "./tiling/tiling.js";

// The first mount in a file loads the native binding and its fonts: measured at
// 7.3 s cold against vitest's 5 s default.
vi.setConfig({ testTimeout: 20_000 });

let unmount = () => {};
afterEach(() => unmount());

const mount = (node: ReactNode) => {
  const root = createTestRoot({ width: 1280, height: 800 });
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
        <Settings
          look={look}
          onLookChange={setLook}
          dark={false}
          onDarkChange={() => {}}
        />
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
    const shown = () =>
      r.getAllText().filter((t) => t === "Theme follow on Omarchy").length;
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
      r.nativeSimulateMouseMove(
        from.x + ((to.x - from.x) * step) / 6,
        from.y,
        0,
      );
    r.nativeSimulateMouseUp(to.x, from.y, 0);
    r.flush();
    expect(parentColumn(r, "task-theme")).toBe("column-Done");
  });
});

describe("Desktop", () => {
  /** The windows' ids in paint order: the last is in front. */
  const order = (r: Renderer) => {
    const root = r.findByTestId("desktop");
    return (root?.children ?? [])
      .map((id) => r.getElement(id)?.testId)
      .filter((id): id is string => id?.startsWith("window-") === true);
  };

  for (const look of ["luna", "aero"] as const) {
    it(`opens Start, raises from the taskbar and closes on the desktop (${look})`, () => {
      const r = mount(<DesktopBlock look={look} />);
      expect(r.findByTestId("start-menu")).toBeUndefined();
      const start = centre(r, "start");
      r.nativeSimulateClick(start.x, start.y);
      r.flush();
      expect(r.findByTestId("start-menu")).toBeDefined();

      r.nativeSimulateMouseDown(1200, 60, 0);
      r.nativeSimulateMouseUp(1200, 60, 0);
      r.flush();
      expect(r.findByTestId("start-menu")).toBeUndefined();

      expect(order(r)).toEqual(["window-explorer", "window-license"]);
      const task = centre(r, "task-explorer");
      r.nativeSimulateClick(task.x, task.y);
      r.flush();
      expect(order(r)).toEqual(["window-license", "window-explorer"]);
    });
  }
});

describe("Stats", () => {
  it("swaps every number when the range changes", () => {
    const r = mount(<Stats />);
    const bouts = () => r.findByTestId("tile-Bouts");
    const text = () => r.getAllText();
    expect(text()).toContain("128");
    const month = centre(r, "range-month");
    r.nativeSimulateClick(month.x, month.y);
    r.flush();
    expect(bouts()).toBeDefined();
    expect(text()).toContain("512");
    expect(text()).not.toContain("128");
  });
});

describe("SettingsApp", () => {
  it("repaints in the dark theme when Dark mode is pressed", () => {
    const r = mount(<SettingsApp />);
    const before = r.findByTestId("settings")?.style.backgroundColor;
    const dark = centre(r, "dark");
    r.nativeSimulateClick(dark.x, dark.y);
    r.flush();
    expect(r.findByTestId("settings")?.style.backgroundColor).not.toEqual(
      before,
    );
  });
});

describe("Console", () => {
  it("collapses the sidebar and raises the deploy toasts", () => {
    const r = mount(<Console />);
    const width = () => {
      const sidebar = r.findByTestId("sidebar");
      return sidebar === undefined
        ? null
        : r.getElementBounds(sidebar.id)?.width;
    };
    const open = width();
    const trigger = centre(r, "sidebar-trigger");
    r.nativeSimulateClick(trigger.x, trigger.y);
    r.flush();
    r.clockFastForward(1_000);
    r.dispatchNativeEvents();
    r.flush();
    expect(width()).toBeLessThan(open ?? 0);
    expect(r.getAllText()).not.toContain("Greed Island is live");
    const deploy = centre(r, "deploy");
    r.nativeSimulateClick(deploy.x, deploy.y);
    r.flush();
    expect(r.getAllText()).toContain("Greed Island is live");
  });
});

describe("TilingDesktop", () => {
  it("moves the accent border to the tile pressed", () => {
    const r = mount(<TilingDesktop />);
    const border = (id: string) =>
      r.findByTestId(`tile-${id}`)?.style.borderColor;
    const accent = border("settings");
    expect(border("terminal")).not.toEqual(accent);
    const terminal = centre(r, "tile-terminal");
    r.nativeSimulateClick(terminal.x, terminal.y);
    r.flush();
    expect(border("terminal")).toEqual(accent);
    expect(border("settings")).not.toEqual(accent);
    expect(r.getAllText()).toContain("Alacritty — fastfetch");
  });

  it("re-themes the whole desktop from one Omarchy palette", () => {
    const r = mount(<TilingDesktop palette="tokyo-night" />);
    const bar = () => r.findByTestId("tiling-bar")?.style.backgroundColor;
    const dark = bar();
    unmount();
    const light = mount(<TilingDesktop palette="rose-pine" />);
    expect(light.findByTestId("tiling-bar")?.style.backgroundColor).not.toEqual(
      dark,
    );
  });
});
