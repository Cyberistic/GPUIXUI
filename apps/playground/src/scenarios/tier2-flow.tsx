/**
 * `tier2-flow` — the shipped Tier 2 display, stepping and navigation components
 * from `@gpuixui/components`, mounted by a consumer and driven natively.
 *
 * The package's own suites prove each part; this scenario proves the consumer
 * path (the published root import through `tsconfig.vendor.json`, plan `330`
 * §3), the shipped token theme, and the gestures a user makes. Mechanisms
 * measured elsewhere are not re-probed: floating placement and snapping
 * (`floating-placement`, plan `156`), the native editor (`text-entry`, plan
 * `188`) and live key routing (`live-key-routing`, plan `345`).
 *
 * One measurement this scenario makes for the first time is Carousel's hiding
 * mechanism: it toggles `display: "none"` per slide, and `workspace-panes`
 * (plan `177`) measured that 0.10.0 ignores it. The carousel check asserts what
 * the runtime actually does, with a label that says so; the consequence is
 * recorded for `components` rather than papered over.
 */
import { useState } from "react";
import { Effect } from "effect";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import { useWindowSize } from "@gpuix/react";
import {
  Carousel,
  CarouselControl,
  CarouselSlide,
  CarouselTrack,
  ColorPicker,
  Countdown,
  KeyboardShortcut,
  KeyboardShortcuts,
  KeyboardShortcutsGroup,
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  Stepper,
  StepperStep,
  Timeline,
  TimelineItem,
} from "../../vendor/packages/components/src/index.js";
import { Button } from "../../vendor/packages/components/src/internal/button.js";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import { Body, Readout } from "../ui.js";
import type { PlaygroundScenario } from "../types.js";
import {
  ariaOf,
  fieldOf,
  focusedId,
  node,
  painted,
  read,
  styleOf,
  treeOf,
} from "./probes.js";

/** The slides the carousel steps through. */
const slides = ["One", "Two", "Three"] as const;

/** A reported colour token, or `"none"`. */
const tokenOf = (ctx: Smoke.SmokeContext, key: string): string =>
  Option.getOrElse(fieldOf(read(ctx, "tier2-flow-tokens"), key), () => "none");

/** A created colour, lower-cased, or `"none"`. */
const lowerTokenOf = (ctx: Smoke.SmokeContext, key: string): string =>
  Str.toLowerCase(tokenOf(ctx, key));

/** A painted text colour, or `"none"`. */
const colorOf = (ctx: Smoke.SmokeContext, testId: string): string =>
  Option.getOrElse(
    Option.flatMap(styleOf(ctx, testId), (style) => style.color),
    () => "none",
  );

/** A painted background, or `"none"`. */
const backgroundOf = (ctx: Smoke.SmokeContext, testId: string): string =>
  Option.getOrElse(
    Option.flatMap(styleOf(ctx, testId), (style) => style.backgroundColor),
    () => "none",
  );

/** Whether the accessibility node authored as `authorId` is selected. */
const selectedOf = (ctx: Smoke.SmokeContext, authorId: string): boolean =>
  Option.getOrElse(
    Option.flatMap(ariaOf(ctx, authorId), (entry) => entry.selected),
    () => false,
  );

const Probe = () => {
  const theme = useTheme();
  const window = useWindowSize();
  const [step, setStep] = useState(2);
  const [remaining, setRemaining] = useState(90_000);
  const [slide, setSlide] = useState(0);
  const [color, setColor] = useState("#000000");
  const [picked, setPicked] = useState<string | null>(null);

  const column = {
    display: "flex",
    flexDirection: "column" as const,
    gap: theme.spacing.lg,
    width: 460,
  };

  return (
    <div
      testId="tier2-flow-frame"
      style={{
        width: window.width,
        height: window.height,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.lg,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
      }}
    >
      <Body>shipped Tier 2 display and navigation</Body>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "flex-start",
          gap: theme.spacing.xl,
          flexGrow: 1,
        }}
      >
        <div style={column}>
          <Stepper value={step} label="Checkout">
            <StepperStep
              testId="step-account"
              aria-id="step-account"
              value={1}
              label="Account"
              description="Email and password"
            />
            <StepperStep
              testId="step-billing"
              aria-id="step-billing"
              value={2}
              label="Billing"
              description="Card and address"
            />
            <StepperStep
              testId="step-review"
              aria-id="step-review"
              value={3}
              label="Review"
            />
          </Stepper>
          <div style={{ display: "flex", flexDirection: "row", gap: 8 }}>
            <Button
              testId="step-back"
              onClick={() => setStep((current) => Math.max(1, current - 1))}
            >
              Back
            </Button>
            <Button
              testId="step-next"
              onClick={() => setStep((current) => Math.min(3, current + 1))}
            >
              Next
            </Button>
          </div>
          <Timeline testId="timeline" label="Deploy history">
            <TimelineItem
              testId="timeline-build"
              aria-id="timeline-build"
              title="Build started"
              timestamp="09:41"
              status="complete"
            />
            <TimelineItem
              testId="timeline-tests"
              aria-id="timeline-tests"
              title="Tests passed"
              description="412 tests, 0 failures"
              timestamp="09:44"
              status="current"
            />
            <TimelineItem
              testId="timeline-deploy"
              aria-id="timeline-deploy"
              title="Deploy"
              timestamp="—"
              status="upcoming"
            />
          </Timeline>
          <Countdown
            testId="countdown"
            remainingMs={remaining}
            label="Time remaining"
          />
          <div style={{ display: "flex", flexDirection: "row", gap: 8 }}>
            <Button
              testId="countdown-tick"
              onClick={() => setRemaining((current) => current - 61_000)}
            >
              Tick 61 s
            </Button>
            <Button testId="countdown-expire" onClick={() => setRemaining(0)}>
              Expire
            </Button>
          </div>
        </div>
        <div style={column}>
          <NavigationMenu label="Product">
            <NavigationMenuList>
              <NavigationMenuItem value="platform">
                <NavigationMenuTrigger
                  testId="trigger-platform"
                  aria-id="trigger-platform"
                >
                  Platform
                </NavigationMenuTrigger>
                <NavigationMenuContent testId="panel-platform">
                  <NavigationMenuLink
                    testId="link-overview"
                    onSelect={() => setPicked("overview")}
                  >
                    Overview
                  </NavigationMenuLink>
                  <NavigationMenuLink
                    testId="link-runtime"
                    onSelect={() => setPicked("runtime")}
                  >
                    Runtime
                  </NavigationMenuLink>
                </NavigationMenuContent>
              </NavigationMenuItem>
              <NavigationMenuItem value="pricing">
                <NavigationMenuTrigger
                  testId="trigger-pricing"
                  aria-id="trigger-pricing"
                >
                  Pricing
                </NavigationMenuTrigger>
                <NavigationMenuContent testId="panel-pricing">
                  <NavigationMenuLink
                    testId="link-plans"
                    onSelect={() => setPicked("plans")}
                  >
                    Plans
                  </NavigationMenuLink>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
          <div
            testId="flow-outside"
            tabIndex={0}
            style={{
              display: "flex",
              alignItems: "center",
              height: 28,
              paddingLeft: theme.spacing.sm,
              backgroundColor: theme.colors.muted,
              borderRadius: theme.radius.sm,
            }}
          >
            <text style={{ color: theme.colors.mutedForeground, fontSize: 12 }}>
              outside press target
            </text>
          </div>
          <KeyboardShortcuts label="Shortcuts">
            <KeyboardShortcutsGroup label="General">
              <KeyboardShortcut
                testId="shortcut-palette"
                label="Command palette"
                accelerator="mod+shift+p"
                platform="darwin"
              />
              <KeyboardShortcut
                testId="shortcut-palette-linux"
                label="Command palette"
                accelerator="mod+shift+p"
                platform="linux"
              />
            </KeyboardShortcutsGroup>
          </KeyboardShortcuts>
          <Carousel
            testId="carousel"
            label="Screenshots"
            value={slide}
            onValueChange={setSlide}
          >
            <CarouselTrack>
              {slides.map((title, index) => (
                <CarouselSlide key={title} testId={`slide-${index}`}>
                  <text
                    style={{ color: theme.colors.foreground, fontSize: 14 }}
                  >
                    {title}
                  </text>
                </CarouselSlide>
              ))}
            </CarouselTrack>
            <div style={{ display: "flex", flexDirection: "row", gap: 8 }}>
              <CarouselControl direction="previous" testId="slide-prev" />
              <CarouselControl direction="next" testId="slide-next" />
            </div>
          </Carousel>
          <ColorPicker
            testId="picker"
            label="Accent colour"
            value={color}
            onValueChange={setColor}
          />
          <div
            testId="picker-elsewhere"
            tabIndex={0}
            style={{
              display: "flex",
              alignItems: "center",
              height: 28,
              paddingLeft: theme.spacing.sm,
              backgroundColor: theme.colors.muted,
              borderRadius: theme.radius.sm,
            }}
          >
            <text style={{ color: theme.colors.mutedForeground, fontSize: 12 }}>
              another field
            </text>
          </div>
        </div>
      </div>
      <Readout testId="tier2-flow-readout">
        {`step=${step} remaining=${remaining} slide=${slide} color=${color} picked=${
          picked ?? "none"
        }`}
      </Readout>
      <Readout testId="tier2-flow-tokens">
        {`foreground=${theme.colors.foreground} muted=${theme.colors.mutedForeground} accent=${theme.colors.accent}`}
      </Readout>
    </div>
  );
};

export const tier2FlowScenario: PlaygroundScenario = {
  id: "tier2-flow",
  title:
    "Tier 2 flow: Stepper, Timeline, Countdown, KeyboardShortcuts, Carousel, ColorPicker and NavigationMenu",
  capability: "tier2",
  view: () => <Probe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      yield* ctx.expectSome(
        "the flow frame is painted",
        painted(ctx, "tier2-flow-frame"),
      );

      // 1. Stepper: derived statuses and the consumer's step control.
      yield* ctx.expectContains(
        "the first step paints its description",
        read(ctx, "step-account"),
        "Email and password",
      );
      yield* ctx.expectEqual(
        "a completed step is not the current one",
        selectedOf(ctx, "step-account"),
        false,
      );
      yield* ctx.expectEqual(
        "the current step is announced as selected",
        selectedOf(ctx, "step-billing"),
        true,
      );
      yield* ctx.expectEqual(
        "an upcoming step is not selected",
        selectedOf(ctx, "step-review"),
        false,
      );
      ctx.host.click("step-next");
      yield* ctx.expectContains(
        "the consumer's control moves the value",
        read(ctx, "tier2-flow-readout"),
        "step=3",
      );
      yield* ctx.expectEqual(
        "the last step becomes current",
        selectedOf(ctx, "step-review"),
        true,
      );
      yield* ctx.expectEqual(
        "the previous step stops being current",
        selectedOf(ctx, "step-billing"),
        false,
      );

      // 2. Timeline: order, text and the current event.
      const tree = yield* treeOf(ctx);
      yield* node(ctx, tree, "List", "Deploy history");
      const build = yield* ctx.expectSome(
        "the first event is painted",
        painted(ctx, "timeline-build"),
      );
      const tests = yield* ctx.expectSome(
        "the current event is painted",
        painted(ctx, "timeline-tests"),
      );
      const deploy = yield* ctx.expectSome(
        "the last event is painted",
        painted(ctx, "timeline-deploy"),
      );
      yield* ctx.expectEqual(
        "the events stack in declaration order",
        build.y < tests.y && tests.y < deploy.y,
        true,
      );
      yield* ctx.expectContains(
        "the event paints its description",
        read(ctx, "timeline-tests"),
        "412 tests, 0 failures",
      );
      yield* ctx.expectEqual(
        "exactly the current event is selected",
        selectedOf(ctx, "timeline-tests"),
        true,
      );
      yield* ctx.expectEqual(
        "an upcoming event is not selected",
        selectedOf(ctx, "timeline-deploy"),
        false,
      );

      // 3. Countdown: formatting, a consumer tick and expiry.
      yield* ctx.expectEqual(
        "the remaining time formats as clock text",
        read(ctx, "countdown"),
        "01:30",
      );
      yield* ctx.expectEqual(
        "a live countdown paints the foreground role",
        colorOf(ctx, "countdown"),
        tokenOf(ctx, "foreground"),
      );
      ctx.host.click("countdown-tick");
      yield* ctx.expectContains(
        "a consumer tick repaints a new value",
        read(ctx, "tier2-flow-readout"),
        "remaining=29000",
      );
      yield* ctx.expectEqual(
        "the new value is formatted",
        read(ctx, "countdown"),
        "00:29",
      );
      ctx.host.click("countdown-expire");
      yield* ctx.expectEqual(
        "an expired countdown reads zero",
        read(ctx, "countdown"),
        "00:00",
      );
      yield* ctx.expectEqual(
        "an expired countdown paints the muted role",
        colorOf(ctx, "countdown"),
        tokenOf(ctx, "muted"),
      );

      // 4. KeyboardShortcuts: the display is platform-explicit.
      yield* node(ctx, tree, "List", "Shortcuts");
      yield* node(ctx, tree, "Group", "General");
      yield* ctx.expectContains(
        "a darwin row draws the command glyphs",
        read(ctx, "shortcut-palette"),
        "Command palette⌘⇧P",
      );
      yield* ctx.expectContains(
        "a linux row draws the named modifiers",
        read(ctx, "shortcut-palette-linux"),
        "Command paletteCtrlShiftP",
      );
      yield* ctx.expectEqual(
        "the linux row carries no command glyph",
        Str.includes("⌘")(read(ctx, "shortcut-palette-linux")),
        false,
      );

      // 5. Carousel: stepping, clamping and the measured hiding mechanism.
      yield* ctx.expectSome("the active slide paints", painted(ctx, "slide-0"));
      yield* ctx.expectEqual(
        "an inactive slide is still retained by the runtime (display: none is a no-op on 0.10.0)",
        Option.isSome(painted(ctx, "slide-2")),
        true,
      );
      ctx.host.click("slide-next");
      yield* ctx.expectContains(
        "Next steps the carousel",
        read(ctx, "tier2-flow-readout"),
        "slide=1",
      );
      ctx.host.click("slide-next");
      yield* ctx.expectContains(
        "Next reaches the last slide",
        read(ctx, "tier2-flow-readout"),
        "slide=2",
      );
      ctx.host.click("slide-next");
      yield* ctx.expectContains(
        "Next clamps at the last slide",
        read(ctx, "tier2-flow-readout"),
        "slide=2",
      );
      ctx.host.click("slide-prev");
      yield* ctx.expectContains(
        "Previous steps back",
        read(ctx, "tier2-flow-readout"),
        "slide=1",
      );
      // A control keeps native focus, so the arrows reach the carousel's own
      // key handler through the ancestor chain (measured by plan 345).
      ctx.host.key("end");
      yield* ctx.expectContains(
        "End jumps to the last slide",
        read(ctx, "tier2-flow-readout"),
        "slide=2",
      );
      ctx.host.key("home");
      yield* ctx.expectContains(
        "Home jumps to the first slide",
        read(ctx, "tier2-flow-readout"),
        "slide=0",
      );
      ctx.host.key("right");
      yield* ctx.expectContains(
        "Right steps forward",
        read(ctx, "tier2-flow-readout"),
        "slide=1",
      );

      // 6. ColorPicker: swatch, normalised hex, invalid draft.
      const accent = lowerTokenOf(ctx, "accent");
      ctx.host.click("picker-swatch-2");
      yield* ctx.expectContains(
        "a swatch reports the normalised theme colour",
        read(ctx, "tier2-flow-readout"),
        `color=${accent}`,
      );
      yield* ctx.expectEqual(
        "the preview paints the committed colour",
        backgroundOf(ctx, "picker-preview"),
        accent,
      );
      ctx.host.click("picker-hex");
      ctx.host.key("cmd-a");
      ctx.host.key("a b c");
      ctx.host.key("enter");
      yield* ctx.expectContains(
        "a shorthand hex is expanded on commit",
        read(ctx, "tier2-flow-readout"),
        "color=#aabbcc",
      );
      ctx.host.click("picker-hex");
      ctx.host.key("cmd-a");
      ctx.host.key("z z z");
      ctx.host.key("enter");
      yield* ctx.expectContains(
        "an invalid draft is not committed",
        read(ctx, "tier2-flow-readout"),
        "color=#aabbcc",
      );
      ctx.host.click("picker-elsewhere");
      yield* ctx.expectContains(
        "blur reverts an invalid draft",
        read(ctx, "tier2-flow-readout"),
        "color=#aabbcc",
      );

      // 7. NavigationMenu: one panel, pointer and keyboard, dismissal.
      yield* ctx.expectEqual(
        "the nav starts closed",
        Option.isNone(painted(ctx, "panel-platform")),
        true,
      );
      ctx.host.click("trigger-platform");
      const panel = yield* ctx.expectSome(
        "a press opens that item's panel",
        painted(ctx, "panel-platform"),
      );
      const trigger = yield* ctx.expectSome(
        "the nav trigger is painted",
        painted(ctx, "trigger-platform"),
      );
      yield* ctx.expectEqual(
        "the panel opens below its trigger",
        panel.y >= trigger.y + trigger.height,
        true,
      );
      yield* ctx.expectEqual(
        "the open trigger reports expanded",
        Option.getOrElse(
          Option.flatMap(
            ariaOf(ctx, "trigger-platform"),
            (entry) => entry.expanded,
          ),
          () => false,
        ),
        true,
      );
      ctx.host.click("trigger-pricing");
      yield* ctx.expectSome(
        "a second trigger opens its own panel",
        painted(ctx, "panel-pricing"),
      );
      yield* ctx.expectEqual(
        "exactly one panel is open",
        Option.isNone(painted(ctx, "panel-platform")),
        true,
      );
      ctx.host.key("escape");
      yield* ctx.expectEqual(
        "Escape closes the panel",
        Option.isNone(painted(ctx, "panel-pricing")),
        true,
      );
      yield* ctx.expectEqual(
        "Escape returns focus to the trigger",
        focusedId(ctx),
        "trigger-pricing",
      );
      ctx.host.key("left");
      yield* ctx.expectEqual(
        "Left moves focus between triggers",
        focusedId(ctx),
        "trigger-platform",
      );
      yield* ctx.expectEqual(
        "moving focus does not open a panel",
        Option.isNone(painted(ctx, "panel-platform")),
        true,
      );
      ctx.host.key("down");
      yield* ctx.expectSome(
        "ArrowDown opens the focused item",
        painted(ctx, "panel-platform"),
      );
      yield* ctx.expectEqual(
        "ArrowDown takes focus into the panel",
        focusedId(ctx),
        "panel-platform",
      );
      ctx.host.click("link-overview");
      yield* ctx.expectContains(
        "a link runs and reports its own value",
        read(ctx, "tier2-flow-readout"),
        "picked=overview",
      );
      yield* ctx.expectEqual(
        "choosing a link closes the panel",
        Option.isNone(painted(ctx, "panel-platform")),
        true,
      );
      ctx.host.click("trigger-platform");
      yield* ctx.expectSome("the nav reopens", painted(ctx, "panel-platform"));
      ctx.host.click("flow-outside");
      yield* ctx.expectEqual(
        "an outside press closes the nav",
        Option.isNone(painted(ctx, "panel-platform")),
        true,
      );
    }),
};
