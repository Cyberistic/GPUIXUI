/**
 * The launch film's takes (plan 060), one per shot that shows GPUIxUI. Each is
 * a real tree under real input; `take.ts` captures it.
 *
 *   nub apps/playground/dist/film/takes.js <take> <outDir>
 */
import { Button, Slider, Switch } from "@gpuixui/primitives";
import { lightTheme, platformTheme, type Theme } from "@gpuixui/tokens";
import { ThemeProvider } from "@gpuixui/tokens/react";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as R from "effect/Record";
import { mkdirSync } from "node:fs";
import type { ReactNode } from "react";
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
};

const [, , name = "", outDir = ""] = process.argv;
Effect.runSync(
  Option.match(R.get(takes, name), {
    onNone: () =>
      Effect.logError(`unknown take "${name}"; one of ${R.keys(takes).join(", ")}`),
    onSome: (take) =>
      Effect.sync(() => {
        mkdirSync(outDir, { recursive: true });
        return capture(take, outDir).length;
      }).pipe(
        Effect.flatMap((moves) =>
          Effect.logInfo(`${name}: ${take.frames} frames, ${moves} pointer samples → ${outDir}`),
        ),
      ),
  }),
);
