/**
 * The Mac-app blocks on the real GPUix renderer (plan 729): each mounts and
 * answers its primary interaction.
 *
 * Bugs guarded: a note row that does not open its note; a preferences search
 * that leaves every pane listed; a launcher whose query filters nothing; a
 * menu-bar switch that leaves the status line stale; an agent whose Send adds
 * nothing; a calendar switch that keeps the calendar's events; a welcome whose
 * Continue does not advance; a viewer whose thumbnail does not open the HUD.
 */
import { createTestRoot } from "@gpuix/react/testing";
import { lightTheme, platformTheme } from "@gpuixui/tokens";
import { ThemeProvider } from "@gpuixui/tokens/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Agent } from "./agent/agent.js";
import { CalendarBlock } from "./calendar/calendar.js";
import { Launcher } from "./launcher/launcher.js";
import { MenuBar } from "./menubar/menubar.js";
import { Notes } from "./notes/notes.js";
import { Preferences } from "./preferences/preferences.js";
import { Viewer } from "./viewer/viewer.js";
import { Welcome } from "./welcome/welcome.js";

vi.setConfig({ testTimeout: 20_000 });

const theme = platformTheme(lightTheme, "darwin");
let unmount = () => {};
afterEach(() => unmount());

const mount = (node: ReactNode) => {
  const root = createTestRoot({ width: 1100, height: 700 });
  root.render(<ThemeProvider theme={theme}>{node}</ThemeProvider>);
  root.renderer.flush();
  unmount = root.unmount;
  return root.renderer;
};

type Renderer = ReturnType<typeof mount>;

const press = (r: Renderer, testId: string) => {
  const element = r.findByTestId(testId);
  const b = element === undefined ? null : r.getElementBounds(element.id);
  expect(b, testId).not.toBeNull();
  r.nativeSimulateClick(b!.x + b!.width / 2, b!.y + b!.height / 2);
  r.flush();
};

const type = (r: Renderer, testId: string, text: string) => {
  r.focusElement(r.findByTestId(testId)?.id ?? -1);
  r.simulateKeystrokes(text.split("").join(" ").replace(/ {3}/g, " space "));
  r.flush();
};

const has = (r: Renderer, testId: string) =>
  r.findByTestId(testId) !== undefined;

describe("the Mac-app blocks", () => {
  it("notes: a row opens its note", () => {
    const r = mount(<Notes platform="darwin" />);
    press(r, "note-n3");
    expect(r.findByTestId("note-n3")?.style.backgroundColor).toBe(
      theme.colors.selected,
    );
  });

  it("preferences: a search narrows the panes", () => {
    const r = mount(<Preferences platform="darwin" />);
    expect(has(r, "source-storage")).toBe(true);
    type(r, "pane-search", "notif");
    expect(has(r, "source-notifications")).toBe(true);
    expect(has(r, "source-storage")).toBe(false);
  });

  it("launcher: a query filters the results", () => {
    const r = mount(<Launcher />);
    expect(has(r, "result-rules")).toBe(true);
    type(r, "launcher-query", "rel");
    expect(has(r, "result-releases")).toBe(true);
    expect(has(r, "result-rules")).toBe(false);
  });

  it("menu bar: a switch moves the status line", () => {
    const r = mount(<MenuBar />);
    expect(r.findByTestId("status")?.customProps?.["aria-label"]).toBe(
      "Watching 2 of 4",
    );
    press(r, "watch-auction");
    expect(r.findByTestId("status")?.customProps?.["aria-label"]).toBe(
      "Watching 3 of 4",
    );
  });

  it("agent: Send adds the prompt and a reply", () => {
    const r = mount(<Agent platform="darwin" />);
    expect(has(r, "turn-t3")).toBe(false);
    type(r, "composer", "go");
    press(r, "send");
    expect(has(r, "turn-t3")).toBe(true);
    expect(has(r, "turn-t4")).toBe(true);
    // The reply streams: Send is Stop until the last word lands.
    expect(has(r, "stop")).toBe(true);
    expect(has(r, "send")).toBe(false);
  });

  it("calendar: switching a calendar off hides its events", () => {
    const r = mount(<CalendarBlock platform="darwin" />);
    expect(has(r, "event-e3")).toBe(true);
    press(r, "calendar-arena");
    expect(has(r, "event-e3")).toBe(false);
    expect(has(r, "event-e1")).toBe(true);
  });

  it("welcome: Continue advances, and Import calls the app", () => {
    const onImport = vi.fn();
    const r = mount(<Welcome platform="darwin" onImport={onImport} />);
    press(r, "continue");
    press(r, "continue");
    press(r, "import");
    expect(onImport).toHaveBeenCalledOnce();
    expect(has(r, "step-3")).toBe(true);
    press(r, "continue");
    expect(has(r, "step-3")).toBe(true);
  });

  it("viewer: a thumbnail opens the photo under its HUD", () => {
    const r = mount(<Viewer platform="darwin" />);
    expect(has(r, "hud")).toBe(false);
    press(r, "photo-p2");
    expect(has(r, "open-photo"), "open").toBe(true);
    expect(has(r, "hud")).toBe(true);
    press(r, "close");
    expect(has(r, "hud")).toBe(false);
  });
});
