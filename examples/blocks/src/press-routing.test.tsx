/** @jsxImportSource @gpuix/react */
/**
 * No painted or positioned part swallows a press meant for its control
 * (plan 731).
 *
 * The runtime's rule (`@gpuix/native` 0.11.0 `host.d.ts`): an element with no
 * `pointerEvents` blocks a press when it paints a fill or is positioned. So an
 * avatar disc in a list row, a colour chip in a trigger, a chevron in an
 * accordion header or a card under a press wrapper takes the press, and the
 * row, trigger or header never hears it. The audit that found 46 such parts
 * across the blocks and the examples is this test: it mounts every block and
 * every component and effect example, and lists any descendant of a pressable
 * element that would block without handling the press itself.
 */
import { createTestRoot } from "@gpuix/react/testing";
import { examples as componentExamples } from "@gpuixui/components/examples";
import { examples as fxExamples } from "@gpuixui/fx/examples";
import { darkTheme, lightTheme, platformTheme } from "@gpuixui/tokens";
import { ThemeProvider } from "@gpuixui/tokens/react";
import type { ComponentType } from "react";
import { describe, expect, it, vi } from "vitest";
import { Agent } from "./agent/agent.js";
import { CalendarBlock } from "./calendar/calendar.js";
import { Inbox } from "./inbox/inbox.js";
import { Kanban } from "./kanban/kanban.js";
import { Launcher } from "./launcher/launcher.js";
import { License } from "./license/license.js";
import { MenuBar } from "./menubar/menubar.js";
import { MacosDesktop } from "./macos/macos.js";
import { Editor } from "./editor/editor.js";
import { Podcast } from "./podcast/podcast.js";
import { Monitor } from "./monitor/monitor.js";
import { Notes } from "./notes/notes.js";
import { Dashboard } from "./dashboard/dashboard.js";
import { Pipeline } from "./pipeline/pipeline.js";
import { Preferences } from "./preferences/preferences.js";
import { Viewer } from "./viewer/viewer.js";
import { Welcome } from "./welcome/welcome.js";

vi.setConfig({ testTimeout: 120_000 });

const screens: Readonly<Record<string, ComponentType>> = {
  ...componentExamples,
  ...fxExamples,
  "block:agent": Agent,
  "block:calendar": CalendarBlock,
  "block:inbox": Inbox,
  "block:kanban": Kanban,
  "block:launcher": () => <Launcher />,
  "block:license": License,
  "block:menubar": MenuBar,
  "block:macos": MacosDesktop,
  "block:editor": Editor,
  "block:podcast": Podcast,
  "block:monitor": Monitor,
  "block:notes": Notes,
  "block:dashboard": Dashboard,
  "block:pipeline": Pipeline,
  "block:preferences": Preferences,
  "block:viewer": Viewer,
  "block:welcome": () => <Welcome />,
};

interface Element {
  readonly id: number;
  readonly type: string;
  readonly style?: Readonly<Record<string, unknown>>;
  readonly events?: ReadonlySet<string>;
  readonly children?: ReadonlyArray<number>;
  readonly parentId?: number | null;
  readonly testId?: string | null;
}

const PRESS = ["click", "mouseDown", "mouseUp"];
const handlesPress = (e: Element) =>
  PRESS.some((p) => e.events?.has(p) === true);
const blocksPress = (e: Element) => {
  const style = e.style ?? {};
  if (style["pointerEvents"] === "none") return false;
  const fill = style["backgroundColor"];
  const painted =
    typeof fill === "string" && !/^(transparent|#0{8}|#0{4})$/i.test(fill);
  return painted || style["position"] === "absolute";
};

/** Every swallowing part one screen paints, in both a macOS and a dark theme. */
const swallowers = (
  name: string,
  Screen: ComponentType,
): ReadonlyArray<string> =>
  [platformTheme(lightTheme, "darwin"), darkTheme].flatMap((theme) => {
    const root = createTestRoot({ width: 1280, height: 800 });
    root.render(
      <ThemeProvider theme={theme}>
        <Screen />
      </ThemeProvider>,
    );
    root.renderer.flush();
    const r = root.renderer as unknown as {
      getElement: (id: number) => Element | undefined;
      getElementBounds: (
        id: number,
      ) => { width: number; height: number } | null;
      findByType: (type: string) => ReadonlyArray<Element>;
    };
    const found: string[] = [];
    const walk = (id: number, pressable: Element | undefined): void => {
      const e = r.getElement(id);
      if (e === undefined) return;
      if (pressable !== undefined && !handlesPress(e) && blocksPress(e)) {
        const box = r.getElementBounds(e.id);
        if (box !== null && box.width > 0 && box.height > 0) {
          found.push(
            `${name}: ${e.type}${e.testId ? `#${e.testId}` : ""} inside ${pressable.testId ?? pressable.type}`,
          );
        }
      }
      for (const child of e.children ?? [])
        walk(child, handlesPress(e) ? e : pressable);
    };
    for (const top of r.findByType("div").filter((e) => e.parentId == null)) {
      walk(top.id, undefined);
    }
    root.unmount();
    return found;
  });

describe("press routing", () => {
  it("lets every press reach its control, in every block and example", () => {
    const all = Object.entries(screens).flatMap(([name, Screen]) =>
      swallowers(name, Screen),
    );
    expect([...new Set(all)]).toEqual([]);
  });
});
