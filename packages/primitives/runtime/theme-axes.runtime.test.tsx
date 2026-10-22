/**
 * The remaining theme axes, on screen: high contrast, density, platform type.
 *
 * Plan `042` proved the shipped light and dark palettes on a handful of
 * controls. Three capabilities in `COMPONENTS.md` were still values-only:
 *
 * - the high-contrast palettes had not been read on screen beyond a handful of
 *   controls;
 * - a density override had never been measured on a control;
 * - `platformTheme` had never reached a mounted tree — which is exactly the
 *   path the docs site's platform toggle uses.
 *
 * The invariants are structural, not decorative: every painted colour must be a
 * member of the active palette (or the one documented derived text colour, see
 * `bandOf`), a height must equal the active preset's metric, and a code role's
 * family must equal the platform's mono family. A component that hard-codes a
 * value fails here even though it looks right.
 *
 * The first bullet is now read on the **whole tier**, not seven controls: the
 * `everyTier` scene below mounts each component at rest in both high-contrast
 * variants, so a literal in a field, a group, a mark or a placeholder is named
 * rather than waiting for someone to look at it.
 */

import { expect, it } from "vitest";
import {
  brandText,
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
import { ButtonGroup } from "../src/components/ButtonGroup.js";
import { Checkbox } from "../src/components/Checkbox.js";
import { CheckboxGroup } from "../src/components/CheckboxGroup.js";
import { IconButton } from "../src/components/IconButton.js";
import { Input } from "../src/components/Input.js";
import { Label } from "../src/components/Label.js";
import { Meter } from "../src/components/Meter.js";
import { NumberField } from "../src/components/NumberField.js";
import { OTPField } from "../src/components/OTPField.js";
import { Progress } from "../src/components/Progress.js";
import { RadioGroup } from "../src/components/RadioGroup.js";
import { RangeSlider, Slider } from "../src/components/Slider.js";
import { Rating } from "../src/components/Rating.js";
import { ScrollArea } from "../src/components/ScrollArea.js";
import { Select } from "../src/components/Select.js";
import { Separator } from "../src/components/Separator.js";
import { Skeleton } from "../src/components/Skeleton.js";
import { Spinner } from "../src/components/Spinner.js";
import { Stack } from "../src/components/Stack.js";
import { Switch } from "../src/components/Switch.js";
import { Text } from "../src/components/Text.js";
import { TextArea } from "../src/components/TextArea.js";
import { ThemeProvider } from "../src/components/ThemeProvider.js";
import { Toggle } from "../src/components/Toggle.js";
import { ToggleGroup } from "../src/components/ToggleGroup.js";
import { Tooltip } from "../src/components/Tooltip.js";
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

/**
 * Every Tier 1 component at rest, with no variant that derives a colour.
 *
 * The high-contrast claims above were read off seven controls; the rest of the
 * tier — the fields, groups, marks, overlays and placeholders — had never
 * painted a high-contrast palette, so a literal in one of them was a colour the
 * gate could not see. Hover, press and disabled states are left out on purpose:
 * those are derived fills (`filledHover`/`filledPressed`, the washes, the fade)
 * and a derived value is measured by the tokens suite, not by membership.
 */
const everyTier = (theme: PrimitiveTheme) => (
  <ThemeProvider theme={theme}>
    <Box tone="background" padding="lg" testId="surface">
      <Stack direction="column" gap="md">
        <Text role="body">Settings</Text>
        <Label>Name</Label>
        <Button variant="primary" testId="button">
          Save
        </Button>
        <IconButton label="Close" icon="circle" testId="icon-button" />
        <ButtonGroup testId="button-group">
          <Button variant="secondary">Left</Button>
          <Button variant="secondary">Right</Button>
        </ButtonGroup>
        <Toggle pressed label="Bold" testId="toggle" />
        <ToggleGroup
          type="single"
          defaultValue="left"
          options={[
            { value: "left", label: "Left" },
            { value: "right", label: "Right" },
          ]}
          testId="toggle-group"
        />
        <Input testId="input" label="Name" defaultValue="Ada" />
        <TextArea testId="textarea" label="Notes" defaultValue="Hi" />
        <NumberField label="Count" defaultValue={3} testId="number" />
        <OTPField label="Code" defaultValue="1234" testId="otp" />
        <Checkbox checked label="Enable" testId="checkbox" />
        <CheckboxGroup
          label="Colours"
          defaultValue={["red"]}
          options={[
            { value: "red", label: "Red" },
            { value: "blue", label: "Blue" },
          ]}
          testId="checkbox-group"
        />
        <RadioGroup
          label="Size"
          defaultValue="md"
          options={[
            { value: "sm", label: "Small" },
            { value: "md", label: "Medium" },
          ]}
          testId="radio-group"
        />
        <Switch checked label="Notify" testId="switch" />
        <Select
          label="Fruit"
          placeholder="Pick one"
          options={[{ value: "apple", label: "Apple" }]}
          testId="select"
        />
        <Slider label="Volume" defaultValue={20} testId="slider" />
        <RangeSlider
          label="Price"
          defaultValue={[20, 60] as const}
          testId="range"
        />
        <Rating label="Score" defaultValue={3} testId="rating" />
        <Progress value={40} label="Uploading" testId="progress" />
        <Meter value={40} label="Disk" testId="meter" />
        <Spinner testId="spinner" />
        <Skeleton testId="skeleton" width={40} height={12} />
        <Separator orientation="horizontal" />
        <ScrollArea testId="scroller" axis="vertical" style={{ height: 40 }}>
          <Text role="body">Row</Text>
        </ScrollArea>
        <Tooltip content="Refresh" defaultOpen>
          <Button variant="secondary" testId="tip-trigger">
            Refresh
          </Button>
        </Tooltip>
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

/**
 * The band a Tier 1 paint may fall in: the theme's own roles, plus the one
 * derived text colour a mark and a link are designed with.
 *
 * `brandText` moves the brand toward the foreground until every surface it is
 * read on clears its floor, so it is the documented exception to "a painted
 * colour is a role" — a link, a `Text tone="primary"` and a progress fill use
 * it. Every other derived value (the pointer fills, the washes, the disabled
 * pair, the fade) belongs to a state this scene leaves at rest.
 */
const bandOf = (theme: PrimitiveTheme): ReadonlyArray<string> => [
  ...paletteOf(theme),
  rgbOf(brandText(theme)),
];

it("paints the high-contrast palettes on every Tier 1 component", async () => {
  // The gap guarded: high contrast had been read off seven controls, so a
  // literal in a field, a group, a mark or a placeholder was a colour no suite
  // could see. This scene mounts the whole tier at rest and asks one question
  // of every applied colour — is it a role of this palette? — in both variants.
  const runtime = await openWindow();
  const audit = (name: string, theme: PrimitiveTheme): void => {
    runtime.render(everyTier(theme));
    const colours = paintedColours(runtime);
    // A scene that painted nothing would pass the membership check vacuously.
    expect(runtime.allText()).toContain("Refresh");
    expect(colours.length).toBeGreaterThan(40);
    const band = bandOf(theme);
    expect({
      name,
      stray: Arr.filter(colours, (colour) => !band.includes(colour)),
    }).toStrictEqual({ name, stray: [] });
  };
  audit("light", highContrastLightTheme);
  audit("dark", highContrastDarkTheme);
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
