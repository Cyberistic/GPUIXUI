/**
 * The launch film's takes (plan 060), one per shot that shows GPUIxUI. Each is
 * a real tree under real input; `take.ts` captures it.
 *
 *   nub apps/playground/dist/film/takes.js <take> <outDir>
 */
import { Button, Slider, Switch } from "@gpuixui/primitives";
import {
  darkTheme,
  lightTheme,
  platformTheme,
  type Theme,
} from "@gpuixui/tokens";
import { ThemeProvider } from "@gpuixui/tokens/react";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as R from "effect/Record";
import { mkdirSync } from "node:fs";
import { useState, type ReactNode } from "react";
import { Settings, type Look } from "../blocks/settings.js";
import { GROUND, Window } from "./frame.js";
import { OmarchyDesktop, type OmarchyLook } from "./omarchy.js";
import { magnify } from "./magnify.js";
import { capture, type Take } from "./take.js";

const mac = platformTheme(lightTheme, "darwin");

/** A 960×540 stage (1920×1080 captured) holding one control, centred. */
const stage = (theme: Theme, child: ReactNode) => (
  <ThemeProvider theme={theme}>
    <div
      style={{
        width: 960,
        height: 540,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.colors.background,
      }}
    >
      {child}
    </div>
  </ThemeProvider>
);

const macro = (k: number) => magnify(mac, k);

/** Shot 7's theme changes, by frame: each a new `colors.toml` on the desktop. */
const omarchyAt = (frame: number): OmarchyLook =>
  frame < 40 ? "tokyo-night" : frame < 72 ? "catppuccin" : frame < 100 ? "kanagawa" : "rose-pine";

/** The Settings block in its window, restyled by its own Look control. */
const SettingsWindow = () => {
  const [look, setLook] = useState<Look>("darwin");
  const [dark, setDark] = useState(false);
  const theme = platformTheme(dark ? darkTheme : lightTheme, look);
  return (
    <div
      style={{
        width: 1024,
        height: 576,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: GROUND,
      }}
    >
      <Window
        theme={theme}
        platform={look}
        title="Settings"
        width={880}
        height={470}
      >
        <Settings
          look={look}
          onLookChange={setLook}
          dark={dark}
          onDarkChange={setDark}
        />
      </Window>
    </div>
  );
};

export const takes: Readonly<Record<string, Take>> = {
  /** Shot 1: the first press. Down at 0.70 s, up at 0.83 s. */
  switch: {
    width: 960,
    height: 540,
    frames: 72,
    view: () => stage(macro(8), <Switch testId="switch" label="Wi-Fi" />),
    pointer: [
      { frame: 0, aim: { testId: "switch", dx: 150, dy: 120 } },
      { frame: 18, aim: { testId: "switch", dx: -40, dy: 10 } },
      { frame: 21, aim: { testId: "switch", dx: -40, dy: 10 }, down: true },
      { frame: 25, aim: { testId: "switch", dx: -40, dy: 10 } },
      { frame: 71, aim: { testId: "switch", dx: -20, dy: 40 } },
    ],
  },
  /** Shot 2: a drag across ten detents, 0 → 80. */
  slider: {
    width: 960,
    height: 540,
    frames: 66,
    view: () =>
      stage(
        macro(6),
        <Slider
          testId="slider"
          label="Volume"
          step={10}
          defaultValue={0}
          style={{ width: 760 }}
        />,
      ),
    pointer: [
      { frame: 0, aim: { testId: "slider", dx: -330, dy: 110 } },
      { frame: 8, aim: { testId: "slider", dx: -366, dy: 0 } },
      { frame: 10, aim: { testId: "slider", dx: -366, dy: 0 }, down: true },
      { frame: 52, aim: { testId: "slider", dx: 226, dy: 0 }, down: true },
      { frame: 54, aim: { testId: "slider", dx: 226, dy: 0 } },
      { frame: 65, aim: { testId: "slider", dx: 240, dy: 60 } },
    ],
  },
  /** Shot 3: one primary press. Down at 0.6 s, up at 0.9 s. */
  button: {
    width: 960,
    height: 540,
    frames: 54,
    view: () =>
      stage(
        macro(6),
        <Button testId="save" variant="primary" size="lg">
          Save changes
        </Button>,
      ),
    pointer: [
      { frame: 0, aim: { testId: "save", dx: 260, dy: 160 } },
      { frame: 15, aim: { testId: "save", dx: 60, dy: 20 } },
      { frame: 18, aim: { testId: "save", dx: 60, dy: 20 }, down: true },
      { frame: 27, aim: { testId: "save", dx: 60, dy: 20 } },
      { frame: 53, aim: { testId: "save", dx: 80, dy: 50 } },
    ],
  },
  /** Shots 4–5: the pull-back to the block, then Windows (10.8 s) and Linux (12.4 s). */
  settings: {
    width: 1024,
    height: 576,
    frames: 228,
    view: () => <SettingsWindow />,
    pointer: [
      { frame: 0, aim: { testId: "save", dx: 12, dy: 6 } },
      { frame: 36, aim: { testId: "save", dx: 12, dy: 6 } },
      { frame: 64, aim: { testId: "sounds" } },
      { frame: 66, aim: { testId: "sounds" }, down: true },
      { frame: 69, aim: { testId: "sounds" } },
      { frame: 92, aim: { testId: "sounds" } },
      { frame: 94, aim: { testId: "sounds" }, down: true },
      { frame: 97, aim: { testId: "sounds" } },
      { frame: 128, aim: { testId: "look-win32" } },
      { frame: 132, aim: { testId: "look-win32" }, down: true },
      { frame: 135, aim: { testId: "look-win32" } },
      { frame: 176, aim: { testId: "look-linux" } },
      { frame: 180, aim: { testId: "look-linux" }, down: true },
      { frame: 183, aim: { testId: "look-linux" } },
      { frame: 227, aim: { testId: "look-linux", dx: 30, dy: 40 } },
    ],
  },
  /** Shots 7–8: four Omarchy themes, then a card dragged to Done. */
  omarchy: {
    width: 1280,
    height: 720,
    frames: 270,
    view: (frame) => <OmarchyDesktop look={omarchyAt(frame)} />,
    pointer: [
      { frame: 0, aim: { x: 1180, y: 660 } },
      { frame: 110, aim: { x: 1180, y: 660 } },
      { frame: 140, aim: { testId: "task-theme", dx: -40 } },
      { frame: 146, aim: { testId: "task-theme", dx: -40 }, down: true },
      { frame: 190, aim: { testId: "column-Done", dy: 40 }, down: true },
      { frame: 196, aim: { testId: "column-Done", dy: 40 } },
      { frame: 269, aim: { testId: "column-Done", dx: 40, dy: 120 } },
    ],
  },
};

const [, , name = "", outDir = ""] = process.argv;
Effect.runSync(
  Option.match(R.get(takes, name), {
    onNone: () =>
      Effect.logError(
        `unknown take "${name}"; one of ${R.keys(takes).join(", ")}`,
      ),
    onSome: (take) =>
      Effect.sync(() => {
        mkdirSync(outDir, { recursive: true });
        return capture(take, outDir).length;
      }).pipe(
        Effect.flatMap((moves) =>
          Effect.logInfo(
            `${name}: ${take.frames} frames, ${moves} pointer samples → ${outDir}`,
          ),
        ),
      ),
  }),
);
