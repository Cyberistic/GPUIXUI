/**
 * The launch film's takes (plan 060), one per shot that shows GPUIxUI. Each is
 * a real tree under real input; `take.ts` captures it.
 *
 *   nub apps/playground/dist/film/takes.js <take> <outDir>
 */
import { Button, Slider, Switch } from "@gpuixui/primitives";
import {
  darkTheme,
  extendTheme,
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
import { Settings, type Look } from "@gpuixui/blocks/settings";
import { GROUND, Lights, Window } from "./frame.js";
import { OmarchyDesktop, omarchyLooks, type OmarchyLook } from "./omarchy.js";
import { Agent } from "@gpuixui/blocks/agent";
import { CalendarBlock } from "@gpuixui/blocks/calendar";
import { DesktopBlock, type DesktopLook } from "@gpuixui/blocks/desktop";
import { Launcher } from "@gpuixui/blocks/launcher";
import { Notes } from "@gpuixui/blocks/notes";
import { Pipeline } from "@gpuixui/blocks/pipeline";
import { Stats } from "@gpuixui/blocks/stats";
import { Viewer } from "@gpuixui/blocks/viewer";
import { Welcome } from "@gpuixui/blocks/welcome";
import { magnify } from "./magnify.js";
import { capture, type Take, type Waypoint } from "./take.js";

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

/** A beat of the score (104 BPM) in frames. */
const BEAT = (30 * 60) / 104;

/** The Omarchy shot's theme, one new `colors.toml` per beat. */
const omarchyAt = (frame: number): OmarchyLook =>
  omarchyLooks[Math.min(3, Math.floor(frame / BEAT))] ?? "tokyo-night";

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

/** The macOS look with an opaque window: what the offscreen renderer can paint
 * of a vibrant one (the blur is the window server's). */
const macWindow = extendTheme(mac, { window: "opaque" });

/** A Mac-app block, 1100×700, with the lights the OS would draw over it. */
const macApp = (
  view: ReactNode,
  pointer: ReadonlyArray<Waypoint>,
  keys: Take["keys"] = [],
  lights = true,
): Take => ({
  width: 1100,
  height: 700,
  frames: 75,
  view: () => (
    <ThemeProvider theme={macWindow}>
      <div style={{ width: 1100, height: 700, display: "flex" }}>
        {view}
        {lights ? <Lights /> : null}
      </div>
    </ThemeProvider>
  ),
  pointer,
  keys,
});

/** A press on `testId` at `frame`, arriving from `from` and settling near it. */
const pressAt = (
  testId: string,
  frame: number,
  from: { x: number; y: number },
): ReadonlyArray<Waypoint> => [
  { frame: 0, aim: from },
  { frame: frame - 4, aim: { testId } },
  { frame, aim: { testId }, down: true },
  { frame: frame + 3, aim: { testId } },
  // At rest on a fixed point: the press may remove its own target (a photo opens).
  { frame: 74, aim: { x: from.x - 80, y: from.y - 60 } },
];

/** `text` typed one character every two frames from `frame`. */
const typing = (text: string, frame: number): NonNullable<Take["keys"]> =>
  [...text].map((char, i) => ({
    frame: frame + i * 2,
    keys: char === " " ? "space" : char,
  }));

/** The desktop block: Start pressed at frame 24, a window raised at 60. */
const desktop = (look: DesktopLook): Take => ({
  width: 1280,
  height: 800,
  frames: 90,
  view: () => <DesktopBlock look={look} />,
  pointer: [
    { frame: 0, aim: { x: 700, y: 640 } },
    { frame: 20, aim: { testId: "start" } },
    { frame: 24, aim: { testId: "start" }, down: true },
    { frame: 26, aim: { testId: "start" } },
    { frame: 54, aim: { testId: "task-explorer" } },
    { frame: 60, aim: { testId: "task-explorer" }, down: true },
    { frame: 62, aim: { testId: "task-explorer" } },
    { frame: 89, aim: { testId: "task-explorer", dy: -120 } },
  ],
});

export const takes: Readonly<Record<string, Take>> = {
  pipeline: macApp(
    <Pipeline platform="darwin" />,
    pressAt("work-w1", 30, { x: 900, y: 600 }),
  ),
  notes: macApp(
    <Notes platform="darwin" />,
    pressAt("note-n3", 30, { x: 700, y: 600 }),
  ),
  calendar: macApp(
    <CalendarBlock platform="darwin" />,
    pressAt("next", 30, { x: 800, y: 500 }),
  ),
  viewer: macApp(
    <Viewer platform="darwin" />,
    pressAt("photo-p2", 30, { x: 900, y: 600 }),
  ),
  welcome: macApp(
    <Welcome platform="darwin" />,
    pressAt("continue", 34, { x: 800, y: 620 }),
  ),
  stats: macApp(
    <Window
      theme={macWindow}
      platform="darwin"
      title="Heavens Arena"
      width={1100}
      height={700}
    >
      <Stats />
    </Window>,
    pressAt("range-month", 30, { x: 800, y: 300 }),
    [],
    false,
  ),
  launcher: macApp(
    <Launcher />,
    pressAt("launcher-query", 8, { x: 760, y: 400 }),
    typing("hunter", 16),
    false,
  ),
  agent: macApp(
    <Agent platform="darwin" />,
    [
      { frame: 0, aim: { x: 700, y: 600 } },
      { frame: 8, aim: { testId: "composer" } },
      { frame: 10, aim: { testId: "composer" }, down: true },
      { frame: 12, aim: { testId: "composer" } },
      { frame: 50, aim: { testId: "send" } },
      { frame: 54, aim: { testId: "send" }, down: true },
      { frame: 57, aim: { testId: "send" } },
      { frame: 74, aim: { testId: "send", dx: 20, dy: -40 } },
    ],
    typing("add a retry test", 16),
  ),
  "desktop-luna": desktop("luna"),
  "desktop-aero": desktop("aero"),
  /** Shot 1: the first press. Down at 0.70 s, up at 0.83 s. */
  switch: {
    width: 960,
    height: 540,
    frames: 70,
    view: () => stage(macro(8), <Switch testId="switch" label="Wi-Fi" />),
    // Pressed on the intro's second tap (beat 2 of bar 0, frame 35).
    pointer: [
      { frame: 0, aim: { testId: "switch", dx: 150, dy: 120 } },
      { frame: 30, aim: { testId: "switch", dx: -40, dy: 10 } },
      { frame: 35, aim: { testId: "switch", dx: -40, dy: 10 }, down: true },
      { frame: 39, aim: { testId: "switch", dx: -40, dy: 10 } },
      { frame: 69, aim: { testId: "switch", dx: -20, dy: 40 } },
    ],
  },
  /** Shot 2: a drag across ten detents, 0 → 80. */
  slider: {
    width: 960,
    height: 540,
    frames: 70,
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
      { frame: 3, aim: { testId: "slider", dx: -366, dy: 0 } },
      { frame: 5, aim: { testId: "slider", dx: -366, dy: 0 }, down: true },
      { frame: 56, aim: { testId: "slider", dx: 226, dy: 0 }, down: true },
      { frame: 58, aim: { testId: "slider", dx: 226, dy: 0 } },
      { frame: 69, aim: { testId: "slider", dx: 240, dy: 60 } },
    ],
  },
  /** Shot 3: one primary press. Down at 0.6 s, up at 0.9 s. */
  button: {
    width: 960,
    height: 540,
    frames: 44,
    view: () =>
      stage(
        macro(6),
        <Button testId="save" variant="primary" size="lg">
          Save changes
        </Button>,
      ),
    pointer: [
      { frame: 0, aim: { testId: "save", dx: 260, dy: 160 } },
      { frame: 13, aim: { testId: "save", dx: 60, dy: 20 } },
      { frame: 17, aim: { testId: "save", dx: 60, dy: 20 }, down: true },
      { frame: 24, aim: { testId: "save", dx: 60, dy: 20 } },
      { frame: 43, aim: { testId: "save", dx: 80, dy: 50 } },
    ],
  },
  /** Shots 4–5: the pull-back to the block, then Windows (10.8 s) and Linux (12.4 s). */
  settings: {
    width: 1024,
    height: 576,
    frames: 234,
    view: () => <SettingsWindow />,
    pointer: [
      { frame: 0, aim: { testId: "save", dx: 12, dy: 6 } },
      { frame: 28, aim: { testId: "save", dx: 12, dy: 6 } },
      { frame: 40, aim: { testId: "sounds" } },
      { frame: 43, aim: { testId: "sounds" }, down: true },
      { frame: 46, aim: { testId: "sounds" } },
      { frame: 88, aim: { testId: "look-win32" } },
      { frame: 95, aim: { testId: "look-win32" }, down: true },
      { frame: 98, aim: { testId: "look-win32" } },
      { frame: 156, aim: { testId: "look-linux" } },
      { frame: 164, aim: { testId: "look-linux" }, down: true },
      { frame: 167, aim: { testId: "look-linux" } },
      { frame: 233, aim: { testId: "look-linux", dx: 30, dy: 40 } },
    ],
  },
  /** Shots 7–8: four Omarchy themes, then a card dragged to Done. */
  omarchy: {
    width: 1280,
    height: 720,
    frames: 70,
    view: (frame) => <OmarchyDesktop look={omarchyAt(frame)} />,
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
