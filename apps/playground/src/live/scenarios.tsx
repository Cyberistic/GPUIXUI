/**
 * The live probes: one real-window view and one `steps` effect each.
 *
 * A probe is deliberately **not** a headless scenario: a window's automation
 * API is asynchronous and its renderer reports no style, so a probe asserts
 * focus and captures paint states as screenshots. The checks are still the
 * shared `Smoke` ones, so both suites emit one report shape.
 */
import type { ReactNode } from "react";
import { useLayoutEffect, useRef, useState } from "react";
import { Duration, Effect } from "effect";
import * as Option from "effect/Option";
import { keyboardFocusRing, textStyle, type FontSource } from "@gpuixui/tokens";
import {
  CommandMenu,
  CommandMenuEmpty,
  CommandMenuInput,
  CommandMenuList,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ToastProvider,
  ToastViewport,
  useToast,
  type CommandAction,
} from "@gpuixui/components";
import {
  Button,
  Checkbox,
  Input,
  ThemeProvider as PrimitiveThemeProvider,
} from "@gpuixui/primitives";
import { useTheme } from "@gpuixui/tokens/react";
import { useWindowSize } from "@gpuix/react";
import type { ImgInstance } from "@gpuix/react";
import { FloatingLayer } from "@gpuix/react/floating";
import { Pixels, type Smoke } from "@gpuixui/testing";
import { palettes } from "../palettes.js";
import type { LiveProbeId } from "./registry.js";
import {
  BUFFER_COLOUR,
  CANVAS_PARENT,
  CHART_SVG,
  hexOf,
  IMAGE_COLOUR,
  IMAGE_DATA_URL,
  IMAGE_SIZE,
  imagePixels,
  LAYER_SHAPES,
  layerColour,
  layerSvg,
  SOURCE_FILL,
  SVG_TINT,
  type Rgb,
} from "./content.js";
import {
  MISSING_FAMILY,
  SQUARE_BYTES,
  SQUARE_FACE,
  SQUARE_FAMILY,
  SQUARE_SIZE,
  SQUARE_WORD,
  SQUARE_WORD_WIDTH,
} from "./fonts.js";

/** Long enough for one paint after an input reaches the window. */
const SETTLE = Duration.millis(40);

/** One focusable sample; every sample carries the ring the library ships. */
const Sample = ({
  testId,
  label,
}: {
  readonly testId: string;
  readonly label: string;
}): ReactNode => {
  const theme = useTheme();
  return (
    <div
      testId={testId}
      tabIndex={0}
      role="button"
      style={{
        width: 240,
        padding: theme.spacing.lg,
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.muted,
        ...keyboardFocusRing(theme),
      }}
    >
      <text
        style={{
          ...textStyle(theme, "body"),
          color: theme.colors.foreground,
        }}
      >
        {label}
      </text>
    </div>
  );
};

const FocusVisibleProbe = (): ReactNode => {
  const theme = useTheme();
  return (
    <div
      testId="focus-visible-probe"
      style={{
        width: 720,
        height: 360,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.lg,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        The ring is focusVisible: it should appear only after keyboard input.
      </text>
      <Sample testId="press-ring" label="press target" />
      <Sample testId="tab-ring" label="tab target" />
      <Sample testId="programmatic-ring" label="programmatic target" />
    </div>
  );
};

/** One sample with the runtime's default focus dimming, or opted out. */
const DimSample = ({
  testId,
  label,
  keyboardFocusDim,
}: {
  readonly testId: string;
  readonly label: string;
  readonly keyboardFocusDim?: boolean;
}): ReactNode => {
  const theme = useTheme();
  return (
    <div
      testId={testId}
      tabIndex={0}
      role="button"
      style={{
        width: 240,
        padding: theme.spacing.lg,
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.muted,
        keyboardFocusDim,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "body"),
          color: theme.colors.foreground,
        }}
      >
        {label}
      </text>
    </div>
  );
};

/**
 * Three identical samples, one opted out of the runtime's focus dimming.
 *
 * The outside pair models "the rest of the window" while the keyboard focus is
 * elsewhere; the third shows the per-element opt-out the runtime documents.
 */
const FocusDimProbe = (): ReactNode => {
  const theme = useTheme();
  return (
    <div
      testId="focus-dim-probe"
      style={{
        width: 720,
        height: 360,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.lg,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        keyboardFocusDim: the first sample dims, the third opts out.
      </text>
      <DimSample testId="dim-first" label="dims on Tab" />
      <DimSample testId="dim-second" label="takes focus on Tab" />
      <DimSample
        testId="dim-opt-out"
        label="opts out of dimming"
        keyboardFocusDim={false}
      />
    </div>
  );
};

/** One sample of `SQUARE_WORD` at the probe's size, in `family` or the default. */
const FaceSample = ({
  testId,
  family,
}: {
  readonly testId: string;
  readonly family?: string;
}): ReactNode => {
  const theme = useTheme();
  return (
    <div style={{ display: "flex", flexDirection: "row" }}>
      <text
        testId={testId}
        style={{
          ...textStyle(theme, "body"),
          fontFamily: family,
          fontSize: SQUARE_SIZE,
          color: theme.colors.foreground,
        }}
      >
        {SQUARE_WORD}
      </text>
    </div>
  );
};

/**
 * The same word three ways: the theme's family, a family no runtime knows, and
 * the family the runner registered before this view first painted.
 *
 * The unknown name is the control: it proves the family *string* changes
 * nothing on its own, so a width difference in the third row is the font file,
 * not the style.
 */
const RegisterFontProbe = (): ReactNode => {
  const theme = useTheme();
  return (
    <div
      testId="register-font-probe"
      style={{
        width: 720,
        height: 320,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.lg,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        The third word paints the installed face's own advances.
      </text>
      <FaceSample testId="face-default" />
      <FaceSample testId="face-missing" family={MISSING_FAMILY} />
      <FaceSample testId="face-registered" family={SQUARE_FAMILY} />
    </div>
  );
};

/**
 * Text naming a family the renderer does not know yet, and a control that
 * repaints it.
 *
 * Nothing installs the face before this view mounts — that is the measurement.
 * The probe installs it afterwards and presses the re-layout control, so the
 * second width is the same text laid out again by a runtime that now knows the
 * family. The tint alternates on every press, so the node's style really
 * changes: a re-render that skips an unchanged node could not hide the
 * measurement behind a reconciler bail-out.
 */
const LateRegistrationProbe = (): ReactNode => {
  const theme = useTheme();
  const [relayouts, setRelayouts] = useState(0);
  const tint =
    relayouts % 2 === 0
      ? theme.colors.foreground
      : theme.colors.mutedForeground;
  const sample = {
    ...textStyle(theme, "body"),
    fontSize: SQUARE_SIZE,
    color: tint,
  };
  return (
    <div
      testId="font-late-probe"
      style={{
        width: 720,
        height: 320,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.lg,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        The face arrives after this text first painted.
      </text>
      <div style={{ display: "flex", flexDirection: "row" }}>
        <text
          testId="late-face"
          style={{ ...sample, fontFamily: SQUARE_FAMILY }}
        >
          {SQUARE_WORD}
        </text>
      </div>
      <div style={{ display: "flex", flexDirection: "row" }}>
        <text
          testId="late-control"
          style={{ ...sample, fontFamily: MISSING_FAMILY }}
        >
          {SQUARE_WORD}
        </text>
      </div>
      <div
        testId="late-relayout"
        role="button"
        tabIndex={0}
        onClick={() => setRelayouts((count) => count + 1)}
        style={{
          width: 240,
          padding: theme.spacing.md,
          borderRadius: theme.radius.md,
          backgroundColor: theme.colors.muted,
        }}
      >
        <text
          testId="late-relayouts"
          style={{
            ...textStyle(theme, "body"),
            color: theme.colors.foreground,
          }}
        >
          {`relayouts=${relayouts}`}
        </text>
      </div>
    </div>
  );
};

/**
 * Three anchors in a real window, one per placement this probe asks about.
 *
 * The headless `floating-placement` scenario proves the same engine against the
 * `TestRenderer`. A window can differ (it did for the tabs indicator), and the
 * left/right sides plus the `align="center"` quirk were never measured live, so
 * each anchor mounts its own layer: `side=right`, `side=left`, and
 * `side=right align=center` — the state every menu compensates for.
 */
const FloatingSidesProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const place = { left: 260, width: 120, height: 40 } as const;
  const panel = (testId: string): ReactNode => (
    <div
      testId={testId}
      style={{
        width: 160,
        height: 80,
        padding: theme.spacing.sm,
        pointerEvents: "auto",
        backgroundColor: theme.colors.popover,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.sm,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.foreground,
        }}
      >
        panel
      </text>
    </div>
  );
  const anchor = (testId: string, top: number, layer: ReactNode): ReactNode => (
    <div
      testId={testId}
      role="button"
      tabIndex={0}
      style={{
        position: "absolute",
        left: place.left,
        top,
        width: place.width,
        height: place.height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.colors.muted,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.foreground,
        }}
      >
        {testId}
      </text>
      {layer}
    </div>
  );

  return (
    <div
      testId="float-live-window"
      style={{
        width: window.width,
        height: window.height,
        position: "relative",
        backgroundColor: theme.colors.background,
      }}
    >
      {anchor(
        "anchor-right",
        80,
        <FloatingLayer side="right" align="start" sideOffset={GAP}>
          {panel("panel-right")}
        </FloatingLayer>,
      )}
      {anchor(
        "anchor-left",
        220,
        <FloatingLayer side="left" align="start" sideOffset={GAP}>
          {panel("panel-left")}
        </FloatingLayer>,
      )}
      {anchor(
        "anchor-centre",
        360,
        <FloatingLayer side="right" align="center" sideOffset={GAP}>
          {panel("panel-centre")}
        </FloatingLayer>,
      )}
    </div>
  );
};

/**
 * The library's own `Input`, wired to a readout.
 *
 * The readout is the proof: it shows the value React received through
 * `onChange`, so a keystroke that the window delivered but the component
 * swallowed fails by name rather than by a screenshot nobody reads.
 */
const TextInputProbe = (): ReactNode => {
  const theme = useTheme();
  const [value, setValue] = useState("");
  const [submits, setSubmits] = useState(0);
  return (
    <PrimitiveThemeProvider theme={palettes.dark}>
      <div
        testId="text-input-probe"
        style={{
          width: 480,
          height: 240,
          padding: theme.spacing.xl,
          backgroundColor: theme.colors.background,
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.lg,
        }}
      >
        <text
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.mutedForeground,
          }}
        >
          The shipped Input: typing reaches onChange, Enter reaches onSubmit.
        </text>
        <Input
          testId="input-field"
          label="Name"
          placeholder="type here"
          value={value}
          onChange={setValue}
          onSubmit={() => setSubmits((count) => count + 1)}
        />
        <text
          testId="input-readout"
          style={{
            ...textStyle(theme, "body"),
            color: theme.colors.foreground,
          }}
        >
          {`value=${value} submits=${submits}`}
        </text>
      </div>
    </PrimitiveThemeProvider>
  );
};

/**
 * The library's own `Checkbox`: a press and a Space key each toggle it, with a
 * readout that prints the state React received.
 *
 * Both paths matter in a window rather than in the offscreen renderer: the press
 * proves the painted box is hit-testable, and Space proves the runtime routes the
 * key to a focused `div role="checkbox"` — the component's own keyboard
 * contract, not a host element's.
 */
const CheckboxProbe = (): ReactNode => {
  const theme = useTheme();
  const [checked, setChecked] = useState(false);
  const [changes, setChanges] = useState(0);
  return (
    <PrimitiveThemeProvider theme={palettes.dark}>
      <div
        testId="checkbox-probe"
        style={{
          width: 480,
          height: 240,
          padding: theme.spacing.xl,
          backgroundColor: theme.colors.background,
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.lg,
        }}
      >
        <text
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.mutedForeground,
          }}
        >
          The shipped Checkbox: a press and Space each report a change.
        </text>
        <Checkbox
          testId="checkbox-field"
          label="Enable telemetry"
          checked={checked}
          onCheckedChange={(next) => {
            setChecked(next);
            setChanges((count) => count + 1);
          }}
        />
        <text
          testId="checkbox-readout"
          style={{
            ...textStyle(theme, "body"),
            color: theme.colors.foreground,
          }}
        >
          {`checked=${checked} changes=${changes}`}
        </text>
      </div>
    </PrimitiveThemeProvider>
  );
};

/**
 * The shipped `Dialog` from `@gpuixui/components`, with a readout of what its
 * `onOpenChange` reported.
 *
 * The readout is the proof the probe is not just seeing a painted box: React has
 * to have received both transitions, and the trigger has to be the opener that
 * gets focus back. The dialog is uncontrolled, so the component owns the state a
 * consumer would otherwise wire by hand.
 */
const DialogProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const [opens, setOpens] = useState(0);
  const [closes, setCloses] = useState(0);
  return (
    <div
      testId="dialog-probe"
      style={{
        width: window.width,
        height: window.height,
        position: "relative",
        backgroundColor: theme.colors.background,
      }}
    >
      <div
        style={{
          width: 720,
          padding: theme.spacing.xl,
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.lg,
        }}
      >
        <text
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.mutedForeground,
          }}
        >
          The shipped Dialog: a press opens it, Escape and Close dismiss it.
        </text>
        <div style={{ display: "flex", flexDirection: "row" }}>
          <Dialog
            onOpenChange={(open) => {
              if (open) setOpens((count) => count + 1);
              else setCloses((count) => count + 1);
            }}
          >
            <DialogTrigger testId="dialog-trigger">Open dialog</DialogTrigger>
            <DialogContent label="Delete project" testId="dialog-content">
              <DialogHeader>
                <DialogTitle>Delete this project?</DialogTitle>
                <DialogDescription>
                  The sample project cannot be restored.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose testId="dialog-confirm">Delete</DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <text
          testId="dialog-readout"
          style={{
            ...textStyle(theme, "body"),
            color: theme.colors.foreground,
          }}
        >
          {`opens=${opens} closes=${closes}`}
        </text>
      </div>
    </div>
  );
};

/**
 * The shipped `DropdownMenu`: opened from the keyboard at its first row, moved
 * with the arrow keys, activated with Enter, and closed by a pointer press.
 *
 * A menu's highlight is real focus, so every step reads the renderer's focus id
 * rather than a painted colour: an arrow key that moves a highlight without
 * moving focus would fail here.
 */
const MenuProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const [last, setLast] = useState("none");
  return (
    <div
      testId="menu-probe"
      style={{
        width: window.width,
        height: window.height,
        position: "relative",
        backgroundColor: theme.colors.background,
      }}
    >
      <div
        style={{
          width: 720,
          padding: theme.spacing.xl,
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.lg,
        }}
      >
        <text
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.mutedForeground,
          }}
        >
          The shipped DropdownMenu: keyboard open, arrows, Enter and a press.
        </text>
        <div style={{ display: "flex", flexDirection: "row" }}>
          <DropdownMenu>
            <DropdownMenuTrigger testId="menu-trigger">
              Actions
            </DropdownMenuTrigger>
            <DropdownMenuContent label="File actions" testId="menu-content">
              <DropdownMenuItem
                testId="menu-rename"
                onSelect={() => setLast("rename")}
              >
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                testId="menu-delete"
                tone="destructive"
                onSelect={() => setLast("delete")}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <text
          testId="menu-readout"
          style={{
            ...textStyle(theme, "body"),
            color: theme.colors.foreground,
          }}
        >
          {`last=${last}`}
        </text>
      </div>
    </div>
  );
};

/** The panel a `useToast` caller lives in: one push control and a queue count. */
const ToastPanel = (): ReactNode => {
  const theme = useTheme();
  const toast = useToast();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.lg,
      }}
    >
      <div style={{ display: "flex", flexDirection: "row" }}>
        <PrimitiveThemeProvider theme={palettes.dark}>
          <Button
            testId="toast-push"
            onActivate={() =>
              toast.push({
                title: "Changes published",
                description: "The site rebuilds in about a minute.",
                tone: "success",
              })
            }
          >
            Publish
          </Button>
        </PrimitiveThemeProvider>
      </div>
      <text
        testId="toast-readout"
        style={{
          ...textStyle(theme, "body"),
          color: theme.colors.foreground,
        }}
      >
        {`queued=${toast.toasts.length}`}
      </text>
    </div>
  );
};

/**
 * The shipped toast system: a press queues a toast into the viewport, and its
 * dismiss control removes it.
 *
 * The provider owns the store and its own `ManagedRuntime`, so this probe also
 * proves that an Effect-backed store runs inside a real window rather than only
 * under the test clock. The viewport is the last child, as its paint-order
 * contract requires.
 */
const ToastProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  return (
    <div
      testId="toast-probe"
      style={{
        width: window.width,
        height: window.height,
        position: "relative",
        backgroundColor: theme.colors.background,
      }}
    >
      <ToastProvider>
        <div
          style={{
            width: 720,
            height: 360,
            padding: theme.spacing.xl,
            display: "flex",
            flexDirection: "column",
            gap: theme.spacing.lg,
          }}
        >
          <text
            style={{
              ...textStyle(theme, "caption"),
              color: theme.colors.mutedForeground,
            }}
          >
            The shipped Toasts: a press queues one, its dismiss control removes
            it.
          </text>
          <ToastPanel />
        </div>
        <ToastViewport />
      </ToastProvider>
    </div>
  );
};

/**
 * The shipped `Popover` — a floating panel anchored to its trigger.
 *
 * Three popovers, because placement is three claims: the default one opens
 * below its trigger on the trigger's start edge, the second asks for `center`
 * (which the runtime centres on the containing block, so the component measures
 * and compensates), and the third sits where a panel below it would not fit.
 */
const PopoverProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const [presses, setPresses] = useState(0);
  return (
    <div
      testId="popover-probe"
      style={{
        width: window.width,
        height: window.height,
        position: "relative",
        backgroundColor: theme.colors.background,
      }}
    >
      <div
        style={{
          width: 720,
          padding: theme.spacing.xl,
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.lg,
        }}
      >
        <text
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.mutedForeground,
          }}
        >
          The shipped Popover: where it opens, and how it leaves.
        </text>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            gap: theme.spacing.xl,
            alignItems: "flex-start",
          }}
        >
          <Popover>
            <PopoverTrigger testId="popover-trigger">Filters</PopoverTrigger>
            <PopoverContent testId="popover-panel">
              <text testId="popover-panel-text">Visible columns</text>
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger testId="popover-center-trigger">
              Centred
            </PopoverTrigger>
            <PopoverContent testId="popover-center-panel" align="center">
              <text>Centred on the trigger</text>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      {/* Top-right, where no panel below a trigger can cover it: a press that
          lands on a panel is an inside press, so the outside-press check needs
          a target the panels cannot reach. */}
      <div
        style={{
          position: "absolute",
          right: 40,
          top: 40,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.md,
        }}
      >
        <PrimitiveThemeProvider theme={palettes.dark}>
          <Button
            testId="popover-elsewhere"
            onActivate={() => setPresses((n) => n + 1)}
          >
            Elsewhere
          </Button>
        </PrimitiveThemeProvider>
        <text
          testId="popover-elsewhere-readout"
          style={{
            ...textStyle(theme, "body"),
            color: theme.colors.foreground,
          }}
        >
          {`presses=${presses}`}
        </text>
      </div>
      {/* Low in the window, with a panel too tall to fit below the trigger.
          The wrapper is a child of the root on purpose: an absolute element
          resolves against its **direct** parent, so it has to be the root for
          `bottom` to mean the bottom of the window. */}
      <div
        style={{
          position: "absolute",
          left: 40,
          bottom: 40,
        }}
      >
        <Popover>
          <PopoverTrigger testId="popover-low-trigger">Low</PopoverTrigger>
          <PopoverContent testId="popover-low-panel" style={{ height: 220 }}>
            <text>Above the trigger</text>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

/**
 * Measures the shipped popover's placement and its dismissal rules in a window.
 *
 * The placement claims are the ones the runtime got wrong: `align="center"` ends
 * the panel on the trigger's centre line, and a snapped panel near the window
 * edge lands **on** its trigger instead of flipping. The component measures both
 * and compensates, so the checks here are about the compensation, in the
 * runtime the compensation was tuned for.
 */
const popoverSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    /** Whether `testId` is absent from the window's tree. */
    const unpainted = (
      testId: string,
    ): Effect.Effect<boolean, Smoke.SmokeHostError> =>
      Effect.map(ctx.host.bounds(testId), (bounds) =>
        Option.isNone(Option.fromNullishOr(bounds)),
      );

    yield* ctx.host.waitFor("popover-trigger");

    // The default placement: below the trigger, on its start edge, one gap down.
    yield* ctx.host.click("popover-trigger");
    yield* Effect.sleep(SETTLE);
    const trigger = yield* paintedBox(ctx, "popover-trigger");
    const panel = yield* paintedBox(ctx, "popover-panel");
    yield* ctx.expectEqual(
      "the panel opens below its trigger",
      panel.y >= trigger.y + trigger.height,
      true,
    );
    yield* ctx.expectNear(
      "the panel starts at the trigger's start edge",
      panel.x,
      trigger.x,
      1,
    );
    yield* ctx.expectNear(
      "the panel keeps the measured gap below the trigger",
      panel.y - (trigger.y + trigger.height),
      6,
      1,
    );
    yield* ctx.host.capture("popover-open");

    // `center`, which the runtime centres on the containing block.
    yield* ctx.host.key("escape");
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.click("popover-center-trigger");
    yield* Effect.sleep(SETTLE);
    const centreTrigger = yield* paintedBox(ctx, "popover-center-trigger");
    const centrePanel = yield* paintedBox(ctx, "popover-center-panel");
    yield* ctx.expectNear(
      "a centred panel is centred on its trigger",
      centrePanel.x + centrePanel.width / 2,
      centreTrigger.x + centreTrigger.width / 2,
      1,
    );
    yield* ctx.host.capture("popover-centred");

    // A trigger with no room below it.
    yield* ctx.host.key("escape");
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.click("popover-low-trigger");
    yield* Effect.sleep(SETTLE);
    const lowTrigger = yield* paintedBox(ctx, "popover-low-trigger");
    const lowPanel = yield* paintedBox(ctx, "popover-low-panel");
    yield* ctx.expectEqual(
      "a panel with no room below opens above its trigger",
      lowPanel.y + lowPanel.height <= lowTrigger.y,
      true,
    );
    yield* ctx.host.capture("popover-flipped");
    yield* ctx.host.key("escape");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Escape gives the focus back to the trigger that opened it",
      yield* focusedAfterPaint(ctx),
      "popover-low-trigger",
    );

    // The dismissal rules, on the first popover.
    yield* ctx.host.click("popover-trigger");
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.key("escape");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Escape dismisses the panel",
      yield* unpainted("popover-panel"),
      true,
    );
    yield* ctx.expectEqual(
      "Escape returns the focus to the trigger",
      yield* focusedAfterPaint(ctx),
      "popover-trigger",
    );

    yield* ctx.host.click("popover-trigger");
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.click("popover-elsewhere");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the outside press reaches the control it landed on",
      yield* ctx.host.text("popover-elsewhere-readout"),
      "presses=1",
    );
    yield* ctx.expectEqual(
      "a press outside dismisses the panel",
      yield* unpainted("popover-panel"),
      true,
    );

    yield* ctx.host.click("popover-trigger");
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.click("popover-panel-text");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a press inside the panel leaves it open",
      yield* unpainted("popover-panel"),
      false,
    );
  });

/**
 * The shipped `CommandMenu` — the Tier 4 command palette — over four actions.
 *
 * The palette is controlled and has no trigger part: the application opens it
 * from a shortcut or from its own control, so the probe's button stands in for
 * that shortcut. The readout is React's report of what ran, which is the
 * difference between a highlighted row and an executed one.
 *
 * The fourth action is disabled: it paints, and it runs nothing — the
 * difference a menu with only enabled rows cannot show.
 */
const CommandPaletteProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const [open, setOpen] = useState(false);
  const [ran, setRan] = useState("none");
  const [runs, setRuns] = useState(0);
  const record = (id: string) => () => {
    setRan(id);
    setRuns((count) => count + 1);
  };

  const actions: ReadonlyArray<CommandAction> = [
    {
      id: "new-file",
      label: "New File",
      group: "File",
      shortcut: "⌘N",
      perform: record("new-file"),
    },
    {
      id: "open-settings",
      label: "Open Settings",
      group: "File",
      shortcut: "⌘,",
      perform: record("open-settings"),
    },
    {
      id: "theme",
      label: "Toggle Theme",
      group: "View",
      perform: record("theme"),
    },
    {
      id: "zoom",
      label: "Reset Zoom",
      group: "View",
      disabled: true,
      perform: record("zoom"),
    },
  ];
  return (
    <div
      testId="command-palette-probe"
      style={{
        width: window.width,
        height: window.height,
        position: "relative",
        backgroundColor: theme.colors.background,
      }}
    >
      <div
        style={{
          width: 720,
          padding: theme.spacing.xl,
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.lg,
        }}
      >
        <text
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.mutedForeground,
          }}
        >
          The shipped CommandMenu: typing filters, the highlight is not focus,
          and Enter runs the row.
        </text>
        <div style={{ display: "flex", flexDirection: "row" }}>
          <div
            testId="palette-trigger"
            role="button"
            tabIndex={0}
            onClick={() => setOpen(true)}
            style={{
              paddingTop: theme.spacing.sm,
              paddingBottom: theme.spacing.sm,
              paddingLeft: theme.spacing.lg,
              paddingRight: theme.spacing.lg,
              borderRadius: theme.radius.md,
              backgroundColor: theme.colors.primary,
            }}
          >
            <text
              style={{
                ...textStyle(theme, "body"),
                color: theme.colors.primaryForeground,
              }}
            >
              Open palette
            </text>
          </div>
        </div>
        <text
          testId="palette-readout"
          style={{
            ...textStyle(theme, "body"),
            color: theme.colors.foreground,
          }}
        >
          {`ran=${ran} runs=${runs}`}
        </text>
      </div>
      <CommandMenu open={open} onOpenChange={setOpen} actions={actions}>
        <CommandMenuInput placeholder="Type a command…" />
        <CommandMenuList testId="command-list" />
        <CommandMenuEmpty />
      </CommandMenu>
    </div>
  );
};

/** What a probe module supplies; the registry supplies the metadata. */
export interface LiveProbeBody {
  readonly id: LiveProbeId;
  /**
   * The faces the runner installs with `registerFonts` before the probe's first
   * paint, in the documented order: a family the runtime did not know when the
   * text was laid out has already fallen back.
   */
  readonly fonts?: ReadonlyArray<FontSource>;
  readonly view: () => ReactNode;
  readonly steps: Smoke.AsyncSmokeScenario["steps"];
}

/** The focused `testId`, with `"none"` for no focus so a failure reads clearly. */
const focusedId = (
  ctx: Smoke.AsyncSmokeContext,
): Effect.Effect<string, Smoke.SmokeHostError> =>
  Effect.map(ctx.host.focused(), (id) =>
    Option.getOrElse(Option.fromNullishOr(id), () => "none"),
  );

/** How many pixels of the capture under `name` paint exactly `colour`. */
const paintedPixels = (
  ctx: Smoke.AsyncSmokeContext,
  name: string,
  colour: Pixels.Rgba,
): Effect.Effect<number, Smoke.SmokeHostError> =>
  Effect.map(ctx.host.pixels(name), (frame) =>
    Pixels.countColour(frame, colour),
  );

const focusedAfterPaint = (
  ctx: Smoke.AsyncSmokeContext,
): Effect.Effect<string, Smoke.SmokeHostError> =>
  Effect.flatMap(Effect.sleep(SETTLE), () => focusedId(ctx));

const focusVisibleSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("focus-visible-probe");
    const ring = yield* ctx.expectSome(
      "the theme names a ring colour",
      Option.fromNullishOr(Pixels.hexToRgba(palettes.dark.colors.ring)),
    );

    // 1. A mouse press focuses the element; `focusVisible` must not paint.
    yield* ctx.host.click("press-ring");
    yield* ctx.expectEqual(
      "a press focuses the element",
      yield* focusedAfterPaint(ctx),
      "press-ring",
    );
    yield* ctx.host.capture("press");
    yield* ctx.expectEqual(
      "a press paints no focus ring",
      yield* paintedPixels(ctx, "press", ring),
      0,
    );

    // 2. Native traversal (`window.focus_next`) before any key is delivered:
    //    a traversal is not keyboard input, so the ring must stay off.
    yield* ctx.host.focusNext();
    yield* ctx.expectEqual(
      "native traversal moves focus",
      yield* focusedAfterPaint(ctx),
      "tab-ring",
    );
    yield* ctx.host.capture("traversal-before-keyboard");
    yield* ctx.expectEqual(
      "traversal before a key paints no focus ring",
      yield* paintedPixels(ctx, "traversal-before-keyboard", ring),
      0,
    );

    // 3. Programmatic focus, still before any key: same expected null ring.
    yield* ctx.host.focusElement("programmatic-ring");
    yield* ctx.expectEqual(
      "programmatic focus moves native focus",
      yield* focusedAfterPaint(ctx),
      "programmatic-ring",
    );
    yield* ctx.host.capture("programmatic-before-keyboard");
    yield* ctx.expectEqual(
      "programmatic focus before a key paints no focus ring",
      yield* paintedPixels(ctx, "programmatic-before-keyboard", ring),
      0,
    );

    // 4. Tab traverses natively and is the keyboard-input case the ring is
    //    meant for. Focus wraps from the last sample to the first.
    yield* ctx.host.key("tab");
    yield* ctx.expectEqual(
      "Tab traverses natively and wraps",
      yield* focusedAfterPaint(ctx),
      "press-ring",
    );
    yield* ctx.host.capture("tab");
    yield* ctx.expectEqual(
      "Tab paints the focus ring",
      (yield* paintedPixels(ctx, "tab", ring)) > 0,
      true,
    );

    // 5. Programmatic focus after keyboard input has happened: does the ring
    //    persist, or is it tied to the input that caused the focus?
    yield* ctx.host.focusElement("programmatic-ring");
    yield* ctx.expectEqual(
      "programmatic focus moves native focus after Tab",
      yield* focusedAfterPaint(ctx),
      "programmatic-ring",
    );
    yield* ctx.host.capture("programmatic-after-keyboard");
    yield* ctx.expectEqual(
      "programmatic focus after a key paints the focus ring",
      (yield* paintedPixels(ctx, "programmatic-after-keyboard", ring)) > 0,
      true,
    );
  });

/** How many pixels paint the theme's `muted` fill in the capture under `name`. */
const mutedPixels = (
  ctx: Smoke.AsyncSmokeContext,
  name: string,
): Effect.Effect<number, Smoke.SmokeHostError | Smoke.SmokeAssertionError> =>
  Effect.gen(function* () {
    const muted = yield* ctx.expectSome(
      "the theme names a muted colour",
      Option.fromNullishOr(Pixels.hexToRgba(palettes.dark.colors.muted)),
    );
    return yield* paintedPixels(ctx, name, muted);
  });

const focusDimSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("focus-dim-probe");

    // A pointer press focuses a sample without entering keyboard mode, so every
    // fill is at full strength: this is the baseline the dimming is measured
    // against.
    yield* ctx.host.click("dim-first");
    yield* ctx.expectEqual(
      "a press focuses the first sample",
      yield* focusedAfterPaint(ctx),
      "dim-first",
    );
    yield* ctx.host.capture("pointer");
    const plain = yield* mutedPixels(ctx, "pointer");

    // The same three fills after Tab: the focused sample keeps its fill, the
    // dimmed one loses it, and the opted-out one must keep its own.
    yield* ctx.host.key("tab");
    yield* ctx.expectEqual(
      "Tab focuses the second sample",
      yield* focusedAfterPaint(ctx),
      "dim-second",
    );
    yield* ctx.host.capture("keyboard");
    const dimmed = yield* mutedPixels(ctx, "keyboard");

    yield* ctx.expectEqual("some fills are painted at rest", plain > 0, true);
    yield* ctx.expectEqual(
      "the runtime dims another focusable while one has keyboard focus",
      dimmed < plain,
      true,
    );
    // One sample dims (the first) and one opts out (the third), so the drop is
    // about a third. A whole-window dim would take far more than half.
    yield* ctx.expectEqual(
      "only the default sample dims, not the opted-out one",
      dimmed > plain / 2,
      true,
    );
  });

/** The painted width of `testId`, failing by name when the runtime omitted it. */
const paintedWidth = (
  ctx: Smoke.AsyncSmokeContext,
  testId: string,
): Effect.Effect<number, Smoke.SmokeAssertionError | Smoke.SmokeHostError> =>
  Effect.gen(function* () {
    const bounds = yield* ctx.expectSome(
      `the runtime paints ${testId}`,
      Option.fromNullishOr(yield* ctx.host.bounds(testId)),
    );
    return bounds.width;
  });

/** The placement gap every layer in `floating-sides` uses. */
const GAP = 6;

/** The painted box of `testId`, failing by name when the runtime omitted it. */
const paintedBox = (
  ctx: Smoke.AsyncSmokeContext,
  testId: string,
): Effect.Effect<
  Smoke.Bounds,
  Smoke.SmokeAssertionError | Smoke.SmokeHostError
> =>
  Effect.gen(function* () {
    return yield* ctx.expectSome(
      `the runtime paints ${testId}`,
      Option.fromNullishOr(yield* ctx.host.bounds(testId)),
    );
  });

const registerFontSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("register-font-probe");

    const fallback = yield* paintedWidth(ctx, "face-default");
    const missing = yield* paintedWidth(ctx, "face-missing");
    const registered = yield* paintedWidth(ctx, "face-registered");
    yield* ctx.host.capture("register-font");

    yield* ctx.expectNear(
      "the installed family paints the face's own advances",
      registered,
      SQUARE_WORD_WIDTH,
      1,
    );
    // The control: a family the runtime does not know must not paint the
    // installed face's advances, so the row above can only come from the file.
    yield* ctx.expectEqual(
      "an unknown family does not paint the installed face",
      Math.abs(missing - SQUARE_WORD_WIDTH) > 5,
      true,
    );
    yield* ctx.expectEqual(
      "the fallback face paints the sample word",
      fallback > 0,
      true,
    );
  });

/**
 * Registers the face after the text naming it has painted, then re-lays it out.
 *
 * The documented order is still "create the renderer, register, then render",
 * because that is the only order with no fallback frame in between. This probe
 * asks the sharper question the typings answer conservatively — a family that
 * arrives later "has already fallen back" — by measuring whether the *next*
 * layout picks the file up. It does: the same node repainted after the install
 * paints the installed advances, so a late registration costs a repaint, not a
 * permanently wrong typeface.
 */
const lateRegistrationSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("late-face");

    const before = yield* paintedWidth(ctx, "late-face");
    const controlBefore = yield* paintedWidth(ctx, "late-control");
    yield* ctx.host.capture("late-before");

    // The control names a family nothing ever installs, so a width change there
    // would make the measurement below meaningless.
    yield* ctx.expectEqual(
      "the control family paints the fallback",
      Math.abs(controlBefore - SQUARE_WORD_WIDTH) > 5,
      true,
    );

    yield* ctx.host.registerFont(SQUARE_BYTES);
    yield* ctx.host.click("late-relayout");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "the re-layout control repaints the view",
      yield* ctx.host.text("late-relayouts"),
      "relayouts=1",
    );

    const after = yield* paintedWidth(ctx, "late-face");
    const controlAfter = yield* paintedWidth(ctx, "late-control");
    yield* ctx.host.capture("late-after");

    // The claim: the repaint lays the text out against the face installed a
    // moment earlier. This is the measurand the typings' "already fallen back"
    // warning does not describe: the fallback is not permanent, it is what the
    // next layout replaces.
    yield* ctx.expectNear(
      "the next layout paints the face installed after the first one",
      after,
      SQUARE_WORD_WIDTH,
      1,
    );
    yield* ctx.expectEqual(
      "the face was not painted before it was installed",
      Math.abs(before - SQUARE_WORD_WIDTH) > 5,
      true,
    );
    yield* ctx.expectNear(
      "the never-installed control sample does not move",
      controlAfter,
      controlBefore,
      1,
    );
  });

/**
 * Measures the two horizontal sides and the `align="center"` quirk in a window.
 *
 * Each anchor mounts its layer at rest, so there is no open/close state to race:
 * the probe compares the panel's box with its anchor's on the axis each prop
 * controls. `align="center"` is asserted the way the runtime behaves (the panel
 * ends at the anchor's centre line, short by half its own height), because the
 * components compensate with a measured offset and a live change to that quirk
 * must fail here rather than silently move every menu.
 */
const floatingSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("anchor-right");

    const right = yield* paintedBox(ctx, "anchor-right");
    const rightPanel = yield* paintedBox(ctx, "panel-right");
    yield* ctx.expectNear(
      "side=right sits one gap right of its anchor",
      rightPanel.x,
      right.x + right.width + GAP,
      1,
    );
    yield* ctx.expectNear(
      "align=start keeps the panel at the anchor's top",
      rightPanel.y,
      right.y,
      1,
    );

    const left = yield* paintedBox(ctx, "anchor-left");
    const leftPanel = yield* paintedBox(ctx, "panel-left");
    yield* ctx.expectNear(
      "side=left ends one gap left of its anchor",
      leftPanel.x + leftPanel.width,
      left.x - GAP,
      1,
    );
    yield* ctx.expectNear(
      "align=start holds on the left side too",
      leftPanel.y,
      left.y,
      1,
    );

    const centre = yield* paintedBox(ctx, "anchor-centre");
    const centrePanel = yield* paintedBox(ctx, "panel-centre");
    yield* ctx.expectNear(
      "align=center ends the panel at the anchor's centre line",
      centrePanel.y + centrePanel.height,
      centre.y + centre.height / 2,
      1,
    );
    yield* ctx.host.capture("floating-sides");
  });

const textInputSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("input-field");

    yield* ctx.expectContains(
      "the shipped Input starts empty",
      yield* ctx.host.text("input-readout"),
      "value= submits=0",
    );

    // A field needs focus before the window routes keys to it.
    yield* ctx.host.click("input-field");
    yield* ctx.host.key("h");
    yield* ctx.host.key("i");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "typing reaches the component's onChange",
      yield* ctx.host.text("input-readout"),
      "value=hi",
    );

    yield* ctx.host.key("enter");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "Enter reaches the component's onSubmit",
      yield* ctx.host.text("input-readout"),
      "submits=1",
    );
    yield* ctx.host.capture("typed");
  });

const checkboxSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("checkbox-field");

    yield* ctx.expectContains(
      "the shipped Checkbox starts unchecked",
      yield* ctx.host.text("checkbox-readout"),
      "checked=false changes=0",
    );

    yield* ctx.host.click("checkbox-field");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "a press toggles the checkbox and reports it once",
      yield* ctx.host.text("checkbox-readout"),
      "checked=true changes=1",
    );

    // Space is the component's own keyboard contract: a focused `div
    // role="checkbox"` has to see the key from the window. The release is a
    // separate verb because a window's `keystrokes` delivers only the press.
    yield* ctx.host.key("space");
    yield* ctx.host.keyUp("space");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "Space toggles the focused checkbox",
      yield* ctx.host.text("checkbox-readout"),
      "checked=false changes=2",
    );
    yield* ctx.host.capture("toggled");
  });

/**
 * Opens the shipped Dialog by press, proves focus entered the surface and that
 * Escape closes it and returns focus, then closes it with its own `DialogClose`.
 *
 * Every step is measured through the window: `bounds` is `null` for an element
 * the runtime never painted (the closed state), the focus id is the renderer's,
 * and the readout is React's own report of the two transitions.
 */
const dialogSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("dialog-trigger");
    yield* ctx.expectContains(
      "the dialog starts closed",
      yield* ctx.host.text("dialog-readout"),
      "opens=0 closes=0",
    );
    yield* ctx.expectEqual(
      "a closed dialog paints no surface",
      Option.isNone(
        Option.fromNullishOr(yield* ctx.host.bounds("dialog-content")),
      ),
      true,
    );

    yield* ctx.host.click("dialog-trigger");
    yield* Effect.sleep(SETTLE);
    const content = yield* paintedBox(ctx, "dialog-content");
    yield* ctx.expectEqual(
      "a press opens the dialog surface",
      content.width > 0 && content.height > 0,
      true,
    );
    yield* ctx.expectEqual(
      "focus enters the dialog surface",
      yield* focusedId(ctx),
      "dialog-content",
    );
    yield* ctx.expectContains(
      "the open reaches onOpenChange",
      yield* ctx.host.text("dialog-readout"),
      "opens=1 closes=0",
    );
    yield* ctx.host.capture("dialog-open");

    yield* ctx.host.key("escape");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Escape unpaints the dialog surface",
      Option.isNone(
        Option.fromNullishOr(yield* ctx.host.bounds("dialog-content")),
      ),
      true,
    );
    yield* ctx.expectEqual(
      "closing returns focus to the trigger",
      yield* focusedAfterPaint(ctx),
      "dialog-trigger",
    );
    yield* ctx.expectContains(
      "the close reaches onOpenChange",
      yield* ctx.host.text("dialog-readout"),
      "opens=1 closes=1",
    );

    yield* ctx.host.click("dialog-trigger");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the dialog reopens after a dismissal",
      (yield* paintedBox(ctx, "dialog-content")).height > 0,
      true,
    );
    yield* ctx.host.click("dialog-confirm");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "the dialog's own close control dismisses it",
      yield* ctx.host.text("dialog-readout"),
      "opens=2 closes=2",
    );
    yield* ctx.expectEqual(
      "the close control returns focus to the trigger",
      yield* focusedAfterPaint(ctx),
      "dialog-trigger",
    );
    yield* ctx.host.capture("dialog-closed");
  });

/**
 * Drives the shipped `DropdownMenu` through the paths a menu has to survive in a
 * window: a press opens it, Escape dismisses it and returns focus, a keyboard
 * open lands on the first row, arrows move real focus, Enter activates the row,
 * and a press activates one too.
 */
const menuSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    const unpainted = Effect.map(ctx.host.bounds("menu-content"), (bounds) =>
      Option.isNone(Option.fromNullishOr(bounds)),
    );

    yield* ctx.host.waitFor("menu-trigger");
    yield* ctx.expectContains(
      "the menu starts with no action taken",
      yield* ctx.host.text("menu-readout"),
      "last=none",
    );
    yield* ctx.expectEqual(
      "a closed menu paints no surface",
      yield* unpainted,
      true,
    );

    yield* ctx.host.click("menu-trigger");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a press opens the menu surface",
      (yield* paintedBox(ctx, "menu-content")).width > 0,
      true,
    );
    yield* ctx.host.capture("menu-open");

    // Escape is delivered to the trigger, which holds focus after a pointer
    // open: the menu's dismiss layer is what hears it, not the surface.
    yield* ctx.host.key("escape");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Escape unpaints the menu surface",
      yield* unpainted,
      true,
    );
    yield* ctx.expectEqual(
      "Escape returns focus to the trigger",
      yield* focusedAfterPaint(ctx),
      "menu-trigger",
    );

    // A keyboard open lands on the first row, so the highlight is real focus.
    yield* ctx.host.key("down");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a keyboard open lands on the first row",
      yield* focusedId(ctx),
      "menu-rename",
    );

    yield* ctx.host.key("down");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "an arrow key moves focus to the next row",
      yield* focusedId(ctx),
      "menu-delete",
    );

    yield* ctx.host.key("enter");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "Enter activates the focused row",
      yield* ctx.host.text("menu-readout"),
      "last=delete",
    );
    yield* ctx.expectEqual(
      "activation unpaints the menu surface",
      yield* unpainted,
      true,
    );
    yield* ctx.expectEqual(
      "activation returns focus to the trigger",
      yield* focusedAfterPaint(ctx),
      "menu-trigger",
    );

    yield* ctx.host.click("menu-trigger");
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.click("menu-rename");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "a press activates the pressed row",
      yield* ctx.host.text("menu-readout"),
      "last=rename",
    );
    yield* ctx.expectEqual(
      "a pressed row unpaints the menu surface",
      yield* unpainted,
      true,
    );
    yield* ctx.host.capture("menu-closed");
  });

/**
 * Queues a toast from the shipped `ToastProvider` and dismisses it with the
 * card's own control.
 *
 * The queue count is read from `useToast()`, so a toast that never entered the
 * store would not count, and the viewport's text is read separately because the
 * store and the paint are different claims.
 */
const toastSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("toast-probe");
    yield* ctx.host.waitFor("toast-push");
    yield* ctx.expectContains(
      "the queue starts empty",
      yield* ctx.host.text("toast-readout"),
      "queued=0",
    );

    yield* ctx.host.click("toast-push");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "a press queues one toast",
      yield* ctx.host.text("toast-readout"),
      "queued=1",
    );
    yield* ctx.expectContains(
      "the viewport paints the queued toast",
      yield* ctx.host.text("toast-viewport"),
      "Changes published",
    );
    yield* ctx.host.capture("toast-queued");

    yield* ctx.host.click("toast-dismiss");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "the card's dismiss control empties the queue",
      yield* ctx.host.text("toast-readout"),
      "queued=0",
    );
    yield* ctx.host.capture("toast-dismissed");
  });

/**
 * Drives the shipped `CommandMenu` the way an application shortcut would.
 *
 * Six claims, each of which a browser-shaped test cannot make: a window's
 * keystrokes reach the palette's search field, typing really filters the rows,
 * the arrow key moves the *highlight* while the field keeps native focus (the
 * component's documented contract — moving focus would stop the typing), Enter
 * runs the highlighted row rather than the first one, a disabled action paints
 * but runs nothing, and `Escape` dismisses the surface.
 *
 * The focus after the dismissal is the seventh, and it is a **gap**: the
 * palette does not give the focus back. `modal-focus-restore` isolates the
 * cause; the components workstream owns the fix (`TODO.md`).
 */
const commandPaletteSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    /** Whether `testId` is absent from the window's tree. */
    const unpainted = (
      testId: string,
    ): Effect.Effect<boolean, Smoke.SmokeHostError> =>
      Effect.map(ctx.host.bounds(testId), (bounds) =>
        Option.isNone(Option.fromNullishOr(bounds)),
      );

    /** Types a key sequence in order; one keystroke at a time. */
    const type = (
      keys: ReadonlyArray<string>,
    ): Effect.Effect<void, Smoke.SmokeHostError> =>
      Effect.forEach(keys, (key) => ctx.host.key(key), {
        discard: true,
        concurrency: 1,
      });

    /** Presses the trigger and lets the surface paint. */
    const openPalette: Effect.Effect<void, Smoke.SmokeHostError> = Effect.gen(
      function* () {
        yield* ctx.host.focusElement("palette-trigger");
        yield* ctx.host.click("palette-trigger");
        yield* Effect.sleep(SETTLE);
      },
    );

    yield* ctx.host.waitFor("palette-trigger");
    yield* ctx.expectEqual(
      "the palette starts with nothing run",
      yield* ctx.host.text("palette-readout"),
      "ran=none runs=0",
    );
    yield* ctx.expectEqual(
      "a closed palette paints no surface",
      yield* unpainted("command-menu"),
      true,
    );

    // The unfiltered list: four rows, the first one highlighted.
    yield* openPalette;
    yield* ctx.expectEqual(
      "a press opens the palette surface",
      (yield* paintedBox(ctx, "command-menu")).width > 0,
      true,
    );
    yield* ctx.expectEqual(
      "the palette opens with its search field focused",
      yield* focusedAfterPaint(ctx),
      "command-input",
    );
    yield* ctx.host.capture("palette-open");

    // The design claim: the highlight moves, the field keeps the focus. If the
    // arrow key moved focus instead, the typing below would stop working.
    yield* ctx.host.key("down");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "an arrow key keeps the search field focused",
      yield* focusedAfterPaint(ctx),
      "command-input",
    );
    yield* ctx.host.key("enter");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Enter runs the highlighted action, not the first one",
      yield* ctx.host.text("palette-readout"),
      "ran=open-settings runs=1",
    );
    yield* ctx.expectEqual(
      "running an action dismisses the palette",
      yield* unpainted("command-menu"),
      true,
    );
    // The measured gap: the palette's field takes the focus with `autoFocus`,
    // so the modal saves the field as its restore target and the focus is lost
    // when the field unmounts with the surface. `modal-focus-restore` isolates
    // the cause; the components workstream owns the fix (TODO), and this check
    // flips to `palette-trigger` with it.
    yield* ctx.expectEqual(
      "closing the palette leaves the focus nowhere (known gap: the opener does not get it back)",
      yield* focusedAfterPaint(ctx),
      "none",
    );
    yield* ctx.host.capture("palette-closed");

    // The filtered list: typing reaches the field and really filters the rows.
    yield* openPalette;
    yield* type(["t", "h", "e", "m", "e"]);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "typing filters the palette to the matching row",
      (yield* paintedBox(ctx, "command-theme")).width > 0,
      true,
    );
    yield* ctx.expectEqual(
      "an unrelated row is filtered out",
      yield* unpainted("command-new-file"),
      true,
    );
    yield* ctx.expectEqual(
      "a matching query paints no empty state",
      yield* unpainted("command-empty"),
      true,
    );
    yield* ctx.host.capture("palette-filtered");
    yield* ctx.host.key("enter");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Enter runs the filtered action",
      yield* ctx.host.text("palette-readout"),
      "ran=theme runs=2",
    );

    // A query whose only match is disabled: the row paints, and it runs nothing.
    yield* openPalette;
    yield* type(["z", "o", "o", "m"]);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a disabled action still paints as a row",
      (yield* paintedBox(ctx, "command-zoom")).width > 0,
      true,
    );
    yield* ctx.host.key("enter");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Enter on a disabled action runs nothing",
      yield* ctx.host.text("palette-readout"),
      "ran=theme runs=2",
    );
    yield* ctx.expectEqual(
      "a disabled action leaves the palette open",
      (yield* paintedBox(ctx, "command-menu")).width > 0,
      true,
    );

    yield* ctx.host.key("escape");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Escape dismisses the palette",
      yield* unpainted("command-menu"),
      true,
    );
    yield* ctx.expectEqual(
      "Escape leaves the focus nowhere as well (the same known gap)",
      yield* focusedAfterPaint(ctx),
      "none",
    );
  });

/**
 * Three modals and the question the command palette raised: does a modal give
 * the focus back when the focused thing unmounts with it?
 *
 * The three cases differ only in what holds the focus while the surface is
 * open:
 *
 * - the **control** has nothing focusable inside, so the modal's own surface
 *   holds the focus;
 * - the **manual** field is focused by the modal itself (`initialFocus`), after
 *   the surface exists;
 * - the **auto** field takes the focus the way the runtime does it
 *   (`autoFocus`, at mount) — before the modal has looked at the focus.
 *
 * All three unmount with their surface, so all three are the case that matters.
 */
const ModalFocusRestoreProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const [manualId, setManualId] = useState<number | null>(null);
  const field = {
    height: 32,
    paddingLeft: theme.spacing.sm,
    backgroundColor: theme.colors.input,
    color: theme.colors.inputForeground,
  };
  return (
    <div
      testId="modal-focus-restore-probe"
      style={{
        width: window.width,
        height: window.height,
        position: "relative",
        backgroundColor: theme.colors.background,
      }}
    >
      <div
        style={{
          width: 720,
          padding: theme.spacing.xl,
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.lg,
        }}
      >
        <text
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.mutedForeground,
          }}
        >
          Three modals: does the focus come back when what held it unmounts with
          the surface?
        </text>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            gap: theme.spacing.md,
          }}
        >
          <Dialog>
            <DialogTrigger testId="restore-control-trigger">
              Nothing inside
            </DialogTrigger>
            <DialogContent
              label="Nothing inside"
              testId="restore-control-content"
            >
              <text
                style={{
                  ...textStyle(theme, "body"),
                  color: theme.colors.foreground,
                }}
              >
                The surface holds the focus.
              </text>
            </DialogContent>
          </Dialog>
          <Dialog>
            <DialogTrigger testId="restore-manual-trigger">
              Focused field
            </DialogTrigger>
            <DialogContent
              label="Focused field"
              testId="restore-manual-content"
              initialFocus={() => manualId}
            >
              <input
                testId="restore-manual-input"
                ref={(instance) => setManualId(instance?.id ?? null)}
                style={field}
              />
            </DialogContent>
          </Dialog>
          <Dialog>
            <DialogTrigger testId="restore-auto-trigger">
              Auto-focused field
            </DialogTrigger>
            <DialogContent
              label="Auto-focused field"
              testId="restore-auto-content"
            >
              <input testId="restore-auto-input" autoFocus style={field} />
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
};

/**
 * Measures where the focus lands after each modal closes.
 *
 * The control comes first: a modal whose own surface held the focus gives it
 * back, so the two readings after it are about the field, not about modals in
 * general.
 */
const modalFocusRestoreSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("restore-control-trigger");

    // The control: nothing focusable inside, the surface holds the focus.
    yield* ctx.host.click("restore-control-trigger");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the control's surface holds the focus while it is open",
      yield* focusedAfterPaint(ctx),
      "restore-control-content",
    );
    yield* ctx.host.key("escape");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the control's modal gives the focus back to its opener",
      yield* focusedAfterPaint(ctx),
      "restore-control-trigger",
    );

    // A field the modal focused itself, after the surface existed.
    yield* ctx.host.click("restore-manual-trigger");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the manually focused field holds the focus while the modal is open",
      yield* focusedAfterPaint(ctx),
      "restore-manual-input",
    );
    yield* ctx.host.key("escape");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a modal gives the focus back when it focused the field itself",
      yield* focusedAfterPaint(ctx),
      "restore-manual-trigger",
    );

    // A field that took the focus at mount, before the modal looked.
    yield* ctx.host.click("restore-auto-trigger");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the auto-focused modal's own surface holds the focus while it is open",
      yield* focusedAfterPaint(ctx),
      "restore-auto-content",
    );
    yield* ctx.host.key("escape");
    yield* Effect.sleep(SETTLE);
    // The measured gap: `autoFocus` took the focus before the modal recorded
    // who held it, so the modal's restore target is the field — which is gone
    // by the time the surface unmounts, and the focus ends up nowhere.
    // The components workstream owns the fix (TODO); this check pins the
    // measurement and flips to `restore-auto-trigger` with it.
    yield* ctx.expectEqual(
      "a field that took the focus at mount leaves the focus nowhere when the modal closes",
      yield* focusedAfterPaint(ctx),
      "none",
    );
  });

/**
 * The surfaces a chart or an image preview would draw with.
 *
 * A real chart is generated markup, so the SVG is `source` (no file). Measured:
 * one `<svg>` paints a **tinted mask**, so the chart source is mounted beside
 * one shape per layer, five stacked `<svg>` elements each carrying its own tint.
 * The image arrives the two ways an app supplies one — a data URL and a pixel
 * buffer it already holds — and the canvas sits on a fill of its own, so the
 * frame shows whether it paints anything at all.
 */
const ContentSurfacesProbe = (): ReactNode => {
  const theme = useTheme();
  const image = useRef<ImgInstance>(null);
  const [imageStatus, setImageStatus] = useState("pending");
  // The upstream waveform example uses a layout effect: the pixels must be on
  // the element before the frame that paints it.
  useLayoutEffect(() => {
    const instance = image.current;
    if (instance === null) {
      setImageStatus("no-ref");
      return;
    }
    try {
      instance.setImagePixels(
        IMAGE_SIZE,
        IMAGE_SIZE,
        Buffer.from(imagePixels()),
      );
      setImageStatus("set");
    } catch (error) {
      setImageStatus(`threw ${String(error)}`);
    }
  }, []);
  return (
    <div
      testId="content-probe"
      style={{
        width: 760,
        height: 440,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.lg,
      }}
    >
      <div style={{ display: "flex", gap: theme.spacing.xl }}>
        <svg
          testId="chart-svg"
          source={CHART_SVG}
          style={{ width: 280, height: 100, color: hexOf(SVG_TINT) }}
        />
        <div
          testId="chart-layers"
          style={{ position: "relative", width: 280, height: 100 }}
        >
          {LAYER_SHAPES.map((shape) => (
            <svg
              key={shape}
              testId={`layer-${shape}`}
              source={layerSvg(shape)}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: 280,
                height: 100,
                color: hexOf(layerColour(shape)),
              }}
            />
          ))}
        </div>
      </div>
      <div style={{ display: "flex", gap: theme.spacing.lg }}>
        <img
          testId="url-image"
          src={IMAGE_DATA_URL}
          alt="A solid square from a data URL"
          objectFit="fill"
          style={{ width: 64, height: 64 }}
        />
        <img
          testId="buffer-image"
          ref={image}
          alt="A solid square from a pixel buffer"
          objectFit="fill"
          style={{ width: 64, height: 64 }}
        />
      </div>
      <div
        testId="canvas-parent"
        style={{
          width: 120,
          height: 40,
          backgroundColor: hexOf(CANVAS_PARENT),
        }}
      >
        <canvas testId="blank-canvas" style={{ width: 120, height: 40 }} />
      </div>
      <text testId="image-status">{imageStatus}</text>
    </div>
  );
};

/** How many pixels of `colour` the capture under `name` paints. */
const painted = (
  ctx: Smoke.AsyncSmokeContext,
  name: string,
  colour: Rgb,
): Effect.Effect<number, Smoke.SmokeHostError> =>
  Effect.map(ctx.host.pixels(name), (frame) =>
    Pixels.countColour(frame, new Pixels.Rgba({ ...colour, a: 0xff })),
  );

/** Asserts that the capture paints `colour`. */
const expectPaints = (
  ctx: Smoke.AsyncSmokeContext,
  name: string,
  colour: Rgb,
  label: string,
): Effect.Effect<void, Smoke.SmokeAssertionError | Smoke.SmokeHostError> =>
  Effect.flatMap(painted(ctx, name, colour), (count) =>
    ctx.expectEqual(label, count > 0, true),
  );

/** Asserts that the capture paints no pixel of `colour`. */
const expectAbsent = (
  ctx: Smoke.AsyncSmokeContext,
  name: string,
  colour: Rgb,
  label: string,
): Effect.Effect<void, Smoke.SmokeAssertionError | Smoke.SmokeHostError> =>
  Effect.flatMap(painted(ctx, name, colour), (count) =>
    ctx.expectEqual(label, count, 0),
  );

const contentSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("content-probe");
    yield* ctx.host.capture("content");

    // 1. One `<svg>` with a whole chart in it: GPUI rasterises the markup and
    //    paints it in `style.color`, so every `fill` a chart author writes is
    //    replaced by one tint.
    yield* ctx.expectSome(
      "the svg surface occupies space",
      Option.fromNullishOr(yield* ctx.host.bounds("chart-svg")),
    );
    yield* expectPaints(
      ctx,
      "content",
      SVG_TINT,
      "an svg paints the tint its style names",
    );
    yield* expectAbsent(
      ctx,
      "content",
      SOURCE_FILL,
      "an svg does not paint the fills its markup names",
    );

    // 2. One shape per layer, each with its own tint: the only way this runtime
    //    can show a multi-colour chart.
    yield* Effect.forEach(
      LAYER_SHAPES,
      (shape) =>
        Effect.gen(function* () {
          yield* ctx.expectSome(
            `the ${shape} layer occupies space`,
            Option.fromNullishOr(yield* ctx.host.bounds(`layer-${shape}`)),
          );
          yield* expectPaints(
            ctx,
            "content",
            layerColour(shape),
            `the ${shape} layer paints its own tint`,
          );
        }),
      { concurrency: 1 },
    );

    // 3. An image the app holds as bytes: the route for a screenshot or a
    //    decoded photo, which needs no file on disk.
    yield* ctx.expectSome(
      "the buffer image occupies space",
      Option.fromNullishOr(yield* ctx.host.bounds("buffer-image")),
    );
    yield* ctx.expectEqual(
      "the buffer image's instance took the pixels",
      yield* ctx.host.text("image-status"),
      "set",
    );
    yield* expectPaints(
      ctx,
      "content",
      BUFFER_COLOUR,
      "an image paints a pixel buffer set after mount",
    );

    // 4. A data URL is the same bytes in a string; whether it loads is the
    //    runtime's answer, so this check records what the frame shows.
    yield* ctx.expectSome(
      "the data-url image occupies space",
      Option.fromNullishOr(yield* ctx.host.bounds("url-image")),
    );
    yield* expectPaints(
      ctx,
      "content",
      IMAGE_COLOUR,
      "a data-url image paints its bytes",
    );

    // 5. A canvas is a blank host element: it tracks no painted bounds and
    //    paints nothing, so the fill behind it shows through. Measured on
    //    0.11.0 — the matrix's "no 2D-context or draw props" claim, painted.
    yield* ctx.expectSome(
      "the canvas parent occupies space",
      Option.fromNullishOr(yield* ctx.host.bounds("canvas-parent")),
    );
    yield* ctx.expectEqual(
      "a canvas tracks no painted bounds",
      Option.isNone(
        Option.fromNullishOr(yield* ctx.host.bounds("blank-canvas")),
      ),
      true,
    );
    yield* expectPaints(
      ctx,
      "content",
      CANVAS_PARENT,
      "the fill behind a canvas shows through",
    );
  });

/** The bodies, one per registry id; `Record` makes a missing body a compile error. */
export const liveProbeBodies: Record<LiveProbeId, LiveProbeBody> = {
  "focus-visible": {
    id: "focus-visible",
    view: () => <FocusVisibleProbe />,
    steps: focusVisibleSteps,
  },
  "keyboard-focus-dim": {
    id: "keyboard-focus-dim",
    view: () => <FocusDimProbe />,
    steps: focusDimSteps,
  },
  "floating-sides": {
    id: "floating-sides",
    view: () => <FloatingSidesProbe />,
    steps: floatingSteps,
  },
  "font-registration-late": {
    id: "font-registration-late",
    view: () => <LateRegistrationProbe />,
    steps: lateRegistrationSteps,
  },
  "register-font": {
    id: "register-font",
    fonts: [SQUARE_FACE],
    view: () => <RegisterFontProbe />,
    steps: registerFontSteps,
  },
  "text-input": {
    id: "text-input",
    view: () => <TextInputProbe />,
    steps: textInputSteps,
  },
  "checkbox-toggle": {
    id: "checkbox-toggle",
    view: () => <CheckboxProbe />,
    steps: checkboxSteps,
  },
  "dialog-lifecycle": {
    id: "dialog-lifecycle",
    view: () => <DialogProbe />,
    steps: dialogSteps,
  },
  "menu-lifecycle": {
    id: "menu-lifecycle",
    view: () => <MenuProbe />,
    steps: menuSteps,
  },
  "toast-lifecycle": {
    id: "toast-lifecycle",
    view: () => <ToastProbe />,
    steps: toastSteps,
  },
  "command-palette": {
    id: "command-palette",
    view: () => <CommandPaletteProbe />,
    steps: commandPaletteSteps,
  },
  "popover-lifecycle": {
    id: "popover-lifecycle",
    view: () => <PopoverProbe />,
    steps: popoverSteps,
  },
  "modal-focus-restore": {
    id: "modal-focus-restore",
    view: () => <ModalFocusRestoreProbe />,
    steps: modalFocusRestoreSteps,
  },
  "content-surfaces": {
    id: "content-surfaces",
    view: () => <ContentSurfacesProbe />,
    steps: contentSteps,
  },
};
