import { createTestRoot } from "@gpuix/react/testing";
import { extendTheme, lightTheme, platformTheme } from "@gpuixui/tokens";
import { ThemeProvider } from "@gpuixui/tokens/react";
import { Effect } from "effect";
import { mkdirSync } from "node:fs";
import type { ReactNode } from "react";
import { CalendarBlock } from "./calendar/calendar.js";
import { Launcher } from "./launcher/launcher.js";
import { Pipeline } from "./pipeline/pipeline.js";
import { Preferences } from "./preferences/preferences.js";
import { Viewer } from "./viewer/viewer.js";

type Step =
  | { readonly press: string; readonly hold: number }
  | { readonly type: string; readonly into: string; readonly hold: number }
  | { readonly key: string; readonly hold: number };

const clips: Readonly<
  Record<
    string,
    { readonly view: ReactNode; readonly steps: ReadonlyArray<Step> }
  >
> = {
  launcher: {
    view: <Launcher />,
    steps: [
      { press: "launcher-query", hold: 10 },
      { type: "r e l", into: "launcher-query", hold: 18 },
      { key: "down", hold: 14 },
    ],
  },
  pipeline: {
    view: <Pipeline platform="darwin" />,
    steps: [
      { press: "segment-Idea", hold: 12 },
      { press: "segment-Review", hold: 12 },
      { press: "work-w7", hold: 14 },
      { press: "segment-board", hold: 18 },
    ],
  },
  viewer: {
    view: <Viewer platform="darwin" />,
    steps: [
      { press: "photo-p2", hold: 14 },
      { key: "right", hold: 12 },
      { key: "right", hold: 12 },
      { press: "close", hold: 12 },
    ],
  },
  calendar: {
    view: <CalendarBlock platform="darwin" />,
    steps: [
      { press: "calendar-arena", hold: 14 },
      { press: "calendar-arena", hold: 12 },
      { press: "next", hold: 14 },
    ],
  },
  preferences: {
    view: <Preferences platform="darwin" />,
    steps: [
      { type: "n o t", into: "pane-search", hold: 20 },
      { press: "previews", hold: 14 },
    ],
  },
};

const [name = "", outDir = ""] = process.argv.slice(2);
const clip = clips[name];

const program =
  clip === undefined || outDir === ""
    ? Effect.logError(
        `usage: clip <${Object.keys(clips).join("|")}> <outDir>`,
      ).pipe(Effect.as(2))
    : Effect.sync(() => {
        mkdirSync(outDir, { recursive: true });
        const theme = extendTheme(platformTheme(lightTheme, "darwin"), {
          window: "opaque",
        });
        const root = createTestRoot({ width: 1100, height: 700 });
        root.render(<ThemeProvider theme={theme}>{clip.view}</ThemeProvider>);
        const r = root.renderer;
        const settle = () => {
          r.dispatchNativeEvents();
          r.clockFastForward(1_000);
          r.flush();
        };
        let frame = 0;
        const hold = (count: number) => {
          for (let i = 0; i < count; i += 1) {
            r.captureScreenshot(
              `${outDir}/${String(frame).padStart(4, "0")}.png`,
            );
            frame += 1;
          }
        };
        const element = (testId: string) => r.findByTestId(testId);
        settle();
        hold(12);
        for (const step of clip.steps) {
          if ("press" in step) {
            const b = r.getElementBounds(element(step.press)?.id ?? -1);
            if (b !== null)
              r.nativeSimulateClick(b.x + b.width / 2, b.y + b.height / 2);
          } else if ("type" in step) {
            r.focusElement(element(step.into)?.id ?? -1);
            r.simulateKeystrokes(step.type);
          } else {
            const focused = r.getFocusedElementId();
            if (focused !== null) r.nativeSimulateKeyDown(focused, step.key);
          }
          settle();
          hold(step.hold);
        }
        root.unmount();
        return 0;
      });

process.exitCode = await Effect.runPromise(program);
