/**
 * The theme, on screen: both palettes and a live switch.
 *
 * `core/style.test.ts` proves each resolver reads the theme it is given. This
 * proves the two things only a mounted tree can: that `ThemeProvider`'s value
 * actually reaches the style the runtime applies, and that **switching the theme
 * repaints the same tree** — a provider that memoises its first theme shows the
 * old palette for ever and no resolver test would notice.
 *
 * The two themes are the **shipped** `lightTheme` and `darkTheme` from
 * `@gpuixui/tokens` (plan 021), not test doubles, so this is the real
 * both-themes verification. The invariant is structural: every painted colour
 * must be a value of the active palette, so adding a role cannot silently
 * satisfy it. The other runtime suites keep the deterministic fixture
 * (`core/testing/theme.fixture.ts`) because they assert geometry against theme
 * numbers and gain nothing from a system font.
 */

import { expect, it } from "vitest";
import { darkTheme, lightTheme } from "@gpuixui/tokens";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as R from "effect/Record";
import { Box } from "../src/components/Box.js";
import { Button } from "../src/components/Button.js";
import { Checkbox } from "../src/components/Checkbox.js";
import { Input } from "../src/components/Input.js";
import { Progress } from "../src/components/Progress.js";
import { RadioGroup } from "../src/components/RadioGroup.js";
import { Separator } from "../src/components/Separator.js";
import { Skeleton } from "../src/components/Skeleton.js";
import { Spinner } from "../src/components/Spinner.js";
import { Stack } from "../src/components/Stack.js";
import { Switch } from "../src/components/Switch.js";
import { Text } from "../src/components/Text.js";
import { ThemeProvider } from "../src/components/ThemeProvider.js";
import type { PrimitiveTheme } from "../src/core/theme.js";
import type { Runtime } from "./harness.js";
import { openWindow } from "./fixture.js";

/** The scene: one element per themed role, all on the background surface. */
const scene = (theme: PrimitiveTheme) => (
  <ThemeProvider theme={theme}>
    <Box tone="background" padding="lg" testId="box">
      <Stack direction="column" gap="md">
        <Text role="body">Settings</Text>
        <Button variant="primary" testId="button">
          Save
        </Button>
        <Input testId="input" placeholder="Name" />
      </Stack>
    </Box>
  </ThemeProvider>
);

/** The applied style of the element with `testId`, as the runtime holds it. */
const styleOf = (
  runtime: Runtime,
  testId: string,
): Readonly<Record<string, unknown>> =>
  Option.getOrElse(
    Option.map(runtime.element(testId), (element) => element.style),
    () => expect.fail(`the runtime retained no ${testId}`),
  );

/** The painted value of one style property, failing when it is absent. */
const painted = (runtime: Runtime, testId: string, property: string): string =>
  Option.getOrElse(
    Option.flatMap(
      Option.fromNullishOr(styleOf(runtime, testId)[property]),
      (v) => Option.fromNullishOr(typeof v === "string" ? v : null),
    ),
    () => expect.fail(`${testId} painted no ${property}`),
  );

/** A 6- or 8-digit hex colour, the only shape the palette produces. */
const isColour = (value: string): boolean =>
  /^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/.test(value);

/** The RGB part of a palette entry, so a lifted-alpha colour still matches. */
const rgbOf = (colour: string): string => colour.slice(0, 7).toUpperCase();

/** Every colour-shaped value the tree applied, in element order. */
const paintedColours = (runtime: Runtime): ReadonlyArray<string> =>
  Arr.flatMap(runtime.all(), (element) =>
    Arr.map(
      Arr.filter(
        R.values(element.style),
        (value): value is string =>
          typeof value === "string" && isColour(value),
      ),
      rgbOf,
    ),
  );

const rendered = (node: React.ReactElement): Promise<Runtime> =>
  openWindow().then((runtime) => {
    runtime.render(node);
    return runtime;
  });

it("paints each role from the theme it is given", async () => {
  const runtime = await rendered(scene(lightTheme));
  expect(painted(runtime, "box", "backgroundColor")).toBe(
    lightTheme.colors.background,
  );
  expect(painted(runtime, "button", "backgroundColor")).toBe(
    lightTheme.colors.primary,
  );
  expect(painted(runtime, "button", "color")).toBe(
    lightTheme.colors.primaryForeground,
  );
  expect(painted(runtime, "input", "backgroundColor")).toBe(
    lightTheme.colors.input,
  );
  expect(painted(runtime, "input", "borderColor")).toBe(
    lightTheme.colors.border,
  );
});

it("paints nothing the palette does not contain", async () => {
  const runtime = await rendered(scene(lightTheme));
  const palette = Arr.map(R.values(lightTheme.colors), rgbOf);
  const painted = paintedColours(runtime);
  // The palette test is only meaningful if the frame painted colours at all.
  expect(painted).toContain(rgbOf(lightTheme.colors.background));
  expect(
    Arr.filter(painted, (colour) => !palette.includes(colour)),
  ).toStrictEqual([]);
});

it("repaints the mounted tree when the theme changes", async () => {
  const runtime = await openWindow();
  runtime.render(scene(lightTheme));
  const lightBackground = painted(runtime, "box", "backgroundColor");
  const lightButton = painted(runtime, "button", "backgroundColor");

  runtime.render(scene(darkTheme));
  expect(painted(runtime, "box", "backgroundColor")).toBe(
    darkTheme.colors.background,
  );
  expect(painted(runtime, "button", "backgroundColor")).toBe(
    darkTheme.colors.primary,
  );
  expect(painted(runtime, "input", "backgroundColor")).toBe(
    darkTheme.colors.input,
  );

  // And the old values are gone, not merely shadowed.
  expect(painted(runtime, "button", "backgroundColor")).not.toBe(lightButton);
  expect(painted(runtime, "box", "backgroundColor")).not.toBe(lightBackground);
});

it("paints every stateful surface from the dark palette", async () => {
  const runtime = await rendered(
    <ThemeProvider theme={darkTheme}>
      <Box tone="background" padding="lg" testId="surface">
        <Stack direction="column" gap="md">
          <Checkbox checked label="Enable" />
          <Switch checked label="Notify" />
          <RadioGroup
            label="Plan"
            value="a"
            options={[
              { value: "a", label: "Alpha" },
              { value: "b", label: "Beta" },
            ]}
          />
          <Progress value={40} label="Uploading" />
          <Skeleton width={80} height={12} />
          <Spinner label="Working" />
          <Separator orientation="horizontal" />
        </Stack>
      </Box>
    </ThemeProvider>,
  );
  const palette = Arr.map(R.values(darkTheme.colors), rgbOf);
  const painted = paintedColours(runtime);
  // The checked and accent-bearing controls must take the dark primary, and no
  // light-only value may survive the switch to dark.
  expect(painted).toContain(rgbOf(darkTheme.colors.primary));
  expect(painted).not.toContain(rgbOf(lightTheme.colors.primary));
  expect(
    Arr.filter(painted, (colour) => !palette.includes(colour)),
  ).toStrictEqual([]);
});

it("keeps density out of the theme switch", async () => {
  const runtime = await rendered(scene(lightTheme));
  const lightHeight = Option.getOrElse(runtime.bounds("button"), () =>
    expect.fail("the runtime painted no button"),
  ).height;
  runtime.render(scene(darkTheme));
  const darkHeight = Option.getOrElse(runtime.bounds("button"), () =>
    expect.fail("the runtime painted no button"),
  ).height;
  expect(darkHeight).toBe(lightHeight);
  expect(darkHeight).toBe(lightTheme.density.controlHeight.md);
});
