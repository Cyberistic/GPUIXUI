/**
 * The launch film's takes (plan 060), one per shot that shows GPUIxUI. Each is
 * a real tree under real input; `take.ts` captures it.
 *
 *   nub apps/playground/dist/film/takes.js <take> <outDir>
 */
import { Tabs, TabsList, TabsTrigger } from "@gpuixui/components/tabs";
import { Card } from "@gpuixui/components/card";
import {
  Button,
  Checkbox,
  Input,
  RadioGroup,
  Slider,
  Stack,
  Switch,
  Text,
  ToggleGroup,
} from "@gpuixui/primitives";
import {
  darkTheme,
  extendTheme,
  lightTheme,
  platformTheme,
  type PlatformName,
  type Theme,
} from "@gpuixui/tokens";
import { ThemeProvider } from "@gpuixui/tokens/react";
import * as Arr from "effect/Array";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as R from "effect/Record";
import { mkdirSync } from "node:fs";
import { useState, type ReactNode } from "react";
import { Settings, type Look } from "@gpuixui/blocks/settings";
import { GROUND, Lights, Window } from "./frame.js";
import { TilingDesktop } from "@gpuixui/blocks/tiling";
import { Agent } from "@gpuixui/blocks/agent";
import { CalendarBlock } from "@gpuixui/blocks/calendar";
import { DesktopBlock, type DesktopLook } from "@gpuixui/blocks/desktop";
import { Launcher } from "@gpuixui/blocks/launcher";
import { Notes } from "@gpuixui/blocks/notes";
import { Pipeline } from "@gpuixui/blocks/pipeline";
import { Stats } from "@gpuixui/blocks/stats";
import { Viewer } from "@gpuixui/blocks/viewer";
import { Welcome } from "@gpuixui/blocks/welcome";
import { CalculatorApp } from "@gpuixui/slang/app";
import { Console } from "@gpuixui/blocks/console";
import { MacosDesktop } from "@gpuixui/blocks/macos";
import { Editor } from "@gpuixui/blocks/editor";
import { Music } from "@gpuixui/blocks/music";
import { Monitor } from "@gpuixui/blocks/monitor";
import { Inbox } from "@gpuixui/blocks/inbox";
import { Kanban } from "@gpuixui/blocks/kanban";
import { License } from "@gpuixui/blocks/license";
import { Preferences } from "@gpuixui/blocks/preferences";
import { MenuBar } from "@gpuixui/blocks/menubar";
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
        backgroundColor: GROUND,
      }}
    >
      {child}
    </div>
  </ThemeProvider>
);

/** A beat of the score (120 BPM) in frames: 15. */
const BEAT = (30 * 60) / 120;

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

/**
 * The Settings block alone at the terminal's own 1024×576 and darwin theme: the
 * app area of the terminal, painted by the window renderer. The terminal platform
 * coalesces its paints to one commit per take (see `terminal-take.ts`), so a take
 * recorded through it can only show a single state; this one paints every frame,
 * which is what lets the film show look → dark → look inside the terminal.
 */
const TerminalSettings = () => {
  const [look, setLook] = useState<Look>("darwin");
  const [dark, setDark] = useState(false);
  return (
    <ThemeProvider
      theme={platformTheme(dark ? darkTheme : lightTheme, "darwin")}
    >
      <div style={{ width: 1024, height: 576, display: "flex" }}>
        <Settings
          look={look}
          onLookChange={setLook}
          dark={dark}
          onDarkChange={setDark}
        />
      </div>
    </ThemeProvider>
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

/** A wallpaper the film ships; the desktop blocks paint it instead of their ground. */
const wallpaper = (name: string): string =>
  new URL(
    `../../../../media/launch/assets/wallpaper/${name}.jpg`,
    import.meta.url,
  ).pathname;

/** The theme a floating Mac-style window wears on a desktop. */
const desktopWindow = (look: PlatformName): Theme =>
  extendTheme(platformTheme(lightTheme, look), { window: "opaque" });

/** The chat block over a desktop, for the three-OS flip. */
const chatOn = (look: PlatformName, desktop: ReactNode): Take => ({
  width: 1280,
  height: 800,
  frames: 30,
  view: () => (
    <div
      style={{
        position: "relative",
        width: 1280,
        height: 800,
        display: "flex",
      }}
    >
      {desktop}
      <div
        style={{
          position: "absolute",
          left: 250,
          top: 66,
          width: 780,
          height: 600,
        }}
      >
        <ThemeProvider theme={desktopWindow(look)}>
          <Agent platform={look} />
        </ThemeProvider>
      </div>
    </div>
  ),
  pointer: [{ frame: 0, aim: { x: 900, y: 700 } }],
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

/** `text` typed one character every `every` frames from `frame`. */
const typing = (
  text: string,
  frame: number,
  every = 2,
): NonNullable<Take["keys"]> =>
  [...text].map((char, i) => ({
    frame: frame + i * every,
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

/**
 * A close-up: one control in its card on the film's ground, at 1× for two
 * seconds. The composition's camera pushes in (captures are 2×, so up to 2× is
 * lossless); the recipes' fixed metrics never meet a scaled theme.
 */
const closeUp = (
  child: ReactNode,
  pointer: ReadonlyArray<Waypoint>,
  width = 420,
  keys: Take["keys"] = [],
): Take => ({
  width: 960,
  height: 540,
  frames: 60,
  view: () =>
    stage(
      mac,
      <Card variant="outline" style={{ padding: 24, width }}>
        <div style={{ display: "flex", flexDirection: "column" }}>{child}</div>
      </Card>,
    ),
  pointer,
  keys,
});

/**
 * The switch at 4× its shipped metrics. A camera crop would upscale the 2×
 * capture and soften the knob; the same primitive drawn larger keeps every
 * pixel the renderer has, which is what a macro shot wants.
 */
const macroSwitch = extendTheme(mac, {
  switchMetrics: { width: 152, height: 88, knob: 80, inset: 4, border: 0 },
});

/** A control alone on the paper: no card, no label — the film's opening. */
const solo = (
  child: ReactNode,
  pointer: ReadonlyArray<Waypoint>,
  theme: Theme = mac,
): Take => ({
  width: 960,
  height: 540,
  frames: 60,
  view: () => stage(theme, child),
  pointer,
});

/** The pointer arrives, presses `testId` at 0.8 s, and stays on it. */
const tap = (testId: string): ReadonlyArray<Waypoint> => [
  { frame: 0, aim: { testId, dx: 140, dy: 110 } },
  { frame: 20, aim: { testId } },
  { frame: 24, aim: { testId }, down: true },
  { frame: 27, aim: { testId } },
  { frame: 59, aim: { testId } },
];

export const takes: Readonly<Record<string, Take>> = {
  "cu-switch-solo": solo(
    <Switch testId="c" label="Wi-Fi" />,
    tap("c"),
    macroSwitch,
  ),
  "cu-switch": closeUp(
    <Stack direction="row" align="center" justify="between">
      <Stack direction="column">
        <Text role="label">Wi-Fi</Text>
        <Text role="caption" tone="muted">
          Whale Island
        </Text>
      </Stack>
      <Switch testId="c" label="Wi-Fi" />
    </Stack>,
    tap("c"),
    300,
  ),
  "cu-tabs": closeUp(
    <Stack direction="row" align="center" justify="between">
      <Text role="label">Venue</Text>
      <Tabs defaultValue="arena">
        <TabsList label="Venue">
          <TabsTrigger value="arena">Arena</TabsTrigger>
          <TabsTrigger value="island" testId="c">
            Island
          </TabsTrigger>
          <TabsTrigger value="exam">Exam</TabsTrigger>
        </TabsList>
      </Tabs>
    </Stack>,
    tap("c"),
  ),
  "cu-checkbox": closeUp(
    <Stack direction="row" align="center" gap="sm">
      <Checkbox testId="c" label="Hunter License" />
      <Text role="label">Hunter License</Text>
    </Stack>,
    tap("c"),
    300,
  ),
  "cu-toggle": closeUp(
    <Stack direction="row" align="center" justify="between">
      <Text role="label">Range</Text>
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
      />
    </Stack>,
    tap("c-month"),
  ),
  "cu-button": closeUp(
    <Stack direction="row" align="center" justify="between">
      <Stack direction="column">
        <Text role="label">Greed Island</Text>
        <Text role="caption" tone="muted">
          Ready to deploy
        </Text>
      </Stack>
      <Button testId="c" variant="primary">
        Deploy
      </Button>
    </Stack>,
    tap("c"),
  ),
  "cu-radio": closeUp(
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
    300,
  ),
  "cu-input": closeUp(
    <Input testId="c" placeholder="Hunter name" />,
    [
      { frame: 0, aim: { testId: "c", dx: 140, dy: 90 } },
      { frame: 16, aim: { testId: "c" } },
      { frame: 20, aim: { testId: "c" }, down: true },
      { frame: 23, aim: { testId: "c" } },
      { frame: 59, aim: { testId: "c", dx: 60, dy: 40 } },
    ],
    360,
    [
      { frame: 26, keys: "g" },
      { frame: 29, keys: "o" },
      { frame: 32, keys: "n" },
    ],
  ),
  "cu-slider": closeUp(
    <Stack direction="column" gap="sm">
      <Text role="label">Aura</Text>
      <Slider
        testId="c"
        label="Aura"
        step={10}
        defaultValue={20}
        style={{ width: 372 }}
      />
    </Stack>,
    [
      { frame: 0, aim: { testId: "c", dx: -60, dy: 90 } },
      { frame: 16, aim: { testId: "c", dx: -108, dy: 0 } },
      { frame: 20, aim: { testId: "c", dx: -108, dy: 0 }, down: true },
      { frame: 44, aim: { testId: "c", dx: 108, dy: 0 }, down: true },
      { frame: 47, aim: { testId: "c", dx: 108, dy: 0 } },
      { frame: 59, aim: { testId: "c", dx: 108, dy: 0 } },
    ],
  ),

  /** The console at the terminal's own 1024×576, in the terminal's theme. */
  "console-term": {
    width: 1024,
    height: 576,
    frames: 90,
    view: () => (
      <ThemeProvider theme={platformTheme(lightTheme, "darwin")}>
        <div style={{ width: 1024, height: 576, display: "flex" }}>
          <Console />
        </div>
      </ThemeProvider>
    ),
    pointer: [
      { frame: 0, aim: { x: 700, y: 420 } },
      { frame: 8, aim: { testId: "sidebar-trigger" } },
      { frame: 15, aim: { testId: "sidebar-trigger" }, down: true },
      { frame: 18, aim: { testId: "sidebar-trigger" } },
      { frame: 30, aim: { testId: "deploy" } },
      { frame: 36, aim: { testId: "deploy" }, down: true },
      { frame: 39, aim: { testId: "deploy" } },
      { frame: 89, aim: { testId: "deploy", dx: 30, dy: 40 } },
    ],
  },
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
  /** The blueprint: the same stats screen, its painted boxes written to `boxes.json`. */
  blueprint: {
    ...macApp(
      <Window
        theme={macWindow}
        platform="darwin"
        title="Heavens Arena"
        width={1100}
        height={700}
      >
        <Stats />
      </Window>,
      [],
      [],
      false,
    ),
    frames: 1,
    boxes: true,
  },
  /** Slang, for the bento: 7 × 6 = on the keypad. */
  slang: {
    width: 1060,
    height: 760,
    frames: 75,
    view: () => <CalculatorApp />,
    pointer: [
      { frame: 0, aim: { testId: "calc-key-7", dx: 80, dy: 60 } },
      ...Arr.flatMap(
        [
          ["calc-key-7", 12],
          ["calc-key-×", 30],
          ["calc-key-6", 46],
          ["calc-key-=", 62],
        ] as const,
        ([testId, frame]): ReadonlyArray<Waypoint> => [
          { frame: frame - 4, aim: { testId } },
          { frame, aim: { testId }, down: true },
          { frame: frame + 3, aim: { testId } },
        ],
      ),
      { frame: 74, aim: { testId: "calc-key-=", dx: 60, dy: 50 } },
    ],
  },
  launcher: macApp(
    <Launcher />,
    pressAt("launcher-query", 8, { x: 760, y: 400 }),
    typing("hunter", 16),
    false,
  ),
  inbox: macApp(<Inbox />, [{ frame: 0, aim: { x: 900, y: 620 } }], [], false),
  kanban: macApp(
    <Kanban />,
    [{ frame: 0, aim: { x: 900, y: 620 } }],
    [],
    false,
  ),
  license: macApp(
    <License />,
    [{ frame: 0, aim: { x: 900, y: 620 } }],
    [],
    false,
  ),
  preferences: macApp(
    <Preferences />,
    [{ frame: 0, aim: { x: 900, y: 620 } }],
    [],
    false,
  ),
  menubar: macApp(
    <MenuBar />,
    [{ frame: 0, aim: { x: 900, y: 620 } }],
    [],
    false,
  ),
  editor: macApp(
    <Editor />,
    [{ frame: 0, aim: { x: 900, y: 620 } }],
    [],
    false,
  ),
  /** The player is a small floating window; it hugs its content. */
  music: {
    width: 640,
    height: 486,
    frames: 75,
    view: () => (
      <ThemeProvider theme={macWindow}>
        <div style={{ width: 640, height: 486, display: "flex" }}>
          <Music />
        </div>
      </ThemeProvider>
    ),
    pointer: [{ frame: 0, aim: { x: 560, y: 240 } }],
  },
  /** The monitor is a tall dashboard; it gets its own window height. */
  monitor: {
    width: 1100,
    height: 860,
    frames: 75,
    view: () => (
      <ThemeProvider theme={macWindow}>
        <div style={{ width: 1100, height: 860, display: "flex" }}>
          <Monitor />
        </div>
      </ThemeProvider>
    ),
    pointer: [{ frame: 0, aim: { x: 900, y: 780 } }],
  },
  "chat-mac": {
    width: 1280,
    height: 800,
    frames: 30,
    view: () => (
      <MacosDesktop width={1280} height={800} wallpaper={wallpaper("macos")}>
        <div
          style={{
            position: "absolute",
            left: 250,
            top: 50,
            width: 780,
            height: 600,
            borderRadius: 14,
            backgroundColor: "#FFFFFF",
          }}
        >
          <Agent />
        </div>
      </MacosDesktop>
    ),
    pointer: [{ frame: 0, aim: { x: 900, y: 700 } }],
  },
  "chat-win": chatOn(
    "win32",
    <DesktopBlock look="aero" wallpaper={wallpaper("windows")} />,
  ),
  "chat-linux": chatOn(
    "linux",
    <TilingDesktop palette="tokyo-night" wallpaper={wallpaper("omarchy")} />,
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
  /** The same tree across looks: macOS held 1.4 s, then Windows, then Linux. */
  /** The settings app alone, in the terminal's frame: three looks, three paints. */
  "term-app": {
    width: 1024,
    height: 576,
    frames: 66,
    view: () => <TerminalSettings />,
    pointer: [
      { frame: 0, aim: { testId: "look-win32", dx: 60, dy: 50 } },
      { frame: 6, aim: { testId: "look-win32" } },
      { frame: 15, aim: { testId: "look-win32" }, down: true },
      { frame: 18, aim: { testId: "look-win32" } },
      { frame: 24, aim: { testId: "dark", dx: 30, dy: 30 } },
      { frame: 33, aim: { testId: "dark" }, down: true },
      { frame: 36, aim: { testId: "dark" } },
      { frame: 42, aim: { testId: "look-linux" } },
      { frame: 51, aim: { testId: "look-linux" }, down: true },
      { frame: 54, aim: { testId: "look-linux" } },
      { frame: 65, aim: { testId: "look-linux" } },
    ],
  },
  settings: {
    width: 1024,
    height: 576,
    frames: 132,
    view: () => <SettingsWindow />,
    pointer: [
      { frame: 0, aim: { testId: "look-win32", dx: 60, dy: 50 } },
      { frame: 20, aim: { testId: "look-win32" } },
      { frame: 42, aim: { testId: "look-win32" }, down: true },
      { frame: 45, aim: { testId: "look-win32" } },
      { frame: 78, aim: { testId: "look-linux" } },
      { frame: 84, aim: { testId: "look-linux" }, down: true },
      { frame: 87, aim: { testId: "look-linux" } },
      { frame: 131, aim: { testId: "look-linux", dx: 30, dy: 40 } },
    ],
  },
  /** Linux: the tiling block in tokyo-night; the terminal is focused, then rose-pine (light) lands. */
  tiling: {
    width: 1280,
    height: 720,
    frames: 4 * BEAT,
    view: (frame) => (
      <TilingDesktop palette={frame < BEAT + 3 ? "tokyo-night" : "rose-pine"} />
    ),
    pointer: [
      { frame: 0, aim: { testId: "tile-terminal", dx: 120, dy: 160 } },
      { frame: 10, aim: { testId: "tile-terminal", dx: 60, dy: 30 } },
      {
        frame: 12,
        aim: { testId: "tile-terminal", dx: 60, dy: 30 },
        down: true,
      },
      { frame: 14, aim: { testId: "tile-terminal", dx: 60, dy: 30 } },
      { frame: 59, aim: { testId: "tile-terminal", dx: 90, dy: 60 } },
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
