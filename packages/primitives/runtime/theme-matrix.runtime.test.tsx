/**
 * The Tier 1 both-theme matrix (plan 352).
 *
 * `MISSION.md` requires every component verified in both themes, but
 * `theme.runtime.test.tsx` proves two scenes and every component suite asserts
 * against the deterministic fixture theme. Nineteen of the 31 public components
 * therefore had no both-themes evidence, and nothing stopped a new one from
 * painting a hard-coded colour.
 *
 * Each case is the component's smallest honest shape. It is mounted once per
 * shipped palette and held to three invariants: every colour inside the case is
 * a value of the active palette, a case that paints anything paints in both
 * palettes, and its light and dark colour sets differ — so a literal (equal in
 * both) or a theme that never reached the component fails by case name.
 */

import { Effect } from "effect";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { darkTheme, lightTheme } from "@gpuixui/tokens";
import * as Arr from "effect/Array";
import * as Order from "effect/Order";
import * as R from "effect/Record";
import {
  Box,
  Button,
  ButtonGroup,
  Checkbox,
  CheckboxGroup,
  Grid,
  IconButton,
  InfoTip,
  Input,
  Label,
  Meter,
  NumberField,
  OTPField,
  Progress,
  RadioGroup,
  RangeSlider,
  Rating,
  ScrollArea,
  Select,
  Separator,
  Skeleton,
  Slider,
  Spacer,
  Spinner,
  Stack,
  Surface,
  Switch,
  Text,
  TextArea,
  ThemeProvider,
  Toggle,
  ToggleGroup,
  Tooltip,
  type SurfaceAdapter,
} from "../src/index.js";
import type { PrimitiveTheme } from "../src/core/theme.js";
import * as Primitives from "../src/index.js";
import { openWindow } from "./fixture.js";
import { rgbOf, subtreeColours } from "./theme.js";

const CASE = "case";

/** One component, in the smallest shape that paints its own state. */
interface Case {
  readonly name: string;
  /** False only for a component that paints no colour at all. */
  readonly paints?: false;
  readonly render: () => ReactElement;
}

const NO_PIXELS: SurfaceAdapter = {
  kind: "test",
  create: () => Effect.void,
  resize: () => Effect.void,
  focus: () => Effect.void,
  blur: () => Effect.void,
  setVisible: () => Effect.void,
  setTheme: () => Effect.void,
  destroy: () => Effect.void,
};

const CASES: ReadonlyArray<Case> = [
  {
    name: "Surface",
    paints: false,
    render: () => (
      <Surface adapter={NO_PIXELS} width={40} height={30} label="Surface" />
    ),
  },
  { name: "Box", render: () => <Box tone="background" padding="md" /> },
  {
    name: "Grid",
    render: () => (
      <Grid columns={2}>
        <Box tone="muted" padding="sm" />
        <Box tone="muted" padding="sm" />
      </Grid>
    ),
  },
  {
    name: "Stack",
    render: () => (
      <Stack direction="column" gap="sm">
        <Text role="body">Settings</Text>
      </Stack>
    ),
  },
  {
    name: "Separator",
    render: () => <Separator orientation="horizontal" label="Advanced" />,
  },
  {
    name: "Spacer",
    paints: false,
    render: () => (
      <Stack direction="row" gap="sm">
        <Text role="body">Left</Text>
        <Spacer />
        <Text role="body">Right</Text>
      </Stack>
    ),
  },
  {
    name: "ScrollArea",
    render: () => (
      <ScrollArea label="Log" axis="vertical" style={{ height: 120 }}>
        <Text role="body">A line</Text>
      </ScrollArea>
    ),
  },
  { name: "Text", render: () => <Text role="body">Settings</Text> },
  { name: "Label", render: () => <Label>Email</Label> },
  { name: "Button", render: () => <Button>Save</Button> },
  {
    name: "IconButton",
    render: () => <IconButton label="Close" icon="check" />,
  },
  {
    name: "ButtonGroup",
    render: () => (
      <ButtonGroup>
        <Button variant="outline">Cancel</Button>
        <Button>Save</Button>
      </ButtonGroup>
    ),
  },
  { name: "Toggle", render: () => <Toggle pressed>Bold</Toggle> },
  {
    name: "ToggleGroup",
    render: () => (
      <ToggleGroup
        type="single"
        label="Alignment"
        value="a"
        options={[
          { value: "a", label: "Left" },
          { value: "b", label: "Right" },
        ]}
      />
    ),
  },
  { name: "Input", render: () => <Input label="Name" placeholder="Name" /> },
  {
    name: "NumberField",
    render: () => <NumberField label="Count" defaultValue={2} />,
  },
  { name: "OTPField", render: () => <OTPField label="Code" length={4} /> },
  { name: "TextArea", render: () => <TextArea label="Notes" /> },
  { name: "Checkbox", render: () => <Checkbox checked label="Enable" /> },
  {
    name: "CheckboxGroup",
    render: () => (
      <CheckboxGroup
        label="Features"
        value={["a"]}
        options={[
          { value: "a", label: "Alpha" },
          { value: "b", label: "Beta" },
        ]}
      />
    ),
  },
  { name: "Switch", render: () => <Switch checked label="Notify" /> },
  {
    name: "RadioGroup",
    render: () => (
      <RadioGroup
        label="Plan"
        value="a"
        options={[
          { value: "a", label: "Alpha" },
          { value: "b", label: "Beta" },
        ]}
      />
    ),
  },
  { name: "Progress", render: () => <Progress value={40} label="Uploading" /> },
  { name: "Rating", render: () => <Rating value={3} label="Quality" /> },
  {
    name: "RangeSlider",
    render: () => <RangeSlider label="Price" value={[20, 60]} />,
  },
  { name: "Slider", render: () => <Slider label="Volume" value={40} /> },
  { name: "Meter", render: () => <Meter value={40} label="Disk usage" /> },
  { name: "Skeleton", render: () => <Skeleton width={80} height={12} /> },
  { name: "Spinner", render: () => <Spinner label="Working" /> },
  {
    name: "Select",
    render: () => (
      <Select
        label="Fruit"
        value="a"
        options={[
          { value: "a", label: "Apple" },
          { value: "b", label: "Pear" },
        ]}
      />
    ),
  },
  {
    name: "Tooltip",
    render: () => (
      <Tooltip content="Delete this file">
        <Button label="Delete">Delete</Button>
      </Tooltip>
    ),
  },
  {
    name: "InfoTip",
    render: () => <InfoTip content="What revenue means" label="Revenue" />,
  },
];

/** The public component names, read from the package's real exports. */
const PUBLIC_COMPONENTS: ReadonlyArray<string> = [
  "SurfaceError",
  "ThemeProvider",
];

const componentExports = (
  namespace: typeof Primitives,
): ReadonlyArray<string> =>
  Arr.filter(
    Arr.filter(R.keys(namespace), (name) => /^[A-Z][A-Za-z0-9]*$/.test(name)),
    (name) =>
      !Arr.contains(PUBLIC_COMPONENTS, name) &&
      name !== "MissingThemeProviderError",
  );

const paletteOf = (theme: PrimitiveTheme): ReadonlyArray<string> =>
  Arr.map(R.values(theme.colors), rgbOf);

/** One window per case, as the fixture's one-window rule requires. */
const coloursFor = (
  testCase: Case,
  theme: PrimitiveTheme,
): Promise<ReadonlyArray<string>> =>
  openWindow().then((runtime) => {
    runtime.render(
      <ThemeProvider theme={theme}>
        <div testId={CASE}>{testCase.render()}</div>
      </ThemeProvider>,
    );
    return subtreeColours(runtime, CASE);
  });

const sorted = (colours: ReadonlyArray<string>): ReadonlyArray<string> =>
  Arr.sort(colours, Order.String);

const foreignIn = (
  colours: ReadonlyArray<string>,
  palette: ReadonlyArray<string>,
): ReadonlyArray<string> =>
  Arr.filter(colours, (colour) => !Arr.contains(palette, colour));

describe("theme matrix", () => {
  it.each(CASES)(
    "$name paints only palette colours in both palettes",
    async (testCase) => {
      const light = await coloursFor(testCase, lightTheme);
      const dark = await coloursFor(testCase, darkTheme);

      expect(foreignIn(light, paletteOf(lightTheme))).toStrictEqual([]);
      expect(foreignIn(dark, paletteOf(darkTheme))).toStrictEqual([]);

      if (testCase.paints === false) return;
      expect(light.length).toBeGreaterThan(0);
      expect(dark.length).toBeGreaterThan(0);
      // A hard-coded colour is equal in both palettes; a themed one is not.
      expect(sorted(light)).not.toStrictEqual(sorted(dark));
    },
  );

  it("covers every public component", () => {
    const names = Arr.map(CASES, (testCase) => testCase.name);
    expect(sorted(names)).toStrictEqual(sorted(componentExports(Primitives)));
  });
});
