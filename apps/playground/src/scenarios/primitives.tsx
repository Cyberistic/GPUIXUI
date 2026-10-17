/**
 * The shipped Tier 1 components (`@gpuixui/primitives`) in the real runtime.
 *
 * Every other scenario probes a runtime mechanism; these three mount the package
 * a consumer actually imports, through the shipped token theme, and drive it
 * with native input. The point is the composition: the tokens provider, the
 * primitives provider, the component's own keyboard/focus/state contract and
 * the paint the runtime reports.
 *
 * Measured facts: plan `168` §8.
 */
import { useState } from "react";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  Button,
  Checkbox,
  Input,
  Meter,
  Progress,
  Select,
  Skeleton,
  Slider,
  Switch,
  ThemeProvider as PrimitiveThemeProvider,
  Toggle,
  Tooltip,
} from "@gpuixui/primitives";
import { useTheme } from "@gpuixui/tokens/react";
import { Readout } from "../ui.js";
import { focusedId, node, read, text, treeOf } from "./probes.js";
import type { PlaygroundScenario } from "../types.js";

const ActionsProbe = () => {
  const theme = useTheme();
  const [activations, setActivations] = useState(0);
  const [grid, setGrid] = useState(false);
  const activate = () => setActivations((count) => count + 1);

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 12, width: 420 }}
    >
      <PrimitiveThemeProvider theme={theme}>
        <div style={{ display: "flex", flexDirection: "row", gap: 8 }}>
          <Button
            testId="action-save"
            label="Save changes"
            onActivate={activate}
          >
            Save changes
          </Button>
          <Button
            testId="action-disabled"
            label="Delete"
            disabled
            onActivate={activate}
          >
            Delete
          </Button>
          <Button
            testId="action-loading"
            label="Create project"
            loading
            onActivate={activate}
          >
            Create project
          </Button>
        </div>
        <Toggle
          testId="action-toggle"
          label="Grid"
          pressed={grid}
          onPressedChange={setGrid}
        >
          Grid
        </Toggle>
      </PrimitiveThemeProvider>
      <Readout testId="action-readout">
        {`activations=${activations} pressed=${grid}`}
      </Readout>
    </div>
  );
};

const FieldsProbe = () => {
  const theme = useTheme();
  const [name, setName] = useState("");
  const [submits, setSubmits] = useState(0);
  const [checked, setChecked] = useState(false);
  const [paused, setPaused] = useState(false);
  const [region, setRegion] = useState("eu-west");

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 12, width: 440 }}
    >
      <PrimitiveThemeProvider theme={theme}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Input
            testId="field-name"
            label="Project name"
            value={name}
            onChange={setName}
            onSubmit={() => setSubmits((count) => count + 1)}
            fullWidth
          />
          <Input
            testId="field-locked"
            label="Locked"
            value="locked"
            disabled
            fullWidth
          />
          <div style={{ display: "flex", flexDirection: "row", gap: 12 }}>
            <Checkbox
              testId="field-check"
              label="Email notifications"
              checked={checked}
              onChange={setChecked}
            />
            <Switch
              testId="field-switch"
              label="Pause all"
              checked={paused}
              onChange={setPaused}
            />
          </div>
          <Select
            testId="field-region"
            label="Region"
            value={region}
            onChange={setRegion}
            fullWidth
            options={[
              { value: "eu-west", label: "Europe — West" },
              { value: "us-east", label: "United States — East" },
              { value: "ap-south", label: "Asia — South" },
              {
                value: "legacy",
                label: "Legacy region (read-only)",
                disabled: true,
              },
            ]}
          />
        </div>
      </PrimitiveThemeProvider>
      <Readout testId="field-readout">
        {`name=${name} submits=${submits} checked=${checked} paused=${paused} region=${region}`}
      </Readout>
    </div>
  );
};

const DisplayProbe = () => {
  const theme = useTheme();
  const [quality, setQuality] = useState(50);

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 12, width: 460 }}
    >
      <PrimitiveThemeProvider theme={theme}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Slider
            testId="display-quality"
            label="Quality"
            value={quality}
            onChange={setQuality}
            formatValue={(value) => `${value}%`}
          />
          <Progress testId="display-progress" label="Upload" value={42} />
          <Meter
            testId="display-meter"
            label="Disk usage"
            value={68}
            formatValue={(value) => `${value} GB`}
          />
          <Skeleton testId="display-skeleton" height={14} width="70%" />
          <Tooltip
            testId="display-tooltip"
            content="Booked revenue"
            side="bottom"
            delay={0}
          >
            <div
              testId="display-trigger"
              tabIndex={0}
              style={{ display: "flex", padding: 4 }}
            >
              <text style={{ color: theme.colors.foreground }}>Revenue</text>
            </div>
          </Tooltip>
        </div>
      </PrimitiveThemeProvider>
      <Readout testId="display-quality-value">{String(quality)}</Readout>
      <Readout testId="display-readout">{`quality=${quality}`}</Readout>
    </div>
  );
};

export const primitivesActionsScenario: PlaygroundScenario = {
  id: "primitives-actions",
  title: "Tier 1: Button and Toggle in the real runtime",
  capability: "components",
  view: () => <ActionsProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      ctx.host.click("action-save");
      yield* ctx.expectContains(
        "a click activates the button",
        read(ctx, "action-readout"),
        "activations=1",
      );
      yield* ctx.expectEqual(
        "the click focused the button",
        focusedId(ctx),
        "action-save",
      );

      ctx.host.keyDown("action-save", "enter");
      ctx.host.keyUp("action-save", "enter");
      yield* ctx.expectContains(
        "Enter activates on key down",
        read(ctx, "action-readout"),
        "activations=2",
      );
      ctx.host.keyDown("action-save", "space");
      yield* ctx.expectContains(
        "Space does not activate on key down",
        read(ctx, "action-readout"),
        "activations=2",
      );
      ctx.host.keyUp("action-save", "space");
      yield* ctx.expectContains(
        "Space activates on key up",
        read(ctx, "action-readout"),
        "activations=3",
      );

      const ringed = yield* ctx.expectSome(
        "the focused button reports its style",
        Option.fromNullishOr(ctx.host.paintedStyle("action-save")),
      );
      yield* ctx.expectEqual(
        "the component merged the focus ring",
        Option.isSome(ringed.boxShadow),
        true,
      );

      ctx.host.click("action-loading");
      yield* ctx.expectEqual(
        "focus moved to the loading button",
        focusedId(ctx),
        "action-loading",
      );
      const blurred = yield* ctx.expectSome(
        "the previously focused button still reports its style",
        Option.fromNullishOr(ctx.host.paintedStyle("action-save")),
      );
      yield* ctx.expectEqual(
        "moving focus removes the first button's ring",
        Option.isNone(blurred.boxShadow),
        true,
      );
      ctx.host.click("action-disabled");
      yield* ctx.expectContains(
        "disabled and loading buttons refuse activation",
        read(ctx, "action-readout"),
        "activations=3",
      );

      const tree = yield* treeOf(ctx);
      const save = yield* node(ctx, tree, "Button", "Save changes");
      yield* ctx.expectContains(
        "the button carries its label and a Click action",
        Arr.join(
          Option.getOrElse(save.on_action, () => []),
          ",",
        ),
        "Click",
      );
      const loading = yield* node(ctx, tree, "Button", "Create project");
      yield* ctx.expectEqual(
        "the loading button announces itself",
        text(loading.description),
        "Loading",
      );

      ctx.host.click("action-toggle");
      yield* ctx.expectContains(
        "a click presses the toggle",
        read(ctx, "action-readout"),
        "pressed=true",
      );
      const pressedTree = yield* treeOf(ctx);
      const toggle = yield* node(ctx, pressedTree, "Button", "Grid");
      yield* ctx.expectEqual(
        "the toggle announces pressed",
        text(toggle.value),
        "pressed",
      );
      ctx.host.key("enter");
      yield* ctx.expectContains(
        "Enter releases the toggle",
        read(ctx, "action-readout"),
        "pressed=false",
      );
      const releasedTree = yield* treeOf(ctx);
      const released = yield* node(ctx, releasedTree, "Button", "Grid");
      yield* ctx.expectEqual(
        "the toggle announces not pressed",
        text(released.value),
        "not pressed",
      );
    }),
};

export const primitivesFieldsScenario: PlaygroundScenario = {
  id: "primitives-fields",
  title: "Tier 1: Input, Checkbox, Switch and Select in the real runtime",
  capability: "components",
  view: () => <FieldsProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      ctx.host.click("field-name");
      Arr.forEach(["a", "t", "l", "a", "s"], (key) => ctx.host.key(key));
      yield* ctx.expectContains(
        "a controlled Input receives the native edit",
        read(ctx, "field-readout"),
        "name=atlas",
      );

      ctx.host.key("enter");
      yield* ctx.expectContains(
        "Enter reaches onSubmit",
        read(ctx, "field-readout"),
        "submits=1",
      );

      ctx.host.click("field-locked");
      ctx.host.key("x");
      yield* ctx.expectContains(
        "a disabled Input refuses the edit",
        read(ctx, "field-readout"),
        "name=atlas",
      );
      const lockedTree = yield* treeOf(ctx);
      const locked = yield* node(ctx, lockedTree, "TextInput", "Locked");
      yield* ctx.expectEqual(
        "the disabled field still exposes its value",
        text(locked.value),
        "locked",
      );

      ctx.host.click("field-check");
      yield* ctx.expectContains(
        "a click checks the checkbox",
        read(ctx, "field-readout"),
        "checked=true",
      );
      const checkedTree = yield* treeOf(ctx);
      const checkbox = yield* node(
        ctx,
        checkedTree,
        "CheckBox",
        "Email notifications",
      );
      yield* ctx.expectEqual(
        "the checkbox announces checked",
        text(checkbox.value),
        "checked",
      );
      ctx.host.keyDown("field-check", "space");
      ctx.host.keyUp("field-check", "space");
      yield* ctx.expectContains(
        "Space unchecks the checkbox",
        read(ctx, "field-readout"),
        "checked=false",
      );

      ctx.host.click("field-switch");
      yield* ctx.expectContains(
        "a click switches the switch",
        read(ctx, "field-readout"),
        "paused=true",
      );
      const switchedTree = yield* treeOf(ctx);
      const paused = yield* node(ctx, switchedTree, "Switch", "Pause all");
      yield* ctx.expectEqual(
        "the switch announces checked",
        text(paused.value),
        "checked",
      );

      ctx.host.click("field-region");
      yield* ctx.expectContains(
        "the select paints its options",
        Arr.join(ctx.host.paintedText(), "\n"),
        "Asia — South",
      );
      ctx.host.key("down");
      ctx.host.key("enter");
      yield* ctx.expectContains(
        "arrow then Enter commits the next option",
        read(ctx, "field-readout"),
        "region=us-east",
      );
      yield* ctx.expectContains(
        "the trigger paints the chosen label",
        read(ctx, "field-region"),
        "United States — East",
      );

      ctx.host.click("field-region");
      ctx.host.key("escape");
      yield* ctx.expectEqual(
        "Escape closes the list",
        Arr.join(ctx.host.paintedText(), "\n").includes("Asia — South"),
        false,
      );
      yield* ctx.expectContains(
        "the dismissed list keeps the value",
        read(ctx, "field-readout"),
        "region=us-east",
      );
    }),
};

export const primitivesDisplayScenario: PlaygroundScenario = {
  id: "primitives-display",
  title: "Tier 1: Slider, Progress, Meter, Skeleton and Tooltip",
  capability: "components",
  view: () => <DisplayProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      ctx.host.click("display-quality");
      const value = Number(read(ctx, "display-quality-value"));
      yield* ctx.expectEqual(
        "the click set a value on the track",
        value >= 0 && value <= 100,
        true,
      );
      ctx.host.key("right");
      yield* ctx.expectContains(
        "Right steps the slider up by one",
        read(ctx, "display-readout"),
        `quality=${value + 1}`,
      );
      ctx.host.key("left");
      yield* ctx.expectContains(
        "Left steps it back",
        read(ctx, "display-readout"),
        `quality=${value}`,
      );
      const sliderTree = yield* treeOf(ctx);
      const slider = yield* node(ctx, sliderTree, "Slider", "Quality");
      yield* ctx.expectContains(
        "the slider announces its formatted value",
        text(slider.value),
        "%",
      );

      const progress = yield* node(
        ctx,
        sliderTree,
        "ProgressIndicator",
        "Upload",
      );
      yield* ctx.expectEqual(
        "Progress reports the clamped percentage",
        text(progress.value),
        "42%",
      );
      const meter = yield* node(ctx, sliderTree, "Meter", "Disk usage");
      yield* ctx.expectEqual(
        "Meter reports its formatted measurement",
        text(meter.value),
        "68 GB",
      );

      const skeleton = yield* ctx.expectSome(
        "the skeleton paints a box",
        Option.fromNullishOr(ctx.host.bounds("display-skeleton")),
      );
      yield* ctx.expectNear(
        "the skeleton keeps its height",
        skeleton.height,
        14,
        1,
      );
      const skeletonStyle = yield* ctx.expectSome(
        "the skeleton reports a background",
        Option.fromNullishOr(ctx.host.paintedStyle("display-skeleton")),
      );
      yield* ctx.expectEqual(
        "the skeleton background is a themed colour",
        Option.isSome(skeletonStyle.backgroundColor),
        true,
      );

      ctx.host.hover("display-trigger");
      yield* ctx.expectContains(
        "hovering the trigger opens the primitive tooltip",
        Arr.join(ctx.host.paintedText(), "\n"),
        "Booked revenue",
      );
    }),
};
