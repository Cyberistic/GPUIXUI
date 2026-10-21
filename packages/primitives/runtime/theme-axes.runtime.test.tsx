/**
 * The remaining theme axes, on screen: high contrast, density, platform type.
 *
 * Plan `042` proved the shipped light and dark palettes. Three capabilities in
 * `COMPONENTS.md` were still values-only:
 *
 * - the high-contrast palettes had never painted a Tier 1 component;
 * - a density override had never been measured on a control;
 * - `platformTheme` had never reached a mounted tree — which is exactly the
 *   path the docs site's platform toggle uses.
 *
 * The invariants are structural, not decorative: every painted colour must be a
 * member of the active palette, a height must equal the active preset's metric,
 * and a code role's family must equal the platform's mono family. A component
 * that hard-codes a value fails here even though it looks right.
 */

import { expect, it } from "vitest";
import {
  densityPresets,
  highContrastDarkTheme,
  highContrastLightTheme,
  lightTheme,
  platformTheme,
  platformTypes,
  targetSize,
  type Density,
} from "@gpuixui/tokens";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as R from "effect/Record";
import { Box } from "../src/components/Box.js";
import { Button } from "../src/components/Button.js";
import { Checkbox } from "../src/components/Checkbox.js";
import { Input } from "../src/components/Input.js";
import { NumberField } from "../src/components/NumberField.js";
import { Progress } from "../src/components/Progress.js";
import { Separator } from "../src/components/Separator.js";
import { Stack } from "../src/components/Stack.js";
import { Switch } from "../src/components/Switch.js";
import { Text } from "../src/components/Text.js";
import { ThemeProvider } from "../src/components/ThemeProvider.js";
import type { PrimitiveTheme } from "../src/core/theme.js";
import type { Runtime } from "./harness.js";
import { openWindow } from "./fixture.js";
import { painted, paintedColours, rgbOf } from "./theme.js";

const rendered = (node: React.ReactElement): Promise<Runtime> =>
  openWindow().then((runtime) => {
    runtime.render(node);
    return runtime;
  });

/** One control per density-driven surface, plus an icon-sized selection box. */
const densityScene = (density: Density) => (
  <ThemeProvider theme={lightTheme} density={density}>
    <Box tone="background" padding="lg" testId="surface">
      <Stack direction="column" gap="md">
        <Button variant="primary" testId="button">
          Save
        </Button>
        <Input testId="input" placeholder="Name" />
        <NumberField label="Count" defaultValue={3} testId="number" />
        <Checkbox checked label="Enable" testId="checkbox" />
      </Stack>
    </Box>
  </ThemeProvider>
);

/** A scene with one control per themed surface, at the theme's own density. */
const controls = (theme: PrimitiveTheme) => (
  <ThemeProvider theme={theme}>
    <Box tone="background" padding="lg" testId="surface">
      <Stack direction="column" gap="md">
        <Text role="body">Settings</Text>
        <Button variant="primary" testId="button">
          Save
        </Button>
        <Input testId="input" placeholder="Name" />
        <Checkbox checked label="Enable" testId="checkbox" />
        <Switch checked label="Notify" testId="switch" />
        <Progress value={40} label="Uploading" />
        <Separator orientation="horizontal" />
      </Stack>
    </Box>
  </ThemeProvider>
);

/** The active palette as RGB strings, ready to compare against the paint. */
const paletteOf = (theme: PrimitiveTheme): ReadonlyArray<string> =>
  Arr.map(R.values(theme.colors), rgbOf);

/** A pixel height the runtime painted for `testId`, failing when absent. */
const heightOf = (runtime: Runtime, testId: string): number =>
  Option.getOrElse(runtime.bounds(testId), () =>
    expect.fail(`the runtime painted no ${testId}`),
  ).height;

/**
 * The height of the drawing inside a control.
 *
 * A selection control's `testId` addresses its press target (the floor), and the
 * box it draws is the target's first child.
 */
const drawingHeightOf = (runtime: Runtime, testId: string): number => {
  const target = Option.getOrElse(runtime.element(testId), () =>
    expect.fail(`the runtime retained no ${testId}`),
  );
  const drawing = Option.getOrElse(
    Option.fromNullishOr(target.children[0]),
    () => expect.fail(`the ${testId} drew no box`),
  );
  return Option.getOrElse(runtime.boundsOfId(drawing), () =>
    expect.fail(`the ${testId} painted no box`),
  ).height;
};

it("paints the high-contrast light palette, not the default one", async () => {
  const runtime = await rendered(controls(highContrastLightTheme));
  const colours = paintedColours(runtime);
  const palette = paletteOf(highContrastLightTheme);
  // The scene must have painted something, or the membership check is vacuous.
  expect(colours).toContain(rgbOf(highContrastLightTheme.colors.background));
  expect(
    Arr.filter(colours, (colour) => !palette.includes(colour)),
  ).toStrictEqual([]);
  // The surface is #FFFFFF here and neutral-50 in the default light theme: the
  // frame proves the palette swapped rather than two palettes agreeing.
  expect(colours).not.toContain(rgbOf(lightTheme.colors.background));
});

it("paints the high-contrast dark palette and repaints on a switch", async () => {
  const runtime = await openWindow();
  runtime.render(controls(highContrastLightTheme));
  const lightSurface = painted(runtime, "surface", "backgroundColor");
  runtime.render(controls(highContrastDarkTheme));

  expect(painted(runtime, "surface", "backgroundColor")).toBe(
    highContrastDarkTheme.colors.background,
  );
  expect(painted(runtime, "surface", "backgroundColor")).not.toBe(lightSurface);

  const colours = paintedColours(runtime);
  const palette = paletteOf(highContrastDarkTheme);
  expect(colours).toContain(rgbOf(highContrastDarkTheme.colors.primary));
  expect(
    Arr.filter(colours, (colour) => !palette.includes(colour)),
  ).toStrictEqual([]);
});

it("a density override moves control heights and leaves colour alone", async () => {
  const runtime = await openWindow();
  const expectMetrics = (density: Density): void => {
    expect(heightOf(runtime, "button")).toBe(density.controlHeight.md);
    // A native `<input>` reports its content box: the runtime draws the border
    // inside the declared height, so the paint is two thin borders shorter.
    // Measured here; the contract is still the density metric.
    expect(heightOf(runtime, "input")).toBe(
      density.controlHeight.md - 2 * lightTheme.borderWidth.thin,
    );
    expect(heightOf(runtime, "number")).toBe(density.controlHeight.md);
    // A selection control's target is the pressable floor and density must not
    // move it; the box it draws stays icon-sized by design.
    expect(heightOf(runtime, "checkbox")).toBe(targetSize.minimum);
    expect(drawingHeightOf(runtime, "checkbox")).toBe(lightTheme.iconSize.md);
  };

  runtime.render(densityScene(densityPresets.compact));
  expectMetrics(densityPresets.compact);
  const denseSurface = painted(runtime, "surface", "backgroundColor");
  const denseLabel = painted(runtime, "button", "color");

  // The same mounted tree at a second density: a provider that keeps its first
  // metrics shows the old heights here.
  runtime.render(densityScene(densityPresets.spacious));
  expectMetrics(densityPresets.spacious);

  // Density is numeric only: the same theme still paints the same roles.
  expect(densityPresets.compact.controlHeight.md).not.toBe(
    densityPresets.spacious.controlHeight.md,
  );
  expect(painted(runtime, "surface", "backgroundColor")).toBe(denseSurface);
  expect(painted(runtime, "button", "color")).toBe(denseLabel);
});

it("the platform theme reaches the paint, and a switch repaints", async () => {
  const code = (platform: "win32" | "linux") => (
    <ThemeProvider theme={platformTheme(lightTheme, platform)}>
      <Text role="code" testId="code">
        nub run check
      </Text>
    </ThemeProvider>
  );
  const runtime = await rendered(code("win32"));
  expect(painted(runtime, "code", "fontFamily")).toBe(platformTypes.win32.mono);

  runtime.render(code("linux"));
  expect(painted(runtime, "code", "fontFamily")).toBe(platformTypes.linux.mono);
  expect(platformTypes.linux.mono).not.toBe(platformTypes.win32.mono);
});
