import { Tabs, TabsList, TabsTrigger } from "@gpuixui/components/tabs";
import {
  Button,
  Checkbox,
  Input,
  RadioGroup,
  Slider,
  Switch,
  ToggleGroup,
} from "@gpuixui/primitives";
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

const BEAT = (30 * 60) / 120;

const omarchyAt = (frame: number): OmarchyLook =>
  omarchyLooks[Math.min(3, Math.floor(frame / BEAT))] ?? "tokyo-night";

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

const macWindow = extendTheme(mac, { window: "opaque" });

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

const pressAt = (
  testId: string,
  frame: number,
  from: { x: number; y: number },
): ReadonlyArray<Waypoint> => [
  { frame: 0, aim: from },
  { frame: frame - 4, aim: { testId } },
  { frame, aim: { testId }, down: true },
  { frame: frame + 3, aim: { testId } },

  { frame: 74, aim: { x: from.x - 80, y: from.y - 60 } },
];

const typing = (
  text: string,
  frame: number,
  every = 2,
): NonNullable<Take["keys"]> =>
  [...text].map((char, i) => ({
    frame: frame + i * every,
    keys: char === " " ? "space" : char,
  }));

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

const closeUp = (
  k: number,
  child: ReactNode,
  pointer: ReadonlyArray<Waypoint>,
  keys: Take["keys"] = [],
): Take => ({
  width: 960,
  height: 540,
  frames: BEAT,
  view: () => stage(macro(k), child),
  pointer,
  keys,
});

const tap = (testId: string): ReadonlyArray<Waypoint> => [
  { frame: 0, aim: { testId, dx: 70, dy: 60 } },
  { frame: 4, aim: { testId } },
  { frame: 5, aim: { testId }, down: true },
  { frame: 7, aim: { testId } },
  { frame: 14, aim: { testId, dx: 16, dy: 24 } },
];

export const takes: Readonly<Record<string, Take>> = {
  "cu-switch": closeUp(8, <Switch testId="c" label="Wi-Fi" />, tap("c")),
  "cu-checkbox": closeUp(
    9,
    <Checkbox testId="c" label="Hunter License" />,
    tap("c"),
  ),
  "cu-slider": closeUp(
    6,
    <Slider
      testId="c"
      label="Aura"
      step={10}
      defaultValue={20}
      style={{ width: 760 }}
    />,
    [
      { frame: 0, aim: { testId: "c", dx: -220, dy: 80 } },
      { frame: 2, aim: { testId: "c", dx: -228, dy: 0 } },
      { frame: 3, aim: { testId: "c", dx: -228, dy: 0 }, down: true },
      { frame: 12, aim: { testId: "c", dx: 230, dy: 0 }, down: true },
      { frame: 13, aim: { testId: "c", dx: 230, dy: 0 } },
      { frame: 14, aim: { testId: "c", dx: 236, dy: 20 } },
    ],
  ),
  "cu-tabs": closeUp(
    5,
    <Tabs defaultValue="arena">
      <TabsList label="Venue">
        <TabsTrigger value="arena">Arena</TabsTrigger>
        <TabsTrigger value="island" testId="c">
          Island
        </TabsTrigger>
        <TabsTrigger value="exam">Exam</TabsTrigger>
      </TabsList>
    </Tabs>,
    tap("c"),
  ),
  "cu-toggle": closeUp(
    5,
    <ToggleGroup
      type="single"
      label="Range"
      defaultValue="day"
      options={[
        { value: "day", label: "Day" },
        { value: "week", label: "Week" },
        { value: "month", label: "Month" },
      ]}
      itemTestId={(value) => `c-${value}`}
    />,
    tap("c-month"),
  ),
  "cu-button": closeUp(
    6,
    <Button testId="c" variant="primary" size="lg">
      Deploy
    </Button>,
    tap("c"),
  ),
  "cu-radio": closeUp(
    6,
    <RadioGroup
      label="Nen type"
      defaultValue="enhancer"
      options={[
        { value: "enhancer", label: "Enhancer" },
        { value: "transmuter", label: "Transmuter" },
      ]}
      itemTestId={(value) => `c-${value}`}
    />,
    tap("c-transmuter"),
  ),
  "cu-input": closeUp(
    6,
    <Input testId="c" placeholder="Name" style={{ width: 520 }} />,
    [
      { frame: 0, aim: { testId: "c", dx: 120, dy: 60 } },
      { frame: 1, aim: { testId: "c" } },
      { frame: 2, aim: { testId: "c" }, down: true },
      { frame: 3, aim: { testId: "c" } },
      { frame: 14, aim: { testId: "c", dx: 60, dy: 40 } },
    ],
    [
      { frame: 5, keys: "g" },
      { frame: 7, keys: "o" },
      { frame: 9, keys: "n" },
    ],
  ),
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
      { frame: 1, aim: { testId: "composer" } },
      { frame: 3, aim: { testId: "composer" }, down: true },
      { frame: 4, aim: { testId: "composer" } },
      { frame: 40, aim: { testId: "send" } },
      { frame: 45, aim: { testId: "send" }, down: true },
      { frame: 48, aim: { testId: "send" } },
      { frame: 74, aim: { testId: "send", dx: 20, dy: -40 } },
    ],
    typing("add a retry test", 6, 1),
  ),
  "desktop-luna": desktop("luna"),
  "desktop-aero": desktop("aero"),

  switch: {
    width: 960,
    height: 540,
    frames: 70,
    view: () => stage(macro(8), <Switch testId="switch" label="Wi-Fi" />),

    pointer: [
      { frame: 0, aim: { testId: "switch", dx: 150, dy: 120 } },
      { frame: 30, aim: { testId: "switch", dx: -40, dy: 10 } },
      { frame: 35, aim: { testId: "switch", dx: -40, dy: 10 }, down: true },
      { frame: 39, aim: { testId: "switch", dx: -40, dy: 10 } },
      { frame: 69, aim: { testId: "switch", dx: -20, dy: 40 } },
    ],
  },

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

  settings: {
    width: 1024,
    height: 576,
    frames: 4 * BEAT,
    view: () => <SettingsWindow />,
    pointer: [
      { frame: 0, aim: { testId: "look-win32", dx: 60, dy: 50 } },
      { frame: 12, aim: { testId: "look-win32" } },
      { frame: 15, aim: { testId: "look-win32" }, down: true },
      { frame: 18, aim: { testId: "look-win32" } },
      { frame: 27, aim: { testId: "look-linux" } },
      { frame: 30, aim: { testId: "look-linux" }, down: true },
      { frame: 33, aim: { testId: "look-linux" } },
      { frame: 42, aim: { testId: "dark" } },
      { frame: 45, aim: { testId: "dark" }, down: true },
      { frame: 48, aim: { testId: "dark" } },
      { frame: 59, aim: { testId: "dark", dx: 30, dy: 40 } },
    ],
  },

  omarchy: {
    width: 1280,
    height: 720,
    frames: 4 * BEAT,
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
