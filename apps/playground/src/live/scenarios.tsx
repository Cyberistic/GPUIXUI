/**
 * The live probes: one real-window view and one `steps` effect each.
 *
 * A probe is deliberately **not** a headless scenario: a window's automation
 * API is asynchronous and its renderer reports no style, so a probe asserts
 * focus and captures paint states as screenshots. The checks are still the
 * shared `Smoke` ones, so both suites emit one report shape.
 */
import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Duration, Effect, Match } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import {
  extendTheme,
  keyboardFocusRing,
  textStyle,
  type FontSource,
  type Theme,
} from "@gpuixui/tokens";
import {
  CommandMenu,
  CommandMenuEmpty,
  CommandMenuInput,
  CommandMenuList,
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  ToastProvider,
  ToastViewport,
  useToast,
  type CommandAction,
} from "@gpuixui/components";
import {
  Button,
  Checkbox,
  Input,
  RangeSlider,
  Select as PrimitiveSelect,
  Slider,
  Text,
  ThemeProvider as PrimitiveThemeProvider,
  Tooltip,
} from "@gpuixui/primitives";
import { useTheme } from "@gpuixui/tokens/react";
import { createPortal, useGpuix, useWindowSize, motion } from "@gpuix/react";
import type { ImgInstance, PublicInstance } from "@gpuix/react";
import { FloatingLayer } from "@gpuix/react/floating";
import {
  Select as GpuixSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@gpuix/react/select";
import { Pixels, type Smoke } from "@gpuixui/testing";
import { palettes } from "../palettes.js";
import { SplitPane } from "../panels/split-pane.js";
import { Readout } from "../ui.js";
import { useWindowKey } from "../window-key.js";
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
import {
  TREE_ALL_DIRECTORIES,
  TREE_INDENT,
  TREE_REVEAL_INDEX,
  TREE_ROW_HEIGHT,
  TREE_VIEWPORT_HEIGHT,
  labelInset,
  labelTestId,
  rowTestId,
  toggleTestId,
  visibleRows,
  type TreeNode,
} from "./virtual-tree.js";

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

/**
 * The shipped actions under the runtime's keyboard dim.
 *
 * The token layer measures the dim (`focus-dim.test.ts`) and the components
 * declare the opt-out their behaviour suites read from the style tree; neither
 * paints the pair in a window. Here the fourth action takes the keyboard focus,
 * so the three measured actions are "other focusables", and each is counted in a
 * colour nothing else in the view paints: the filled action keeps every pixel of
 * its fill, the action a caller forces back into the cue loses all of them, and
 * the ghost action's label — a role no other element uses — is dimmed away. The
 * ghost's label takes its colour and a 28px size from the caller `style`,
 * because a ghost paints no fill and the label is the only pixel the mechanism
 * can change; the size keeps enough exact-coloured glyph interiors for the count
 * to read on a non-retina display.
 *
 * A text field is **not** the focus target: the runtime skips the dim entirely
 * while an `<input>`/`<textarea>` holds the focus ("typing is keyboard input too,
 * and dimming the window while someone types is noise", `renderer.rs`
 * `keyboard_focus_path`), so tabbing into a field measures no dim at all.
 */
const FilledActionDimProbe = (): ReactNode => {
  const theme = useTheme();
  return (
    <PrimitiveThemeProvider theme={palettes.dark}>
      <div
        testId="filled-action-dim-probe"
        style={{
          width: 560,
          height: 280,
          padding: theme.spacing.xl,
          backgroundColor: theme.colors.background,
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.lg,
        }}
      >
        <Button testId="dim-filled" variant="secondary">
          Filled action
        </Button>
        <Button
          testId="dim-ghost"
          variant="ghost"
          style={{ color: theme.colors.success, fontSize: 28 }}
        >
          Ghost action
        </Button>
        <Button
          testId="dim-forced"
          variant="destructive"
          style={{ keyboardFocusDim: true }}
        >
          Forced into the cue
        </Button>
        <Button testId="dim-focus" variant="ghost">
          Takes the focus
        </Button>
      </div>
    </PrimitiveThemeProvider>
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
 * The shipped `Tabs` from `@gpuixui/components`: four triggers (the third
 * disabled) and a controlled value the readout prints.
 *
 * The readout is the proof the selection is React's own state, and the
 * `tabs-indicator` element is the component's measured selected surface — a
 * window reports it in `bounds`, so the probe can assert the pill actually
 * covers the selected trigger rather than trusting the renderer's layout.
 */
const TabsProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const [value, setValue] = useState("overview");
  const [changes, setChanges] = useState(0);
  const [focuses, setFocuses] = useState(0);
  return (
    <div
      testId="tabs-probe"
      style={{
        width: window.width,
        height: window.height,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
      }}
    >
      <Tabs
        value={value}
        onValueChange={(next) => {
          setValue(next);
          setChanges((count) => count + 1);
        }}
      >
        <TabsList testId="tabs-list" label="Workspace tabs">
          <TabsTrigger
            testId="tabs-overview"
            value="overview"
            onFocus={() => setFocuses((count) => count + 1)}
          >
            Overview
          </TabsTrigger>
          <TabsTrigger testId="tabs-reports" value="reports">
            Reports
          </TabsTrigger>
          <TabsTrigger testId="tabs-settings" value="settings" disabled>
            Settings
          </TabsTrigger>
          <TabsTrigger testId="tabs-archive" value="archive">
            Archive
          </TabsTrigger>
        </TabsList>
        <TabsContent testId="tabs-panel-overview" value="overview">
          <text
            style={{
              ...textStyle(theme, "body"),
              color: theme.colors.foreground,
            }}
          >
            overview panel
          </text>
        </TabsContent>
        <TabsContent testId="tabs-panel-reports" value="reports">
          <text
            style={{
              ...textStyle(theme, "body"),
              color: theme.colors.foreground,
            }}
          >
            reports panel
          </text>
        </TabsContent>
        <TabsContent testId="tabs-panel-settings" value="settings">
          <text
            style={{
              ...textStyle(theme, "body"),
              color: theme.colors.foreground,
            }}
          >
            settings panel
          </text>
        </TabsContent>
        <TabsContent testId="tabs-panel-archive" value="archive">
          <text
            style={{
              ...textStyle(theme, "body"),
              color: theme.colors.foreground,
            }}
          >
            archive panel
          </text>
        </TabsContent>
      </Tabs>
      <text
        testId="tabs-focus-readout"
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        {`focuses=${focuses}`}
      </text>
      <text
        testId="tabs-readout"
        style={{
          ...textStyle(theme, "body"),
          color: theme.colors.foreground,
        }}
      >
        {`value=${value} changes=${changes}`}
      </text>
    </div>
  );
};

/**
 * The shipped `Slider` from `@gpuixui/primitives`: a controlled value, a
 * readout, and a second disabled track beside it.
 *
 * The readout carries `centred` so a press in the middle of the track is an
 * exact check without parsing a number: the hit-test has to turn the pointer's
 * x into a value near 50, which a wrapper that never read the track's box cannot
 * do.
 */
const SliderProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const [value, setValue] = useState(0);
  const [changes, setChanges] = useState(0);
  return (
    <PrimitiveThemeProvider theme={palettes.dark}>
      <div
        testId="slider-probe"
        style={{
          width: window.width,
          height: window.height,
          padding: theme.spacing.xl,
          backgroundColor: theme.colors.background,
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.xl,
        }}
      >
        <text
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.mutedForeground,
          }}
        >
          The shipped Slider: a press positions it, the keys step it, a disabled
          track ignores both.
        </text>
        <div style={{ width: 400 }}>
          <Slider
            testId="slider"
            label="Volume"
            value={value}
            onValueChange={(next) => {
              setValue(next);
              setChanges((count) => count + 1);
            }}
          />
        </div>
        <div style={{ width: 400 }}>
          <Slider
            testId="slider-disabled"
            label="Locked"
            value={value}
            disabled
          />
        </div>
        <text
          testId="slider-readout"
          style={{
            ...textStyle(theme, "body"),
            color: theme.colors.foreground,
          }}
        >
          {`value=${value} changes=${changes} centred=${value > 45 && value < 55}`}
        </text>
      </div>
    </PrimitiveThemeProvider>
  );
};

/**
 * What the runtime does with a press that leaves the element.
 *
 * GPUix captures the pointer on left mouse down **only** for an element that
 * listens to both `mouseDown` and `mouseMove` (`renderer.rs` arms
 * `capture_pointer` from that pair). A splitter, a drag handle and the shipped
 * `Slider` all qualify; a move-only element does not, and the element under the
 * pointer receives the moves instead. The probe mounts both cases and the
 * shipped `Slider`, then reads the counters back, because a drag control's
 * whole behaviour depends on this rule.
 */
const PointerCaptureProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const [bothMoves, setBothMoves] = useState(0);
  const [bothUp, setBothUp] = useState(0);
  const [bothUnder, setBothUnder] = useState(0);
  const [moveMoves, setMoveMoves] = useState(0);
  const [moveUnder, setMoveUnder] = useState(0);
  const [value, setValue] = useState(0);
  const [changes, setChanges] = useState(0);
  const [range, setRange] = useState<readonly [number, number]>([10, 30]);
  const [rangeChanges, setRangeChanges] = useState(0);

  return (
    <PrimitiveThemeProvider theme={palettes.dark}>
      <div
        testId="capture-probe"
        style={{
          width: window.width,
          height: window.height,
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
          Press the 24px sample and drag 120px right: the element that took the
          press keeps the moves only when it listens to mouseDown and mouseMove.
        </text>
        <div style={{ display: "flex", height: 24 }}>
          <div
            testId="capture-both"
            style={{
              width: 24,
              height: 24,
              backgroundColor: theme.colors.primary,
            }}
            onMouseDown={() => {
              setBothMoves(0);
              setBothUp(0);
            }}
            onMouseMove={() => setBothMoves((count) => count + 1)}
            onMouseUp={() => setBothUp((count) => count + 1)}
          />
          <div
            testId="capture-both-under"
            style={{
              width: 400,
              height: 24,
              backgroundColor: theme.colors.muted,
            }}
            onMouseMove={() => setBothUnder((count) => count + 1)}
          />
        </div>
        <div style={{ display: "flex", height: 24 }}>
          <div
            testId="capture-move-only"
            style={{
              width: 24,
              height: 24,
              backgroundColor: theme.colors.primary,
            }}
            onMouseMove={() => setMoveMoves((count) => count + 1)}
          />
          <div
            testId="capture-move-under"
            style={{
              width: 400,
              height: 24,
              backgroundColor: theme.colors.muted,
            }}
            onMouseMove={() => setMoveUnder((count) => count + 1)}
          />
        </div>
        <div style={{ width: 400 }}>
          <Slider
            testId="capture-slider"
            label="Follows the pointer"
            value={value}
            onValueChange={(next) => {
              setValue(next);
              setChanges((count) => count + 1);
            }}
          />
        </div>
        <div style={{ width: 400 }}>
          <RangeSlider
            testId="capture-range"
            label="Range follows the pointer"
            value={range}
            onValueChange={(next) => {
              setRange(next);
              setRangeChanges((count) => count + 1);
            }}
          />
        </div>
        <text
          testId="capture-readout"
          style={{
            ...textStyle(theme, "body"),
            color: theme.colors.foreground,
          }}
        >
          {`both=${bothMoves} bothUnder=${bothUnder} bothUp=${bothUp} move=${moveMoves} moveUnder=${moveUnder} slider=${value} sliderChanges=${changes} sliderFollowed=${value > 60 && changes >= 5} range=${range[0]}-${range[1]} rangeChanges=${rangeChanges} rangeFollowed=${range[1] > 30 && range[0] === 10}`}
        </text>
      </div>
    </PrimitiveThemeProvider>
  );
};

/**
 * A cross-pane drag: an item in the left pane, dropped on the right one.
 *
 * The source records the press; the **drop target** resolves the travel and the
 * release. That split is forced by a measured window timing: the automation
 * protocol delivers the whole drag (press, eight moves, release) before React
 * commits the press's render, so a handler that gated on `dragging` **state**
 * saw `false` for every move and the drag never started. The pointer flag
 * therefore lives in a ref; the state only drives the readout.
 */
const DragProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const [zone, setZone] = useState("left");
  const [leftMoves, setLeftMoves] = useState(0);
  const [rightMoves, setRightMoves] = useState(0);
  const [drops, setDrops] = useState(0);
  const [dragging, setDragging] = useState(false);
  // The protocol delivers the whole drag before React commits the press's
  // render, so a handler that gated on `dragging` state would see `false` for
  // every move and never count the gesture. The ref is the synchronous truth;
  // the state only drives the readout.
  const draggingRef = useRef(false);

  const pane = (side: "left" | "right", children?: ReactNode): ReactNode => (
    <div
      key={side}
      testId={`drag-${side}`}
      onMouseMove={() => {
        if (!draggingRef.current) return;
        if (side === "left") setLeftMoves((count) => count + 1);
        else setRightMoves((count) => count + 1);
      }}
      onMouseUp={() => {
        if (!draggingRef.current) return;
        draggingRef.current = false;
        setZone(side);
        setDrops((count) => count + 1);
        setDragging(false);
      }}
      style={{
        width: 300,
        height: 240,
        padding: theme.spacing.md,
        borderRadius: theme.radius.sm,
        backgroundColor: theme.colors.secondary,
      }}
    >
      {children}
    </div>
  );

  return (
    <div
      testId="drag-probe"
      style={{
        width: window.width,
        height: window.height,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
      }}
    >
      <div
        style={{
          width: 720,
          height: 280,
          display: "flex",
          flexDirection: "row",
          gap: theme.spacing.lg,
          padding: theme.spacing.md,
          borderRadius: theme.radius.md,
          backgroundColor: theme.colors.muted,
        }}
      >
        {pane(
          "left",
          <div
            testId="drag-item"
            onMouseDown={() => {
              draggingRef.current = true;
              setDragging(true);
            }}
            style={{
              width: 140,
              height: 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: theme.radius.sm,
              backgroundColor: theme.colors.primary,
            }}
          >
            <text
              style={{
                ...textStyle(theme, "body"),
                color: theme.colors.primaryForeground,
              }}
            >
              Drag me
            </text>
          </div>,
        )}
        {pane("right")}
      </div>
      <text
        testId="drag-readout"
        style={{
          ...textStyle(theme, "body"),
          color: theme.colors.foreground,
        }}
      >
        {`zone=${zone} leftMoves=${leftMoves} rightMoves=${rightMoves} drops=${drops} dragging=${dragging}`}
      </text>
    </div>
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
              {/* Two focusable stops of our own, so the Tab trap's cycle is
                  addressable by testId. */}
              <div
                testId="dialog-field-a"
                tabIndex={0}
                aria-label="Project name"
                style={{
                  padding: theme.spacing.sm,
                  borderRadius: theme.radius.sm,
                  backgroundColor: theme.colors.muted,
                }}
              >
                <text
                  style={{
                    ...textStyle(theme, "body"),
                    color: theme.colors.foreground,
                  }}
                >
                  Project name
                </text>
              </div>
              <div
                testId="dialog-field-b"
                tabIndex={0}
                aria-label="Owner"
                style={{
                  padding: theme.spacing.sm,
                  borderRadius: theme.radius.sm,
                  backgroundColor: theme.colors.muted,
                }}
              >
                <text
                  style={{
                    ...textStyle(theme, "body"),
                    color: theme.colors.foreground,
                  }}
                >
                  Owner
                </text>
              </div>
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
 * The shipped `Tooltip` from `@gpuixui/primitives`: one trigger, and a second
 * focusable element to move the pointer onto when the tip has to close.
 *
 * A tooltip has no state a caller can read, so the probe measures the tip the
 * way the runtime paints it: its **text** through `getPaintedText`, and its
 * **box** through the content's own `onLayout`. The automation tree does not
 * address a tooltip's layer by `testId` in a window (measured: the content
 * paints while `text tooltip-content` reports no locator), which is why the box
 * is published on a readout instead. The trigger sits low in the window on
 * purpose: the tip opens on its `side="top"` default, and a trigger near the top
 * would be clamped by the window edge instead of measuring the placement.
 */
const TOOLTIP_CONTENT = "Rename the file";

/** The runtime closes a tooltip 80ms after the pointer leaves; allow for it. */
const TOOLTIP_CLOSE_SETTLE = Duration.millis(240);

/** A painted box, as the runtime's own layout report gives it. */
interface Painted {
  readonly y: number;
  readonly height: number;
  readonly x: number;
  readonly width: number;
}

/** The fields an `onLayout` payload may carry; every one is optional. */
interface LayoutPayload {
  readonly x?: number;
  readonly y?: number;
  readonly width?: number;
  readonly height?: number;
}

/** A layout report as a box, or `None` while a field is missing. */
const boxOf = (payload: LayoutPayload): Option.Option<Painted> =>
  Option.map(
    Option.all([
      Option.fromNullishOr(payload.x),
      Option.fromNullishOr(payload.y),
      Option.fromNullishOr(payload.width),
      Option.fromNullishOr(payload.height),
    ]),
    ([x, y, width, height]) => ({ x, y, width, height }),
  );

const TooltipProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const [enters, setEnters] = useState(0);
  const [leaves, setLeaves] = useState(0);
  const [tip, setTip] = useState<Option.Option<Painted>>(Option.none());
  const [anchor, setAnchor] = useState<Option.Option<Painted>>(Option.none());
  const above = Option.getOrElse(
    Option.flatMap(tip, (painted) =>
      Option.map(anchor, (box) => painted.y + painted.height <= box.y + 1),
    ),
    () => false,
  );
  const overlaps = Option.getOrElse(
    Option.flatMap(tip, (painted) =>
      Option.map(
        anchor,
        (box) =>
          painted.x < box.x + box.width && box.x < painted.x + painted.width,
      ),
    ),
    () => false,
  );
  const offset = (box: Option.Option<Painted>): string =>
    Option.match(box, {
      onNone: () => "none",
      onSome: (painted) => `${Math.round(painted.y)}`,
    });
  const target = (
    testId: string,
    label: string,
    pointer: {
      readonly onMouseEnter?: () => void;
      readonly onMouseLeave?: () => void;
      readonly onLayout?: (payload: LayoutPayload) => void;
    } = {},
  ): ReactNode => (
    <div
      testId={testId}
      tabIndex={0}
      aria-label={label}
      onMouseEnter={pointer.onMouseEnter}
      onMouseLeave={pointer.onMouseLeave}
      onLayout={pointer.onLayout}
      style={{
        width: 160,
        height: 40,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.card,
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
  return (
    <PrimitiveThemeProvider theme={palettes.dark}>
      <div
        testId="tooltip-probe"
        style={{
          width: window.width,
          height: window.height,
          paddingTop: 220,
          paddingLeft: theme.spacing.xl,
          backgroundColor: theme.colors.background,
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.xl,
        }}
      >
        <text
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.mutedForeground,
          }}
        >
          The shipped Tooltip: a hover opens it, leaving closes it and Escape
          dismisses it — a keyboard focus does not.
        </text>
        <div style={{ display: "flex", flexDirection: "row", gap: 24 }}>
          <Tooltip
            content={
              <div onLayout={(payload) => setTip(boxOf(payload))}>
                <text
                  style={{
                    ...textStyle(theme, "body"),
                    color: theme.colors.foreground,
                  }}
                >
                  {TOOLTIP_CONTENT}
                </text>
              </div>
            }
          >
            {target("tooltip-trigger", "Hover me", {
              onMouseEnter: () => setEnters((count) => count + 1),
              onMouseLeave: () => setLeaves((count) => count + 1),
              onLayout: (payload) => setAnchor(boxOf(payload)),
            })}
          </Tooltip>
          {target("tooltip-away", "Leave here")}
        </div>
        <text
          testId="tooltip-readout"
          style={{
            ...textStyle(theme, "body"),
            color: theme.colors.foreground,
          }}
        >
          {`enters=${enters} leaves=${leaves} above=${above} overlaps=${overlaps} tip=${offset(tip)} anchor=${offset(anchor)}`}
        </text>
      </div>
    </PrimitiveThemeProvider>
  );
};

/**
 * The shipped `DropdownMenu`: opened from the keyboard at its first row, moved
 * with the arrow keys, activated with Enter, and closed by a pointer press.
 *
 * A menu's highlight is real focus, so every step reads the renderer's focus id
 * rather than a painted colour: an arrow key that moved a highlight without
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

/**
 * The shipped `ContextMenu`, with a sibling that is **not** its trigger.
 *
 * The context menu is the only overlay opened by a right press, so the probe
 * also mounts a neighbouring target: a right press there must open nothing, and
 * while the menu is open it must close it (the menu is scoped to its trigger).
 */
const ContextMenuProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const [state, setState] = useState({
    opens: 0,
    closes: 0,
    last: "none",
  });
  return (
    <div
      testId="context-menu-probe"
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
          The shipped ContextMenu: right-press the card, or press Shift+F10 on
          it.
        </text>
        <ContextMenu
          onOpenChange={(open) =>
            setState((current) => ({
              ...current,
              opens: current.opens + (open ? 1 : 0),
              closes: current.closes + (open ? 0 : 1),
            }))
          }
        >
          <ContextMenuTrigger
            testId="context-trigger"
            style={{ width: 320, height: 160 }}
          >
            <text
              style={{
                ...textStyle(theme, "body"),
                color: theme.colors.cardForeground,
              }}
            >
              Right-press this card
            </text>
          </ContextMenuTrigger>
          <ContextMenuContent testId="context-menu" label="Item actions">
            <ContextMenuItem
              testId="context-rename"
              onSelect={() =>
                setState((current) => ({ ...current, last: "rename" }))
              }
            >
              Rename
            </ContextMenuItem>
            <ContextMenuItem
              testId="context-delete"
              onSelect={() =>
                setState((current) => ({ ...current, last: "delete" }))
              }
            >
              Delete
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
        <div
          testId="context-sibling"
          style={{
            width: 320,
            padding: theme.spacing.md,
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.muted,
          }}
        >
          <text
            style={{
              ...textStyle(theme, "body"),
              color: theme.colors.foreground,
            }}
          >
            A sibling, not the trigger
          </text>
        </div>
        <text
          testId="context-readout"
          style={{
            ...textStyle(theme, "body"),
            color: theme.colors.foreground,
          }}
        >
          {`opens=${state.opens} closes=${state.closes} last=${state.last}`}
        </text>
      </div>
    </div>
  );
};

/**
 * The runtime's `motion` measured on painted geometry.
 *
 * `motion` is the only animation the library has, and two inventory rows name
 * it — Tier 3's "expandable rows" (`motion` height) and Tier 4's "collapsible
 * sidebars" (`motion` width, an **outer clipping container** rather than an
 * inner reflow). Neither had been measured in a window: a `TestRenderer` frame
 * is not a run. The box animates height (and width, if the wrapper shrink-wraps
 * it), and holds a fixed-size child that must not be reflowed while the box is
 * smaller than the child.
 *
 * `testId` is not part of `MotionDivProps`, so the measured node is the plain
 * wrapper that shrink-wraps the animated box.
 */
const MotionProbe = (): ReactNode => {
  const theme = useTheme();
  const [grown, setGrown] = useState(false);
  const [completes, setCompletes] = useState(0);
  return (
    <div
      testId="motion-probe"
      style={{
        width: 720,
        padding: theme.spacing.xl,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: theme.spacing.lg,
        backgroundColor: theme.colors.background,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        motion: the box animates its height, and the child inside it keeps its
        own size.
      </text>
      <div
        testId="motion-toggle"
        role="button"
        tabIndex={0}
        onClick={() => setGrown((current) => !current)}
        style={{
          padding: theme.spacing.sm,
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
          {grown ? "shrink" : "grow"}
        </text>
      </div>
      <div
        testId="motion-box"
        style={{ display: "flex", flexDirection: "column" }}
      >
        <motion.div
          initial={{ width: 120, height: 40 }}
          animate={{ width: grown ? 240 : 120, height: grown ? 240 : 40 }}
          transition={{ duration: 3, ease: "easeInOut" }}
          onMotionComplete={() => setCompletes((current) => current + 1)}
          style={{
            overflow: "hidden",
            backgroundColor: theme.colors.primary,
          }}
        >
          <div
            testId="motion-child"
            style={{
              width: 320,
              height: 200,
              flexShrink: 0,
              backgroundColor: theme.colors.card,
            }}
          />
        </motion.div>
      </div>
      <text
        testId="motion-readout"
        style={{
          ...textStyle(theme, "body"),
          color: theme.colors.foreground,
        }}
      >
        {`grown=${grown} completes=${completes}`}
      </text>
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

/** The dark theme's `role` colour, failing by name when it cannot be painted. */
const themeColour = (
  ctx: Smoke.AsyncSmokeContext,
  role: keyof Theme["colors"],
): Effect.Effect<Pixels.Rgba, Smoke.SmokeAssertionError> =>
  ctx.expectSome(
    `the dark theme names its ${role} colour`,
    Option.fromNullishOr(Pixels.hexToRgba(palettes.dark.colors[role])),
  );

const filledActionDimSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("filled-action-dim-probe");
    const secondary = yield* themeColour(ctx, "secondary");
    const success = yield* themeColour(ctx, "success");
    const destructive = yield* themeColour(ctx, "destructive");

    // A pointer press focuses the fourth action without entering keyboard mode,
    // and leaves the pointer on it, so no measured action is hovered: the
    // baseline is every fill at full strength.
    yield* ctx.host.click("dim-focus");
    yield* ctx.expectEqual(
      "a press focuses the action the dim is measured against",
      yield* focusedAfterPaint(ctx),
      "dim-focus",
    );
    yield* ctx.host.capture("pointer");
    const filled = yield* paintedPixels(ctx, "pointer", secondary);
    const ghost = yield* paintedPixels(ctx, "pointer", success);
    const forced = yield* paintedPixels(ctx, "pointer", destructive);
    yield* ctx.expectEqual(
      "a filled action paints its fill at rest",
      filled > 0,
      true,
    );
    yield* ctx.expectEqual(
      "a ghost action paints its label at rest",
      ghost > 0,
      true,
    );
    yield* ctx.expectEqual(
      "the action forced into the cue paints its fill at rest",
      forced > 0,
      true,
    );

    // Four tab stops in tree order. The first Tab puts the window in keyboard
    // mode, and the fourth lands the focus back on the action it started from —
    // so both captures have the same focus and pointer position, and only the
    // dim differs.
    yield* ctx.host.key("tab");
    yield* ctx.expectEqual(
      "Tab enters the actions at the first one",
      yield* focusedAfterPaint(ctx),
      "dim-filled",
    );
    yield* ctx.host.key("tab");
    yield* ctx.host.key("tab");
    yield* ctx.host.key("tab");
    yield* ctx.expectEqual(
      "Tab returns to the action the dim is measured against",
      yield* focusedAfterPaint(ctx),
      "dim-focus",
    );
    yield* ctx.host.capture("keyboard");

    yield* ctx.expectEqual(
      "a filled action keeps every pixel of its fill",
      yield* paintedPixels(ctx, "keyboard", secondary),
      filled,
    );
    yield* ctx.expectEqual(
      "a ghost action's label is dimmed away",
      yield* paintedPixels(ctx, "keyboard", success),
      0,
    );
    yield* ctx.expectEqual(
      "forcing a filled action into the cue dims its fill",
      yield* paintedPixels(ctx, "keyboard", destructive),
      0,
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
 * Drives the shipped `Tabs` through the paths a tab set has to survive in a
 * window: the selected pill covers the selected trigger, a press moves both, an
 * arrow moves **real focus** and selects (skipping the disabled tab), Home/End
 * jump to the ends, and a disabled tab ignores a press.
 *
 * The pill's geometry is the point: `tabs-indicator` is the component's one
 * measured selected surface, so the assertion is the runtime's own `bounds`
 * against the selected trigger's box rather than a colour read off a frame.
 */
const tabsSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("tabs-overview");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "the first tab starts selected",
      yield* ctx.host.text("tabs-readout"),
      "value=overview changes=0",
    );
    yield* ctx.expectEqual(
      "an unselected panel paints nothing",
      Option.isNone(
        Option.fromNullishOr(yield* ctx.host.bounds("tabs-panel-reports")),
      ),
      true,
    );

    const overview = yield* paintedBox(ctx, "tabs-overview");
    const first = yield* paintedBox(ctx, "tabs-indicator");
    yield* ctx.expectNear(
      "the pill starts on the selected trigger's left edge",
      first.x,
      overview.x,
      2,
    );
    yield* ctx.expectNear(
      "the pill is the selected trigger's width",
      first.width,
      overview.width,
      2,
    );
    yield* ctx.expectNear(
      "the pill is the selected trigger's height",
      first.height,
      overview.height,
      2,
    );
    yield* ctx.host.capture("tabs-overview");

    // Keyboard first, from the window's own traversal: Tab enters the list on
    // the roving tab stop.
    yield* ctx.host.key("tab");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Tab stops on the selected trigger",
      yield* focusedId(ctx),
      "tabs-overview",
    );
    // Measured on 0.11.0: the window focuses the element but delivers no React
    // `onFocus`, so the list's `active` row stays empty after a traversal. The
    // component anchors an arrow move on the trigger that sent the key
    // (`tabs/logic.ts`), which is what makes the first arrow move off the
    // traversal's tab instead of re-anchoring at the first enabled one.
    yield* ctx.expectEqual(
      "a traversal delivers no onFocus to the trigger",
      yield* ctx.host.text("tabs-focus-readout"),
      "focuses=0",
    );
    yield* ctx.host.key("right");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the first arrow moves off the traversal's tab without an onFocus",
      yield* focusedId(ctx),
      "tabs-reports",
    );
    yield* ctx.expectContains(
      "automatic activation follows the focused tab",
      yield* ctx.host.text("tabs-readout"),
      "value=reports changes=1",
    );
    yield* ctx.expectContains(
      "the selected panel paints",
      yield* ctx.host.text("tabs-panel-reports"),
      "reports panel",
    );
    yield* ctx.expectEqual(
      "the previous panel unpaints",
      Option.isNone(
        Option.fromNullishOr(yield* ctx.host.bounds("tabs-panel-overview")),
      ),
      true,
    );
    const reports = yield* paintedBox(ctx, "tabs-reports");
    const second = yield* paintedBox(ctx, "tabs-indicator");
    yield* ctx.expectNear(
      "the pill follows the selected trigger",
      second.x,
      reports.x,
      2,
    );
    yield* ctx.expectEqual(
      "the pill moved with the selection",
      second.x === first.x,
      false,
    );
    yield* ctx.host.capture("tabs-reports");

    yield* ctx.host.key("right");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the arrow skips the disabled trigger",
      yield* focusedId(ctx),
      "tabs-archive",
    );
    yield* ctx.expectContains(
      "the skipped selection lands on the last tab",
      yield* ctx.host.text("tabs-readout"),
      "value=archive changes=2",
    );

    yield* ctx.host.key("home");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Home lands on the first trigger",
      yield* focusedId(ctx),
      "tabs-overview",
    );
    yield* ctx.expectContains(
      "Home selects the first tab",
      yield* ctx.host.text("tabs-readout"),
      "value=overview changes=3",
    );

    yield* ctx.host.key("end");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "End skips the disabled trigger",
      yield* focusedId(ctx),
      "tabs-archive",
    );
    yield* ctx.expectContains(
      "End selects the last enabled tab",
      yield* ctx.host.text("tabs-readout"),
      "value=archive changes=4",
    );

    // A press is the pointer path: it selects without moving through the list.
    yield* ctx.host.click("tabs-reports");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "a press selects the tab",
      yield* ctx.host.text("tabs-readout"),
      "value=reports changes=5",
    );
    const pressed = yield* paintedBox(ctx, "tabs-indicator");
    yield* ctx.expectNear(
      "the pill follows a pressed trigger",
      pressed.x,
      reports.x,
      2,
    );

    const beforeDisabled = yield* ctx.host.text("tabs-readout");
    yield* ctx.host.click("tabs-settings");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a disabled tab ignores a press",
      yield* ctx.host.text("tabs-readout"),
      beforeDisabled,
    );
  });

/**
 * Drives the shipped `Slider` in a window: a press in the middle of the track
 * becomes a value there (the hit-test reads the track's box), the keys step and
 * jump to the ends, and a disabled track ignores a press.
 *
 * Pointer capture is real, but it is a separate measurement: `pointer-capture`
 * drags this same component off its track and proves the value follows, because
 * the runtime captures for an element that listens to both `mouseDown` and
 * `mouseMove`. This probe stays on the press and keyboard paths.
 */
const sliderSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("slider");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the slider starts at zero",
      yield* ctx.host.text("slider-readout"),
      "value=0 changes=0 centred=false",
    );

    yield* ctx.host.click("slider");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "a press in the middle of the track moves the value there",
      yield* ctx.host.text("slider-readout"),
      "centred=true",
    );
    yield* ctx.expectContains(
      "the press reports one change",
      yield* ctx.host.text("slider-readout"),
      "changes=1",
    );
    yield* ctx.host.capture("slider-pressed");

    yield* ctx.host.focusElement("slider");
    yield* ctx.host.key("home");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Home jumps to the minimum",
      yield* ctx.host.text("slider-readout"),
      "value=0 changes=2 centred=false",
    );

    yield* ctx.host.key("end");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "End jumps to the maximum",
      yield* ctx.host.text("slider-readout"),
      "value=100 changes=3 centred=false",
    );

    yield* ctx.host.key("left");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the left arrow steps down",
      yield* ctx.host.text("slider-readout"),
      "value=99 changes=4 centred=false",
    );

    yield* ctx.host.key("right");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the right arrow steps back up",
      yield* ctx.host.text("slider-readout"),
      "value=100 changes=5 centred=false",
    );

    const beforeDisabled = yield* ctx.host.text("slider-readout");
    yield* ctx.host.click("slider-disabled");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a disabled track ignores a press",
      yield* ctx.host.text("slider-readout"),
      beforeDisabled,
    );
    yield* ctx.host.capture("slider-keys");
  });

/**
 * Measures the pointer rule and what it means for a drag control.
 *
 * The check is the counters, not a screenshot: a runtime that kept delivering
 * moves without capture would make `move=8`, and one that stopped at the box
 * edge would leave `both` at 0 with the element under the pointer counting. The
 * shipped `Slider` is the third sample, so the probe measures the component the
 * library ships rather than a stand-in.
 */
const pointerCaptureSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("capture-both");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "nothing has been dragged yet",
      yield* ctx.host.text("capture-readout"),
      "both=0 bothUnder=0 bothUp=0 move=0 moveUnder=0 slider=0 sliderChanges=0 sliderFollowed=false range=10-30 rangeChanges=0 rangeFollowed=false",
    );

    yield* ctx.host.drag("capture-both", 120, 0);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "an element listening to mouseDown and mouseMove keeps every move after the pointer leaves it",
      yield* ctx.host.text("capture-readout"),
      "both=8 bothUnder=0 bothUp=1",
    );

    yield* ctx.host.drag("capture-move-only", 120, 0);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "a move-only element captures nothing, so the element under the pointer gets the drag's moves",
      yield* ctx.host.text("capture-readout"),
      "move=1 moveUnder=8",
    );

    yield* ctx.host.drag("capture-slider", 60, 120);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "the shipped Slider follows a drag that leaves its track",
      yield* ctx.host.text("capture-readout"),
      "sliderFollowed=true",
    );

    // The range's two thumbs are separate stops on one track: the press picks
    // the nearer end, so the other one must not move.
    yield* ctx.host.drag("capture-range", 60, 120);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "the shipped RangeSlider follows a drag that leaves its track",
      yield* ctx.host.text("capture-readout"),
      "rangeFollowed=true",
    );
    yield* ctx.expectContains(
      "only the nearer end of the range moves",
      yield* ctx.host.text("capture-readout"),
      "range=10-",
    );
    yield* ctx.host.capture("pointer-capture");
  });

/**
 * Drives a cross-pane drag in a window: the item records the press, each pane
 * records the travel and the release over itself, and the readout names the side
 * that received the drop.
 *
 * The source records the press; the pane under the pointer counts the travel and
 * resolves the release. The probe drags item → right pane and back and requires
 * the target pane to have counted a move, so a drag that never reached it fails
 * even if the drop lands. The press flag is a ref, not state, because the
 * protocol delivers every move before React commits the press's render.
 */
const dragSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("drag-item");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the item starts in the left pane",
      yield* ctx.host.text("drag-readout"),
      "zone=left leftMoves=0 rightMoves=0 drops=0 dragging=false",
    );

    const item = yield* paintedBox(ctx, "drag-item");
    const right = yield* paintedBox(ctx, "drag-right");
    yield* ctx.host.drag(
      "drag-item",
      right.x + right.width / 2 - (item.x + item.width / 2),
      right.y + right.height / 2 - (item.y + item.height / 2),
    );
    yield* Effect.sleep(SETTLE);
    const dropped = yield* ctx.host.text("drag-readout");
    yield* ctx.expectContains(
      "the drop lands in the right pane",
      dropped,
      "zone=right",
    );
    yield* ctx.expectContains(
      "the right pane resolved one drop",
      dropped,
      "drops=1",
    );
    yield* ctx.expectContains(
      "the drag state is over after the release",
      dropped,
      "dragging=false",
    );
    yield* ctx.expectEqual(
      "the target pane saw the pointer move with the button held",
      Str.includes("rightMoves=0")(dropped),
      false,
    );
    yield* ctx.host.capture("drag-right");

    // Back again, so the gesture is not a one-way special case.
    const left = yield* paintedBox(ctx, "drag-left");
    const moved = yield* paintedBox(ctx, "drag-item");
    yield* ctx.host.drag(
      "drag-item",
      left.x + left.width / 2 - (moved.x + moved.width / 2),
      left.y + left.height / 2 - (moved.y + moved.height / 2),
    );
    yield* Effect.sleep(SETTLE);
    const returned = yield* ctx.host.text("drag-readout");
    yield* ctx.expectContains(
      "a second drag lands back in the left pane",
      returned,
      "zone=left",
    );
    yield* ctx.expectContains(
      "the left pane resolved the second drop",
      returned,
      "drops=2",
    );
    yield* ctx.expectContains(
      "the drag state ended again",
      returned,
      "dragging=false",
    );
    yield* ctx.expectEqual(
      "the left pane saw the return travel",
      Str.includes("leftMoves=0")(returned),
      false,
    );
    yield* ctx.host.capture("drag-left");
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

    // Control for the trap check below: with the dialog closed the trigger is the
    // page's first stop, so the same focused-id read reports it. A focus that
    // leaked out of an open dialog would therefore be named, not hidden.
    yield* ctx.host.key("tab");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "outside the dialog a traversal reaches the trigger",
      yield* focusedId(ctx),
      "dialog-trigger",
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

    // The Tab trap in a window, which no headless suite can prove: the surface
    // handles Tab itself (`focusNextWithin` + `preventDefault`), so a window
    // that delivered the key to the default traversal instead would leak the
    // focus to `dialog-trigger`. Six presses must cycle every stop, come back
    // to the surface, and never name the trigger.
    const stops = yield* Effect.forEach(
      Arr.range(0, 5),
      () =>
        Effect.flatMap(ctx.host.key("tab"), () =>
          Effect.flatMap(Effect.sleep(SETTLE), () => focusedId(ctx)),
        ),
      { concurrency: 1 },
    );
    yield* ctx.expectEqual(
      "Tab never leaves the dialog surface",
      Arr.contains(stops, "dialog-trigger"),
      false,
    );
    yield* ctx.expectEqual(
      "Tab reaches the dialog's first field",
      Arr.contains(stops, "dialog-field-a"),
      true,
    );
    yield* ctx.expectEqual(
      "Tab reaches the dialog's second field",
      Arr.contains(stops, "dialog-field-b"),
      true,
    );
    // The surface itself is not in the tab order (`tabIndex: -1`), so the wrap
    // goes to the first stop again rather than back to `dialog-content`.
    yield* ctx.expectEqual(
      "the trap cycles through the surface's stops",
      Arr.length(Arr.filter(stops, (id) => id === "dialog-field-a")) >= 2,
      true,
    );
    yield* ctx.host.key("shift-tab");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Shift-Tab stays inside too",
      Arr.contains(
        [
          "dialog-content",
          "dialog-field-a",
          "dialog-field-b",
          "dialog-confirm",
        ],
        yield* focusedId(ctx),
      ),
      true,
    );

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
 * Drives the shipped `Tooltip` through the two paths it opens on and the way it
 * leaves: the pointer entering the trigger, a focus from component code, and a
 * pointer leaving or an Escape dismissing it.
 *
 * A window reports no style and a tooltip has no readout, so the checks are the
 * runtime's own bounds for the tip and its text: `bounds` answers nothing while
 * the tip is closed, which is what makes "closed" measurable at all.
 */
const tooltipSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    /** The tip is painted exactly when its text is in the frame. */
    const painted = Effect.map(ctx.host.paintedText(), (lines) =>
      lines.join("\n").includes(TOOLTIP_CONTENT),
    );

    yield* ctx.host.waitFor("tooltip-trigger");
    yield* ctx.expectEqual("a tooltip starts closed", yield* painted, false);
    yield* ctx.expectContains(
      "the trigger has not been entered yet",
      yield* ctx.host.text("tooltip-readout"),
      "enters=0 leaves=0",
    );

    // The keyboard path first: the trigger is the probe's first tab stop, so a
    // traversal has to land on it. The tip then staying closed is the measured
    // gap — the wrapper opens on React's `onFocus`, and a window does not
    // deliver that for a traversal (`tabs-lifecycle` measured the same gap).
    yield* ctx.host.key("tab");
    yield* Effect.sleep(TOOLTIP_CLOSE_SETTLE);
    yield* ctx.expectEqual(
      "Tab lands on the trigger",
      yield* focusedId(ctx),
      "tooltip-trigger",
    );
    yield* ctx.expectEqual(
      "a keyboard focus does not open the tip",
      yield* painted,
      false,
    );

    // The pointer path. The tip opens immediately (the wrapper's provider has a
    // zero delay), so the wait is for the frame, not for a timer.
    yield* ctx.host.hover("tooltip-trigger");
    yield* Effect.sleep(TOOLTIP_CLOSE_SETTLE);
    yield* ctx.expectContains(
      "the pointer enters the trigger",
      yield* ctx.host.text("tooltip-readout"),
      "enters=1 leaves=0",
    );
    yield* ctx.expectEqual(
      "a hover opens the tip with its own content",
      yield* painted,
      true,
    );
    // The tip's box is the content's own layout report: `side="top"` puts it
    // above the trigger, overlapping it on the horizontal axis.
    yield* ctx.expectContains(
      "the tip opens above its trigger on the default side",
      yield* ctx.host.text("tooltip-readout"),
      "above=true overlaps=true",
    );
    yield* ctx.host.capture("tooltip-open");

    // Leaving is a pointer move too: the runtime schedules the close 80ms later,
    // so the probe waits past it rather than reading the frame it left.
    yield* ctx.host.hover("tooltip-away");
    yield* Effect.sleep(TOOLTIP_CLOSE_SETTLE);
    yield* ctx.expectContains(
      "the pointer leaves the trigger",
      yield* ctx.host.text("tooltip-readout"),
      "enters=1 leaves=1",
    );
    yield* ctx.expectEqual(
      "leaving the trigger closes the tip",
      yield* painted,
      false,
    );

    // A second hover proves the tip reopens, then Escape (the runtime's
    // window-level dismissal, which does not need the focus inside the layer)
    // is the keyboard way out.
    yield* ctx.host.hover("tooltip-trigger");
    yield* Effect.sleep(TOOLTIP_CLOSE_SETTLE);
    yield* ctx.expectEqual(
      "a second hover reopens the tip",
      yield* painted,
      true,
    );
    yield* ctx.host.key("escape");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual("Escape dismisses the tip", yield* painted, false);
    yield* ctx.expectEqual(
      "Escape leaves the focus on the trigger",
      yield* focusedId(ctx),
      "tooltip-trigger",
    );
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
 * Drives the shipped `ContextMenu` in a window.
 *
 * This is the one overlay whose opening input is a **right press**, and no
 * window probe had produced one: the headless suites synthesise the aux click
 * themselves. The checks are the two opening paths and their different close
 * rules — a pointer-opened menu keeps its origin at the pointer and leaves the
 * focus where the close put it, while Shift+F10 places the surface from the
 * trigger's own bounds and hands the focus back.
 */
const contextMenuSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    const unpainted = Effect.map(ctx.host.bounds("context-menu"), (bounds) =>
      Option.isNone(Option.fromNullishOr(bounds)),
    );

    yield* ctx.host.waitFor("context-trigger");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the menu starts closed",
      yield* ctx.host.text("context-readout"),
      "opens=0 closes=0 last=none",
    );
    yield* ctx.expectEqual(
      "a closed context menu paints no surface",
      yield* unpainted,
      true,
    );

    // A primary press is not an aux click, so it must open nothing.
    yield* ctx.host.click("context-trigger");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a left press does not open a context menu",
      yield* unpainted,
      true,
    );

    const trigger = yield* paintedBox(ctx, "context-trigger");
    yield* ctx.host.rightClick("context-trigger");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "a right press opens the menu",
      yield* ctx.host.text("context-readout"),
      "opens=1",
    );
    const atPointer = yield* paintedBox(ctx, "context-menu");
    yield* ctx.expectNear(
      "the surface starts at the press point's x",
      atPointer.x,
      trigger.x + trigger.width / 2,
      1,
    );
    yield* ctx.expectNear(
      "the surface starts at the press point's y",
      atPointer.y,
      trigger.y + trigger.height / 2,
      1,
    );
    yield* ctx.host.capture("context-open");
    yield* ctx.expectEqual(
      "the open surface holds the focus",
      yield* focusedId(ctx),
      "context-menu",
    );

    yield* ctx.host.key("down");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "an arrow key moves real focus to the first row",
      yield* focusedId(ctx),
      "context-rename",
    );

    yield* ctx.host.key("down");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the next arrow moves focus to the second row",
      yield* focusedId(ctx),
      "context-delete",
    );

    yield* ctx.host.key("enter");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "Enter runs the focused row",
      yield* ctx.host.text("context-readout"),
      "last=delete",
    );
    yield* ctx.expectEqual(
      "activation unpaints the surface",
      yield* unpainted,
      true,
    );

    // The keyboard route: Shift+F10 places the surface under the trigger and
    // Escape returns the focus, which a pointer-opened menu does not.
    yield* ctx.host.rightClick("context-trigger");
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.key("escape");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Escape dismisses a pointer-opened menu",
      yield* unpainted,
      true,
    );
    yield* ctx.expectContains(
      "the dismiss is reported to the caller",
      yield* ctx.host.text("context-readout"),
      "closes=2",
    );
    yield* ctx.expectEqual(
      "a pointer-opened menu leaves the focus where the close put it",
      yield* focusedAfterPaint(ctx),
      "none",
    );

    yield* ctx.host.focusElement("context-trigger");
    yield* ctx.host.key("shift-f10");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "Shift+F10 opens the menu from the keyboard",
      yield* ctx.host.text("context-readout"),
      "opens=3",
    );
    const fromKeyboard = yield* paintedBox(ctx, "context-menu");
    yield* ctx.expectNear(
      "the keyboard surface starts at the trigger's left edge",
      fromKeyboard.x,
      trigger.x,
      1,
    );
    yield* ctx.expectNear(
      "the keyboard surface starts under the trigger",
      fromKeyboard.y,
      trigger.y + trigger.height,
      1,
    );

    yield* ctx.host.key("escape");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Escape from the keyboard route returns the focus to the trigger",
      yield* focusedAfterPaint(ctx),
      "context-trigger",
    );

    // The scope rule: a right press on a sibling opens nothing, and while the
    // menu is open the same press dismisses it rather than opening another.
    yield* ctx.host.rightClick("context-sibling");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a right press on a sibling opens nothing",
      yield* unpainted,
      true,
    );

    yield* ctx.host.rightClick("context-trigger");
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.rightClick("context-sibling");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a right press outside the open menu dismisses it",
      yield* unpainted,
      true,
    );
    yield* ctx.expectContains(
      "the outside press opens no second menu",
      yield* ctx.host.text("context-readout"),
      "opens=4",
    );
    yield* ctx.host.capture("context-closed");
  });

/** A geometry sample the animation is still travelling between. */
const isTravelling = (height: number, from: number, to: number): boolean =>
  height > from + 2 && height < to - 2;

/**
 * Eight painted heights of the animated box, sampled about 50ms apart.
 *
 * A 0.6s `easeInOut` tween moves slowly at both ends, so one sample is not
 * enough to tell a tween from a jump: the run's first 240ms only reaches ~90px.
 * The samples straddle the slow start; the value read after the last one is the
 * settled height.
 */
const motionSamples = (
  ctx: Smoke.AsyncSmokeContext,
): Effect.Effect<
  ReadonlyArray<number>,
  Smoke.SmokeAssertionError | Smoke.SmokeHostError
> =>
  Effect.forEach(
    [1, 2, 3, 4, 5, 6, 7, 8],
    () =>
      Effect.gen(function* () {
        const box = yield* paintedBox(ctx, "motion-box");
        yield* Effect.sleep(Duration.millis(50));
        return box.height;
      }),
    { concurrency: 1 },
  );

/**
 * Measures whether `motion` animates **in a window**, and what it does to the
 * content inside a shrinking box.
 *
 * The box tweens 0.6s between 120x40 and 240x240, so intermediate samples are
 * the proof that it animates rather than jumping — the negative control is
 * `transition={{ duration: 0 }}`, which lands on the target with no frame in
 * between. The fixed 320x200 child must keep its own size the whole way: a
 * collapsible sidebar animates its **outer** box and clips, rather than
 * flex-shrinking the content inside it.
 *
 * Measured caveat for the probe itself: a screenshot stalls the animation clock,
 * and the run then completes early once frames resume (a capture taken just
 * before the reverse press made it snap from 238 to 40 in one sample). Captures
 * therefore sit after each run's sampling, with a settle between them.
 */
const motionSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("motion-box");
    // A previous probe's screenshot stalls the animation clock, and a run whose
    // frames resume late completes in one step. Settling the window before the
    // first press is what makes this measurement independent of what ran before.
    yield* Effect.sleep(Duration.millis(800));
    const small = yield* paintedBox(ctx, "motion-box");
    yield* ctx.expectNear(
      "the box starts at its initial height",
      small.height,
      40,
      1,
    );
    yield* ctx.expectNear(
      "the box starts at its initial width",
      small.width,
      120,
      1,
    );

    const narrow = yield* paintedBox(ctx, "motion-child");
    yield* ctx.expectNear(
      "the fixed child keeps its width inside the narrow box",
      narrow.width,
      320,
      1,
    );
    yield* ctx.expectNear(
      "the fixed child keeps its height inside the short box",
      narrow.height,
      200,
      1,
    );

    yield* ctx.host.click("motion-toggle");
    const growSamples = yield* motionSamples(ctx);
    yield* Effect.sleep(Duration.millis(900));
    const grown = yield* paintedBox(ctx, "motion-box");

    yield* ctx.expectEqual(
      "the growth paints a frame between the two sizes",
      Arr.some(growSamples, (height) => isTravelling(height, 40, 240)),
      true,
    );
    yield* ctx.expectNear(
      "the box lands on the animated target height",
      grown.height,
      240,
      1,
    );
    yield* ctx.expectNear(
      "the box lands on the animated target width",
      grown.width,
      240,
      1,
    );
    yield* ctx.expectContains(
      "onMotionComplete reports the end of the run",
      yield* ctx.host.text("motion-readout"),
      "completes=1",
    );

    const wide = yield* paintedBox(ctx, "motion-child");
    yield* ctx.expectNear(
      "the child is not reflowed by the larger box",
      wide.width,
      320,
      1,
    );

    yield* ctx.host.click("motion-toggle");
    const shrinkSamples = yield* motionSamples(ctx);
    yield* Effect.sleep(Duration.millis(900));
    const back = yield* paintedBox(ctx, "motion-box");
    yield* ctx.expectEqual(
      "the reverse run paints an intermediate frame too",
      Arr.some(shrinkSamples, (height) => isTravelling(height, 40, 240)),
      true,
    );
    yield* ctx.expectNear(
      "the reverse run lands back on the initial height",
      back.height,
      40,
      1,
    );
    yield* ctx.expectContains(
      "each run reports one completion",
      yield* ctx.host.text("motion-readout"),
      "completes=2",
    );

    const clipped = yield* paintedBox(ctx, "motion-child");
    yield* ctx.expectNear(
      "the child keeps its size once the box is small again",
      clipped.height,
      200,
      1,
    );

    // Captures come last, after every timed run: a screenshot stalls the
    // animation clock, so a capture taken between a press and its samples makes
    // the next run complete in one step (measured: `240, 238, 40, 40`).
    yield* ctx.host.click("motion-toggle");
    yield* Effect.sleep(Duration.millis(900));
    yield* ctx.host.capture("motion-grown");
    yield* ctx.host.click("motion-toggle");
    yield* Effect.sleep(Duration.millis(900));
    yield* ctx.host.capture("motion-shrunk");
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
 * The focus after the dismissal is the seventh: the palette gives the focus back
 * to its opener, which is what a modal must do. `modal-focus-restore` isolates
 * the three cases that rule depends on.
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
    yield* ctx.expectEqual(
      "closing the palette returns the focus to its opener",
      yield* focusedAfterPaint(ctx),
      "palette-trigger",
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
      "Escape returns the focus to the opener too",
      yield* focusedAfterPaint(ctx),
      "palette-trigger",
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

/** The wheel probe's content: 24 rows of 40px in a 320×200 viewport. */
const SCROLL_ROWS = 24;
const SCROLL_ROW_HEIGHT = 40;
const SCROLL_VIEWPORT = { width: 320, height: 200 } as const;
/** Where the offset stops at the end: the viewport minus the content. */
const SCROLL_MAX = SCROLL_VIEWPORT.height - SCROLL_ROWS * SCROLL_ROW_HEIGHT;

/**
 * A vertical strip and the two scroll events, plus a jump control that calls the
 * last row's own `scrollIntoView`.
 *
 * The strip has no padding: the content height is exactly `rows × height`, so
 * the probe can name the clamp a wheel has to stop at instead of only checking
 * that the offset moved. Every row is a fixed height, so the text cannot grow
 * it.
 */
const ScrollProbe = (): ReactNode => {
  const theme = useTheme();
  const [events, setEvents] = useState(0);
  const [delta, setDelta] = useState(0);
  const [offset, setOffset] = useState<Smoke.Offset>({ x: 0, y: 0 });
  const end = useRef<PublicInstance | null>(null);

  return (
    <div
      testId="scroll-probe"
      style={{
        width: 720,
        height: 460,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.sm,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        A wheel is hit-tested: only the strip scrolls, and it clamps at both
        ends.
      </text>
      <div
        testId="scroll-jump"
        role="button"
        onClick={() => end.current?.scrollIntoView?.()}
        style={{
          width: 120,
          padding: theme.spacing.sm,
          borderRadius: theme.radius.sm,
          backgroundColor: theme.colors.muted,
        }}
      >
        <text
          style={{
            ...textStyle(theme, "body"),
            color: theme.colors.foreground,
          }}
        >
          jump to end
        </text>
      </div>
      <div
        testId="scroll-view"
        style={{
          ...SCROLL_VIEWPORT,
          overflow: "scroll",
          backgroundColor: theme.colors.card,
        }}
        onScroll={(event) => {
          setEvents((current) => current + 1);
          setDelta(event.deltaY ?? 0);
        }}
        onScrollChange={(event) =>
          setOffset({ x: event.scrollX ?? 0, y: event.scrollY ?? 0 })
        }
      >
        {Array.from({ length: SCROLL_ROWS }, (_, index) => (
          <div
            key={index}
            testId={`scroll-row-${index}`}
            ref={index === SCROLL_ROWS - 1 ? end : undefined}
            style={{ height: SCROLL_ROW_HEIGHT }}
          >
            <text
              style={{
                ...textStyle(theme, "body"),
                color: theme.colors.foreground,
              }}
            >
              {`row ${index}`}
            </text>
          </div>
        ))}
      </div>
      <div
        testId="scroll-outside"
        style={{
          width: 200,
          height: 60,
          backgroundColor: theme.colors.muted,
        }}
      />
      <text
        testId="scroll-events"
        style={{
          ...textStyle(theme, "code"),
          color: theme.colors.mutedForeground,
        }}
      >
        {`events=${events} delta=${delta}`}
      </text>
      <text
        testId="scroll-offset"
        style={{
          ...textStyle(theme, "code"),
          color: theme.colors.mutedForeground,
        }}
      >
        {`x=${offset.x} y=${offset.y}`}
      </text>
    </div>
  );
};

const scrollSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("scroll-view");
    yield* Effect.sleep(SETTLE);

    const offsetOf = Effect.gen(function* () {
      return yield* ctx.expectSome(
        "the scroller reports a scroll offset",
        Option.fromNullishOr(yield* ctx.host.scrollOffset("scroll-view")),
      );
    });

    const atRest = yield* offsetOf;
    yield* ctx.expectEqual("the strip starts at the top", atRest.y, 0);
    yield* ctx.expectEqual("the strip starts on the X origin", atRest.x, 0);
    yield* ctx.expectEqual(
      "the scroll-change readout starts at the origin",
      yield* ctx.host.text("scroll-offset"),
      "x=0 y=0",
    );

    // The wheel is hit-tested, so an event over a sibling reaches no scroller.
    yield* ctx.host.wheel("scroll-outside", 0, -200);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a wheel outside the strip does not move it",
      (yield* offsetOf).y,
      0,
    );
    yield* ctx.expectEqual(
      "onScroll does not fire for a wheel outside",
      yield* ctx.host.text("scroll-events"),
      "events=0 delta=0",
    );

    // GPUI's sign convention: a negative delta scrolls down.
    yield* ctx.host.wheel("scroll-view", 0, -200);
    yield* Effect.sleep(SETTLE);
    const scrolled = yield* offsetOf;
    yield* ctx.expectNear(
      "the wheel moves the strip by its own delta",
      scrolled.y,
      -200,
      1,
    );
    yield* ctx.expectEqual(
      "onScroll reports one wheel event and its delta",
      yield* ctx.host.text("scroll-events"),
      "events=1 delta=-200",
    );
    yield* ctx.expectEqual(
      "onScrollChange reports the pair the renderer holds",
      yield* ctx.host.text("scroll-offset"),
      `x=${scrolled.x} y=${scrolled.y}`,
    );

    yield* ctx.host.wheel("scroll-view", 0, 100000);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a wheel past the start clamps at zero",
      (yield* offsetOf).y,
      0,
    );

    // The row's own `scrollIntoView`, with no wheel involved.
    yield* ctx.host.click("scroll-jump");
    yield* Effect.sleep(Duration.millis(300));
    const jumped = yield* offsetOf;
    yield* ctx.expectNear(
      "scrollIntoView reaches the end of the content",
      jumped.y,
      SCROLL_MAX,
      1,
    );
    const view = yield* paintedBox(ctx, "scroll-view");
    const last = yield* paintedBox(ctx, `scroll-row-${SCROLL_ROWS - 1}`);
    yield* ctx.expectEqual(
      "the last row is wholly inside the viewport after the reveal",
      last.y >= view.y && last.y + last.height <= view.y + view.height,
      true,
    );

    yield* ctx.host.wheel("scroll-view", 0, -100000);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectNear(
      "a wheel past the end clamps at the content's end",
      (yield* offsetOf).y,
      SCROLL_MAX,
      1,
    );
    yield* ctx.host.capture("scroll-end");
  });

/** The split probe's container width, inside the window. */
const SPLIT_CONTAINER = 500;

/**
 * A two-pane split whose divider is the resize handle.
 *
 * The pane widths are the split's own state; the readout is the caller's copy of
 * each `onResize`, so a drag that repaints the pane but never reaches the caller
 * fails separately from one that does not move at all.
 */
const SplitPaneProbe = (): ReactNode => {
  const theme = useTheme();
  const [size, setSize] = useState(320);
  const [moves, setMoves] = useState(0);

  return (
    <div
      testId="split-probe"
      style={{
        width: 720,
        height: 460,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.sm,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        Drag the divider: pane A takes the width it is dragged to, and the
        container stays put.
      </text>
      <div style={{ width: SPLIT_CONTAINER, height: 160 }}>
        <SplitPane
          id="split"
          initial={320}
          min={80}
          max={520}
          onResize={(next) => {
            setSize(next);
            setMoves((current) => current + 1);
          }}
          primary={
            <div
              testId="split-left"
              style={{
                height: "100%",
                backgroundColor: theme.colors.muted,
              }}
            />
          }
          secondary={
            <div
              testId="split-right"
              style={{ height: "100%", backgroundColor: theme.colors.card }}
            />
          }
        />
      </div>
      <text
        testId="split-readout"
        style={{
          ...textStyle(theme, "code"),
          color: theme.colors.mutedForeground,
        }}
      >
        {`split=${size}`}
      </text>
      <text
        testId="split-moves"
        style={{
          ...textStyle(theme, "code"),
          color: theme.colors.mutedForeground,
        }}
      >
        {`moves=${moves}`}
      </text>
    </div>
  );
};

const splitSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("split-divider");
    yield* Effect.sleep(SETTLE);

    yield* ctx.expectEqual(
      "the split starts at its initial width",
      yield* ctx.host.text("split-readout"),
      "split=320",
    );
    const start = yield* paintedBox(ctx, "split-pane-a");
    yield* ctx.expectNear(
      "pane A paints the initial width",
      start.width,
      320,
      1,
    );
    const divider = yield* paintedBox(ctx, "split-divider");
    yield* ctx.expectNear(
      "the divider sits on pane A's right edge",
      divider.x,
      start.x + start.width,
      1,
    );

    // Every drag stays inside the window: a pointer that leaves it stops
    // delivering moves, which would measure the OS rather than the split.
    yield* ctx.host.drag("split-divider", 80, 0);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a drag grows the pane by its travel",
      yield* ctx.host.text("split-readout"),
      "split=400",
    );
    const grown = yield* paintedBox(ctx, "split-pane-a");
    yield* ctx.expectNear(
      "the painted pane follows the resize",
      grown.width,
      400,
      1,
    );
    yield* ctx.expectEqual(
      "every move of the drag reached the divider, 6px wide and left behind",
      yield* ctx.host.text("split-moves"),
      "moves=8",
    );

    yield* ctx.host.drag("split-divider", -320, 0);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a drag past the minimum clamps",
      yield* ctx.host.text("split-readout"),
      "split=80",
    );

    yield* ctx.host.drag("split-divider", 600, 0);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a drag past the maximum clamps",
      yield* ctx.host.text("split-readout"),
      "split=520",
    );

    yield* ctx.host.drag("split-pane-a", 40, 0);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a drag on the pane itself resizes nothing",
      yield* ctx.host.text("split-readout"),
      "split=520",
    );

    yield* ctx.host.capture("split-resized");
  });

/** The virtual list probe's row height and count, and its viewport. */
const VLIST_ROWS = 5000;
const VLIST_ROW_HEIGHT = 32;
const VLIST_VIEWPORT = 280;

/**
 * A `<virtual-list>` of 5 000 rows in a 280px viewport.
 *
 * The retained tree holds all 5 000 children; the runtime builds and paints only
 * those near the viewport, so the check is the painted text, never the child
 * count. `onVisibleRange` is the event a table needs to know where it is.
 */
const VirtualListProbe = (): ReactNode => {
  const theme = useTheme();
  const [first, setFirst] = useState(-1);
  const [last, setLast] = useState(-1);
  const [reports, setReports] = useState(0);

  return (
    <div
      testId="vlist-probe"
      style={{
        width: 420,
        height: 420,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.sm,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        5 000 rows, one viewport: only the painted window exists.
      </text>
      <div
        testId="vlist-frame"
        style={{ display: "flex", height: VLIST_VIEWPORT }}
      >
        <virtual-list
          testId="vlist"
          style={{ flexGrow: 1, minHeight: 0 }}
          onVisibleRange={(event) => {
            setFirst(event.startIndex ?? -1);
            setLast(event.endIndex ?? -1);
            setReports((current) => current + 1);
          }}
        >
          {Array.from({ length: VLIST_ROWS }, (_, index) => (
            <div
              key={index}
              testId={`vlist-row-${index}`}
              style={{ height: VLIST_ROW_HEIGHT }}
            >
              <text
                style={{
                  ...textStyle(theme, "body"),
                  color: theme.colors.foreground,
                }}
              >
                {`row ${index}`}
              </text>
            </div>
          ))}
        </virtual-list>
      </div>
      <text
        testId="vlist-range"
        style={{
          ...textStyle(theme, "code"),
          color: theme.colors.mutedForeground,
        }}
      >
        {`first=${first} last=${last} reports=${reports}`}
      </text>
    </div>
  );
};

/** The `row <n>` lines the window actually painted. */
const paintedRows = (lines: ReadonlyArray<string>): number =>
  Arr.length(Arr.filter(lines, (line) => Str.startsWith("row ")(line)));

const virtualListSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("vlist");
    yield* Effect.sleep(SETTLE);

    const atRest = yield* ctx.host.paintedText();
    yield* ctx.expectEqual(
      "the window paints the first row",
      Arr.contains(atRest, "row 0"),
      true,
    );
    yield* ctx.expectEqual(
      "the last of 5 000 rows is not painted",
      Arr.contains(atRest, `row ${VLIST_ROWS - 1}`),
      false,
    );
    const painted = paintedRows(atRest);
    yield* ctx.expectEqual(
      "only a window of rows exists, not the retained 5 000",
      painted > 0 && painted < 40,
      true,
    );
    yield* ctx.expectEqual(
      "no visible range is reported before the first scroll",
      yield* ctx.host.text("vlist-range"),
      "first=-1 last=-1 reports=0",
    );

    // A `<virtual-list>` reports no painted bounds of its own, so the wheel is
    // aimed at the frame it fills; the hit test still lands on the list.
    yield* ctx.host.wheel("vlist-frame", 0, -400);
    yield* Effect.sleep(Duration.millis(300));
    const scrolled = yield* ctx.host.paintedText();
    yield* ctx.expectEqual(
      "the painted window moves past the first row",
      Arr.contains(scrolled, "row 0"),
      false,
    );
    const firstReport = yield* ctx.host.text("vlist-range");
    yield* ctx.expectEqual(
      "the first report still starts at the first row (measured lag)",
      Str.includes("first=0 last=")(firstReport),
      true,
    );
    yield* ctx.expectEqual(
      "one scroll reports one range",
      Str.includes("reports=1")(firstReport),
      true,
    );
    yield* ctx.host.capture("vlist-scrolled");

    // A second scroll's report carries the range the first one reached: the
    // event lags one scroll, so a table cannot read the current window from it.
    yield* ctx.host.wheel("vlist-frame", 0, -400);
    yield* Effect.sleep(Duration.millis(300));
    const secondReport = yield* ctx.host.text("vlist-range");
    yield* ctx.expectEqual(
      "the second report has caught up to the moved window",
      Str.includes("first=0 ")(secondReport),
      false,
    );
    yield* ctx.expectEqual(
      "two scrolls report two ranges",
      Str.includes("reports=2")(secondReport),
      true,
    );

    // Past the start clamps back to the first row.
    yield* ctx.host.wheel("vlist-frame", 0, 100000);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a wheel past the start returns to the first row",
      Arr.contains(yield* ctx.host.paintedText(), "row 0"),
      true,
    );
  });

/** The app-level shortcut probe: a palette toggled by the window's own key handler. */
const WindowKeyProbe = (): ReactNode => {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [last, setLast] = useState("none");

  useWindowKey((event) => {
    if (event.key === "k" && event.modifiers?.cmd === true) {
      setOpen((current) => !current);
      setLast("cmd-k");
    }
    if (event.key === "escape") {
      setOpen(false);
      setLast("escape");
    }
  });

  return (
    <div
      testId="shortcut-probe"
      tabIndex={0}
      autoFocus
      style={{
        width: 720,
        height: 460,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.sm,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        cmd-k is the window's key, not the focused element's; Escape closes.
      </text>
      <div
        testId="shortcut-other"
        tabIndex={0}
        role="button"
        style={{
          width: 160,
          padding: theme.spacing.sm,
          borderRadius: theme.radius.sm,
          backgroundColor: theme.colors.muted,
        }}
      >
        <text
          style={{
            ...textStyle(theme, "body"),
            color: theme.colors.foreground,
          }}
        >
          another focus
        </text>
      </div>
      <text
        testId="shortcut-readout"
        style={{
          ...textStyle(theme, "code"),
          color: theme.colors.mutedForeground,
        }}
      >
        {`open=${open} last=${last}`}
      </text>
      {open ? (
        <div
          testId="shortcut-palette"
          style={{
            width: 240,
            padding: theme.spacing.md,
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.card,
            borderWidth: theme.borderWidth.thin,
            borderColor: theme.colors.border,
          }}
        >
          <text
            style={{
              ...textStyle(theme, "body"),
              color: theme.colors.foreground,
            }}
          >
            command palette
          </text>
        </div>
      ) : null}
    </div>
  );
};

const windowKeySteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("shortcut-readout");
    yield* Effect.sleep(SETTLE);

    yield* ctx.expectEqual(
      "the palette starts closed",
      yield* ctx.host.text("shortcut-readout"),
      "open=false last=none",
    );

    yield* ctx.host.key("cmd-k");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "cmd-k reaches the window handler",
      yield* ctx.host.text("shortcut-readout"),
      "open=true last=cmd-k",
    );
    yield* ctx.expectContains(
      "the palette paints",
      Arr.join(yield* ctx.host.paintedText(), "\n"),
      "command palette",
    );
    yield* ctx.host.capture("shortcut-open");

    yield* ctx.host.key("escape");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Escape closes the palette",
      yield* ctx.host.text("shortcut-readout"),
      "open=false last=escape",
    );

    // The shortcut belongs to the window, so moving the focus to a control with
    // no key handler must not take it away.
    yield* ctx.host.click("shortcut-other");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the other control holds the focus",
      Option.getOrElse(
        Option.fromNullishOr(yield* ctx.host.focused()),
        () => "none",
      ),
      "shortcut-other",
    );
    yield* ctx.host.key("cmd-k");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "cmd-k still opens it from another focus",
      yield* ctx.host.text("shortcut-readout"),
      "open=true last=cmd-k",
    );
  });

/** The gap the select's list opens with, measured back from the paint. */
const SELECT_GAP = 6;

/** One option the probe's selects offer. */
interface ProbeOption {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

/**
 * The options every select in the probe offers.
 *
 * `Archived` is disabled and comes last on purpose: an arrow that starts on
 * `Monthly` has to wrap past it to reach `Daily`, so the skip cannot be
 * explained by the list simply ending.
 */
const SELECT_OPTIONS: ReadonlyArray<ProbeOption> = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "archived", label: "Archived", disabled: true },
];

/** One select, wired to a readout that prints what React received. */
const ProbeSelect = ({
  testId,
  disabled = false,
  options,
  onValueChange,
}: {
  readonly testId: string;
  readonly disabled?: boolean;
  readonly options: ReadonlyArray<ProbeOption>;
  readonly onValueChange?: (value: string) => void;
}): ReactNode => {
  const theme = useTheme();
  const items = Arr.map(options, (option) => ({
    value: option.value,
    label: option.label,
  }));
  return (
    <GpuixSelect
      items={items}
      defaultValue="daily"
      disabled={disabled}
      onValueChange={onValueChange}
      style={{ width: 260 }}
    >
      <SelectTrigger
        testId={`${testId}-trigger`}
        style={(state) => ({
          ...textStyle(theme, "body"),
          color: state.disabled
            ? theme.colors.disabledForeground
            : theme.colors.foreground,
          padding: theme.spacing.sm,
          borderRadius: theme.radius.md,
          borderWidth: theme.borderWidth.thin,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.input,
        })}
      >
        <SelectValue placeholder="Choose a cadence" />
      </SelectTrigger>
      <SelectContent
        testId={`${testId}-list`}
        sideOffset={SELECT_GAP}
        style={{
          padding: theme.spacing.xs,
          borderRadius: theme.radius.md,
          borderWidth: theme.borderWidth.thin,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.popover,
        }}
      >
        {Arr.map(options, (option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            disabled={option.disabled === true}
            testId={`${testId}-row-${option.value}`}
            style={(state) => ({
              padding: theme.spacing.sm,
              borderRadius: theme.radius.sm,
              backgroundColor: state.highlighted
                ? theme.colors.accent
                : undefined,
            })}
          >
            <text
              style={{
                ...textStyle(theme, "body"),
                color:
                  option.disabled === true
                    ? theme.colors.disabledForeground
                    : theme.colors.popoverForeground,
              }}
            >
              {option.label}
            </text>
          </SelectItem>
        ))}
      </SelectContent>
    </GpuixSelect>
  );
};

/**
 * The runtime's own `Select` in a window.
 *
 * The list is the runtime's, not the library's: it paints in an anchored layer,
 * takes the focus, moves a highlight over the enabled rows and dismisses on
 * Escape or an outside press. The shipped primitive is a themed wrapper around
 * these parts and passes only a **root** `testId`, so a probe built on the
 * wrapper could not address the trigger or a row. The parts mounted here are
 * the ones the wrapper composes, and the measurement is of the behaviour both
 * share — the claim in `COMPONENTS.md` that open state, positioning and
 * dismissal "are the runtime's".
 */
const SelectProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const [value, setValue] = useState("daily");
  const [changes, setChanges] = useState(0);
  const [shipped, setShipped] = useState({ value: "daily", changes: 0 });
  const [presses, setPresses] = useState(0);
  const record = (next: string) => {
    setValue(next);
    setChanges((count) => count + 1);
  };

  return (
    <div
      testId="select-probe"
      style={{
        width: window.width,
        height: window.height,
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
        The runtime's Select: the list opens in its own layer, selects by press
        and by key, and dismisses on Escape or an outside press.
      </text>
      <ProbeSelect
        testId="select"
        options={SELECT_OPTIONS}
        onValueChange={record}
      />
      <text
        testId="select-readout"
        style={{
          ...textStyle(theme, "code"),
          color: theme.colors.foreground,
        }}
      >
        {`value=${value} changes=${changes}`}
      </text>
      {/* The shipped wrapper, addressed the way an automation test has to
          address it: the root paints only its width, so the trigger and the
          data-driven rows are the locators (`triggerTestId`/`itemTestId`). */}
      <PrimitiveThemeProvider theme={palettes.dark}>
        <PrimitiveSelect
          label="Shipped cadence"
          defaultValue="daily"
          options={SELECT_OPTIONS}
          triggerTestId="shipped-trigger"
          itemTestId={(option) => `shipped-row-${option}`}
          onValueChange={(next) =>
            setShipped((current) => ({
              value: next,
              changes: current.changes + 1,
            }))
          }
        />
      </PrimitiveThemeProvider>
      <text
        testId="shipped-readout"
        style={{
          ...textStyle(theme, "code"),
          color: theme.colors.foreground,
        }}
      >
        {`value=${shipped.value} changes=${shipped.changes}`}
      </text>
      <div
        style={{ display: "flex", flexDirection: "row", gap: theme.spacing.xl }}
      >
        <ProbeSelect
          testId="select-disabled"
          disabled
          options={SELECT_OPTIONS}
        />
      </div>
      {/* Top-right: a press outside the list has to land on something that is
          not the list, and nothing the list opens over can cover this corner. */}
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
        <div
          testId="select-elsewhere"
          role="button"
          onClick={() => setPresses((count) => count + 1)}
          style={{
            padding: theme.spacing.sm,
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.muted,
          }}
        >
          <text
            style={{
              ...textStyle(theme, "body"),
              color: theme.colors.foreground,
            }}
          >
            Elsewhere
          </text>
        </div>
        <text
          testId="select-elsewhere-readout"
          style={{
            ...textStyle(theme, "code"),
            color: theme.colors.foreground,
          }}
        >
          {`presses=${presses}`}
        </text>
      </div>
    </div>
  );
};

const selectSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    /** Whether `testId` is absent from the window's tree. */
    const painted = (
      testId: string,
    ): Effect.Effect<boolean, Smoke.SmokeHostError> =>
      Effect.map(ctx.host.bounds(testId), (bounds) =>
        Option.isSome(Option.fromNullishOr(bounds)),
      );
    /** Opens the enabled select and waits one paint. */
    const open = Effect.flatMap(ctx.host.click("select-trigger"), () =>
      Effect.sleep(SETTLE),
    );

    yield* ctx.host.waitFor("select-trigger");
    yield* ctx.expectContains(
      "the trigger paints the selected label",
      yield* ctx.host.text("select-trigger"),
      "Daily",
    );
    yield* ctx.expectEqual(
      "the readout starts on the selected value",
      yield* ctx.host.text("select-readout"),
      "value=daily changes=0",
    );
    yield* ctx.expectEqual(
      "the list is not painted before the trigger is pressed",
      yield* painted("select-list"),
      false,
    );

    // The press: the list paints in the runtime's layer, below its trigger.
    yield* open;
    const trigger = yield* paintedBox(ctx, "select-trigger");
    const list = yield* paintedBox(ctx, "select-list");
    yield* ctx.expectEqual(
      "pressing the trigger paints the list",
      yield* painted("select-row-weekly"),
      true,
    );
    yield* ctx.expectEqual(
      "the list opens below its trigger",
      list.y >= trigger.y + trigger.height,
      true,
    );
    yield* ctx.expectNear(
      "the list keeps the gap it was given below the trigger",
      list.y - (trigger.y + trigger.height),
      SELECT_GAP,
      1,
    );
    yield* ctx.expectNear(
      "the list starts at the trigger's start edge",
      list.x,
      trigger.x,
      1,
    );
    yield* ctx.expectEqual(
      "opening moves the focus into the list",
      yield* focusedAfterPaint(ctx),
      "select-list",
    );
    yield* ctx.host.capture("select-open");

    // A pointer selects a row, and the trigger repaints with its label.
    yield* ctx.host.click("select-row-weekly");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a press on a row selects it",
      yield* ctx.host.text("select-readout"),
      "value=weekly changes=1",
    );
    yield* ctx.expectContains(
      "the trigger paints the new label",
      yield* ctx.host.text("select-trigger"),
      "Weekly",
    );
    yield* ctx.expectEqual(
      "selecting unpaints the list",
      yield* painted("select-list"),
      false,
    );
    yield* ctx.host.capture("select-picked");

    // The keyboard path: the list opens on the selected row, one arrow moves the
    // highlight off it, and Enter selects the row the highlight landed on.
    yield* open;
    yield* ctx.host.key("down");
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.key("enter");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "an arrow moves the highlight off the selected row and Enter selects it",
      yield* ctx.host.text("select-readout"),
      "value=monthly changes=2",
    );

    // From the last enabled row, the next arrow wraps past the disabled one.
    yield* open;
    yield* ctx.host.key("down");
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.key("enter");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "an arrow skips the disabled row and wraps to the first enabled one",
      yield* ctx.host.text("select-readout"),
      "value=daily changes=3",
    );

    // Escape closes without choosing, and gives the focus back.
    yield* open;
    yield* ctx.host.key("escape");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Escape unpaints the list",
      yield* painted("select-list"),
      false,
    );
    yield* ctx.expectEqual(
      "Escape leaves the selection alone",
      yield* ctx.host.text("select-readout"),
      "value=daily changes=3",
    );
    yield* ctx.expectEqual(
      "Escape gives the focus back to the trigger",
      yield* focusedAfterPaint(ctx),
      "select-trigger",
    );

    // An outside press closes it too, and reaches the control it landed on.
    yield* open;
    yield* ctx.host.click("select-elsewhere");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "an outside press reaches the control it landed on",
      yield* ctx.host.text("select-elsewhere-readout"),
      "presses=1",
    );
    yield* ctx.expectEqual(
      "an outside press unpaints the list",
      yield* painted("select-list"),
      false,
    );
    yield* ctx.expectEqual(
      "an outside press leaves the selection alone",
      yield* ctx.host.text("select-readout"),
      "value=daily changes=3",
    );

    // A disabled row paints and refuses the choice; the list stays open.
    yield* open;
    yield* ctx.host.click("select-row-archived");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a disabled row changes nothing",
      yield* ctx.host.text("select-readout"),
      "value=daily changes=3",
    );
    yield* ctx.expectEqual(
      "a disabled row leaves the list open",
      yield* painted("select-list"),
      true,
    );
    yield* ctx.host.key("escape");
    yield* Effect.sleep(SETTLE);

    // The trigger toggles its own list closed.
    yield* open;
    yield* ctx.host.click("select-trigger");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a second press on the trigger unpaints the list",
      yield* painted("select-list"),
      false,
    );

    // A disabled select refuses the press entirely.
    yield* ctx.host.click("select-disabled-trigger");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a disabled select ignores a press",
      yield* painted("select-disabled-list"),
      false,
    );
    yield* ctx.expectContains(
      "a disabled select keeps its label",
      yield* ctx.host.text("select-disabled-trigger"),
      "Daily",
    );

    // The shipped wrapper half: `triggerTestId` and `itemTestId` are what make a
    // Select driveable from automation at all, so these checks address the
    // library's own control rather than the runtime parts.
    yield* ctx.expectContains(
      "the shipped trigger paints its selected label",
      yield* ctx.host.text("shipped-trigger"),
      "Daily",
    );
    yield* ctx.expectEqual(
      "the shipped select starts on its default",
      yield* ctx.host.text("shipped-readout"),
      "value=daily changes=0",
    );
    yield* ctx.expectEqual(
      "the shipped list is closed at rest",
      yield* painted("shipped-row-weekly"),
      false,
    );
    yield* ctx.host.click("shipped-trigger");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a press on the shipped trigger opens its list",
      yield* painted("shipped-row-weekly"),
      true,
    );
    yield* ctx.host.click("shipped-row-weekly");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a press on a shipped row selects it",
      yield* ctx.host.text("shipped-readout"),
      "value=weekly changes=1",
    );
    yield* ctx.expectContains(
      "the shipped trigger repaints with the new label",
      yield* ctx.host.text("shipped-trigger"),
      "Weekly",
    );
    yield* ctx.expectEqual(
      "selecting a shipped row closes the list",
      yield* painted("shipped-row-monthly"),
      false,
    );

    // The keyboard path is still the runtime's: the wrapper must not intercept
    // it. Opening lands on the selected row, so one arrow reaches the next.
    yield* ctx.host.click("shipped-trigger");
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.key("down");
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.key("enter");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "an arrow and Enter choose the next shipped row",
      yield* ctx.host.text("shipped-readout"),
      "value=monthly changes=2",
    );

    yield* ctx.host.click("shipped-trigger");
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.key("escape");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Escape closes the shipped list",
      yield* painted("shipped-row-weekly"),
      false,
    );
    yield* ctx.expectEqual(
      "Escape gives the shipped trigger its focus back",
      yield* focusedAfterPaint(ctx),
      "shipped-trigger",
    );
  });

/**
 * The clipboard in a window: whether the platform's own copy and paste reach a
 * shipped field, and whether the application can see the keys at all.
 *
 * The runtime publishes no clipboard API — no write, no read — so a "copy"
 * action that must reach the OS can only be the platform's text-input action.
 * The probe types into nothing, selects with `cmd-a`, copies with `cmd-c` and
 * pastes into a second field with `cmd-v`, so the value the second field reports
 * through `onChange` is the system clipboard's, round-tripped by GPUI itself.
 * It writes **its own marker** to the clipboard and never reads what was there.
 */
const ClipboardProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  // A marker unique to this mount: a previous run leaves its own text on the
  // system clipboard, so a fixed string could pass a paste check without the
  // copy having run at all.
  const [source, setSource] = useState(
    () => `gpuix clipboard ${Math.random().toString(36).slice(2, 8)}`,
  );
  const [target, setTarget] = useState("");
  const [keys, setKeys] = useState<ReadonlyArray<string>>([]);

  useWindowKey((event) => {
    if (event.modifiers?.cmd !== true) return;
    const key = event.key;
    if (key === undefined) return;
    setKeys((seen) => (Arr.contains(seen, key) ? seen : Arr.append(seen, key)));
  });

  return (
    <div
      testId="clipboard-probe"
      style={{
        width: window.width,
        height: window.height,
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
        The platform's clipboard inside a window: select, copy, paste into the
        second field, and cut it back out.
      </text>
      <PrimitiveThemeProvider theme={palettes.dark}>
        <Input
          testId="clipboard-source"
          label="Source"
          value={source}
          onChange={setSource}
        />
        <Input
          testId="clipboard-target"
          label="Target"
          value={target}
          onChange={setTarget}
        />
      </PrimitiveThemeProvider>
      <div
        testId="clipboard-other"
        tabIndex={0}
        role="button"
        style={{
          padding: theme.spacing.sm,
          borderRadius: theme.radius.sm,
          backgroundColor: theme.colors.muted,
        }}
      >
        <text
          style={{
            ...textStyle(theme, "body"),
            color: theme.colors.foreground,
          }}
        >
          another focus
        </text>
      </div>
      <text
        testId="clipboard-source-value"
        style={{
          ...textStyle(theme, "code"),
          color: theme.colors.foreground,
        }}
      >
        {source}
      </text>
      <text
        testId="clipboard-target-value"
        style={{
          ...textStyle(theme, "code"),
          color: theme.colors.foreground,
        }}
      >
        {target}
      </text>
      <text
        testId="clipboard-keys"
        style={{
          ...textStyle(theme, "code"),
          color: theme.colors.mutedForeground,
        }}
      >
        {`keys=${Arr.join(keys, ",")}`}
      </text>
    </div>
  );
};

const clipboardSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("clipboard-source");
    // The window handler is registered from an effect, so the first frame can
    // paint before it is in place.
    yield* Effect.sleep(SETTLE);
    const marker = yield* ctx.host.text("clipboard-source-value");
    yield* ctx.expectContains(
      "the source holds this mount's marker",
      marker,
      "gpuix clipboard ",
    );
    yield* ctx.expectEqual(
      "the target starts empty",
      yield* ctx.host.text("clipboard-target-value"),
      "",
    );

    // Select all and copy in the source, then paste into the empty target.
    yield* ctx.host.click("clipboard-source");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the source takes the focus",
      Option.getOrElse(
        Option.fromNullishOr(yield* ctx.host.focused()),
        () => "none",
      ),
      "clipboard-source",
    );
    yield* ctx.host.key("cmd-a");
    yield* ctx.host.key("cmd-c");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the field's select and copy reach no window handler",
      yield* ctx.host.text("clipboard-keys"),
      "keys=",
    );
    yield* ctx.host.click("clipboard-target");
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.key("cmd-v");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "paste delivers the copied text into the second field",
      yield* ctx.host.text("clipboard-target-value"),
      marker,
    );
    yield* ctx.expectEqual(
      "copying leaves the source as it was",
      yield* ctx.host.text("clipboard-source-value"),
      marker,
    );
    yield* ctx.host.capture("clipboard-pasted");

    // Cut it back out: the platform's own cut must reach `onChange` too.
    yield* ctx.host.key("cmd-a");
    yield* ctx.host.key("cmd-x");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "cut empties the field it ran in",
      yield* ctx.host.text("clipboard-target-value"),
      "",
    );
    // The control: a cmd key reaches the window handler from a focusable control
    // that has no key handler of its own, so the empty log below cannot be a
    // broken registration.
    yield* ctx.host.click("clipboard-other");
    yield* ctx.host.key("cmd-k");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a cmd key reaches the window handler from a control with no handler",
      yield* ctx.host.text("clipboard-keys"),
      "keys=k",
    );

    yield* ctx.expectEqual(
      "the field keeps every clipboard key from the window handler",
      yield* ctx.host.text("clipboard-keys"),
      "keys=k",
    );
  });

/** The line the selection probe selects: a word a failure can name. */
const SELECTION_LINE = "hello live selection world";

/** The chrome line: the default `Text` must keep a drag from selecting it. */
const SELECTION_CHROME = "chrome must not select";

/**
 * The wash the probe asks for, in a colour no role paints.
 *
 * A capture is device-scaled, so the probe counts a colour rather than reading a
 * point: an opaque green behind the selected run is the one pixel value the drag
 * can produce and nothing else can.
 */
const SELECTION_WASH = "#00FF00FF";

/** The probe's theme: the base palette with a measurable selection wash. */
const selectionTheme = extendTheme(palettes.dark, {
  colors: { selection: SELECTION_WASH },
});

/**
 * Selection in a window, on its **paint** and on what the renderer reports.
 *
 * The headless `text-selection` scenario drives the renderer's own
 * `dragSelect`, because the offscreen renderer registers selection listeners
 * during paint — so "a drag selects" was never measured with a pointer. This
 * probe drags with the automation protocol (a real press, eight moves and a
 * release) and asks two separate questions: does the wash paint, and does
 * `getSelectedText` report the run? A component that copies a selected log line
 * needs both answers, and they turn out to differ.
 */
const SelectionProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const [copied, setCopied] = useState("");
  return (
    <PrimitiveThemeProvider theme={selectionTheme}>
      <div
        testId="selection-live-probe"
        style={{
          width: window.width,
          height: window.height,
          padding: theme.spacing.xl,
          backgroundColor: theme.colors.background,
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.lg,
        }}
      >
        <Text
          testId="live-selectable-line"
          selectable
          style={{ alignSelf: "start" }}
        >
          {SELECTION_LINE}
        </Text>
        <Text testId="live-chrome-line" style={{ alignSelf: "start" }}>
          {SELECTION_CHROME}
        </Text>
        <Input
          testId="live-selection-field"
          label="Paste target"
          value={copied}
          onChange={setCopied}
        />
        <text
          testId="live-selection-readout"
          style={{
            ...textStyle(theme, "code"),
            color: theme.colors.foreground,
          }}
        >
          {`copied=${copied}`}
        </text>
      </div>
    </PrimitiveThemeProvider>
  );
};

const selectionSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    /** How many pixels of the capture under `name` paint the probe's wash. */
    const washPixels = (
      name: string,
      wash: Pixels.Rgba,
    ): Effect.Effect<number, Smoke.SmokeHostError> =>
      Effect.map(ctx.host.pixels(name), (frame) =>
        Pixels.countColour(frame, wash),
      );

    yield* ctx.host.waitFor("live-selectable-line");
    const wash = yield* ctx.expectSome(
      "the probe's wash colour parses",
      Option.fromNullishOr(Pixels.hexToRgba(SELECTION_WASH)),
    );
    yield* ctx.expectContains(
      "the selectable line paints its text",
      Arr.join(yield* ctx.host.paintedText(), "\n"),
      SELECTION_LINE,
    );
    yield* ctx.host.clearSelection();
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.capture("selection-before");
    yield* ctx.expectEqual(
      "nothing paints the selection wash before a drag",
      yield* washPixels("selection-before", wash),
      0,
    );

    // A real pointer drag from the middle of the line past its right edge.
    yield* ctx.host.drag("live-selectable-line", 240, 0);
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.capture("selection-dragged");
    yield* ctx.expectEqual(
      "a pointer drag paints the selection wash",
      (yield* washPixels("selection-dragged", wash)) > 0,
      true,
    );
    const selected = yield* ctx.expectSome(
      "the renderer reports the text the drag selected",
      Option.fromNullishOr(yield* ctx.host.selectedText()),
    );
    yield* ctx.expectContains(
      "the reported selection reaches the end of the line",
      selected,
      "world",
    );

    // Can a user take the selection with them? `cmd-c` from a selected text run
    // is the copy path a log viewer or a code block would need.
    yield* ctx.host.key("cmd-c");
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.click("live-selection-field");
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.key("cmd-v");
    yield* Effect.sleep(SETTLE);
    const pasted = yield* ctx.host.text("live-selection-readout");
    yield* ctx.expectContains(
      "Cmd+C over the selected run copies it to the clipboard",
      pasted,
      selected,
    );
    yield* ctx.expectContains(
      "the pasted text is the run the drag selected",
      selected,
      "world",
    );

    // Clearing unpaints it, which is the third direction: the same capture,
    // after one call.
    yield* ctx.host.clearSelection();
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.capture("selection-cleared");
    yield* ctx.expectEqual(
      "clearing unpaints the selection wash",
      yield* washPixels("selection-cleared", wash),
      0,
    );

    // The opt-out: the same drag over the default node paints no wash.
    yield* ctx.host.drag("live-chrome-line", 240, 0);
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.capture("selection-chrome");
    yield* ctx.expectEqual(
      "a drag over the chrome line paints no selection wash",
      yield* washPixels("selection-chrome", wash),
      0,
    );
  });

/**
 * One focusable tree row.
 *
 * The row owns the focus and the keyboard; the disclosure marker is a pointer
 * target only, so opening a directory never adds a second tab stop per row.
 * Its element id is registered by ref: `focusElement` takes a native id, and a
 * row inside a `<virtual-list>` mounts and unmounts as the window moves.
 */
const TreeRow = ({
  node,
  open,
  selected,
  register,
  onSelect,
  onToggle,
  onKey,
}: {
  readonly node: TreeNode;
  readonly open: boolean;
  readonly selected: boolean;
  readonly register: (id: string, elementId: number | null) => void;
  readonly onSelect: (node: TreeNode) => void;
  readonly onToggle: (node: TreeNode) => void;
  readonly onKey: (node: TreeNode, key: string) => void;
}): ReactNode => {
  const theme = useTheme();
  const attach = useCallback(
    (instance: PublicInstance | null) =>
      register(node.id, instance?.id ?? null),
    [node.id, register],
  );
  return (
    <div
      testId={rowTestId(node)}
      ref={attach}
      tabIndex={0}
      role="treeitem"
      aria-level={node.depth + 1}
      aria-expanded={node.kind === "dir" ? open : undefined}
      aria-selected={selected}
      onClick={() => onSelect(node)}
      onKeyDown={(event) => onKey(node, event.key ?? "")}
      style={{
        height: TREE_ROW_HEIGHT,
        display: "flex",
        alignItems: "center",
        paddingLeft: labelInset(node),
        backgroundColor: selected ? theme.colors.accent : theme.colors.card,
        ...keyboardFocusRing(theme),
      }}
    >
      {node.kind === "dir" ? (
        <div
          testId={toggleTestId(node)}
          onClick={() => onToggle(node)}
          style={{ width: TREE_INDENT, height: TREE_ROW_HEIGHT }}
        >
          <text
            style={{
              ...textStyle(theme, "caption"),
              color: theme.colors.mutedForeground,
            }}
          >
            {open ? "v" : ">"}
          </text>
        </div>
      ) : (
        <div style={{ width: TREE_INDENT, height: TREE_ROW_HEIGHT }} />
      )}
      <text
        testId={labelTestId(node)}
        style={{
          ...textStyle(theme, "body"),
          color:
            node.kind === "dir"
              ? theme.colors.foreground
              : theme.colors.mutedForeground,
        }}
      >
        {node.label}
      </text>
    </div>
  );
};

/**
 * A virtualized file tree: one `<virtual-list>` child per visible node.
 *
 * The keyboard model is the tree's own: arrows move native focus between rows
 * through the renderer (`focusElement`), Right opens a directory then enters it,
 * Left collapses or returns to the parent. A row only exists while it is near
 * the viewport, so the ids are kept in a ref keyed by node id.
 */
const VirtualTreeProbe = (): ReactNode => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const [expanded, setExpanded] = useState<ReadonlyArray<string>>([]);
  const [selected, setSelected] = useState("none");
  const [range, setRange] = useState("none");
  const [reports, setReports] = useState(0);
  const elements = useRef(new Map<string, number>());

  const rows = visibleRows(expanded);
  const isOpen = (id: string): boolean => Arr.contains(expanded, id);

  const register = useCallback((id: string, elementId: number | null) => {
    const map = elements.current;
    if (elementId === null) map.delete(id);
    else map.set(id, elementId);
  }, []);

  const focusRow = (node: TreeNode): void => {
    const elementId = elements.current.get(node.id);
    if (elementId !== undefined) renderer?.focusElement?.(elementId);
  };

  const toggle = (node: TreeNode): void =>
    setExpanded((current) =>
      Arr.contains(current, node.id)
        ? Arr.filter(current, (id) => id !== node.id)
        : Arr.append(current, node.id),
    );

  /** Moves the roving focus by `delta` visible rows, if the row exists. */
  const step = (node: TreeNode, delta: number): void => {
    Option.match(
      Option.flatMap(
        Arr.findFirstIndex(rows, (row) => row.id === node.id),
        (index) => Arr.get(rows, index + delta),
      ),
      { onNone: () => undefined, onSome: focusRow },
    );
  };

  const onKey = (node: TreeNode, key: string): void => {
    Match.value(key).pipe(
      Match.when("down", () => step(node, 1)),
      Match.when("up", () => step(node, -1)),
      Match.when("right", () => {
        if (node.kind !== "dir") return;
        if (isOpen(node.id)) step(node, 1);
        else toggle(node);
      }),
      Match.when("left", () => {
        if (node.kind === "file") {
          Option.match(
            Arr.findFirst(rows, (row) => row.id === node.parent),
            { onNone: () => undefined, onSome: focusRow },
          );
          return;
        }
        if (isOpen(node.id)) toggle(node);
      }),
      Match.when("enter", () => setSelected(node.id)),
      Match.when("space", () => setSelected(node.id)),
      Match.orElse(() => undefined),
    );
  };

  return (
    <div
      testId="tree-probe"
      style={{
        width: 720,
        height: 470,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.sm,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        4 000 nodes flattened into one list: only the window near the viewport
        exists.
      </text>
      <PrimitiveThemeProvider theme={palettes.dark}>
        <div style={{ display: "flex", gap: theme.spacing.sm }}>
          <Button
            testId="tree-expand-all"
            size="sm"
            onActivate={() => setExpanded(TREE_ALL_DIRECTORIES)}
          >
            Expand all
          </Button>
          <Button
            testId="tree-collapse-all"
            size="sm"
            variant="secondary"
            onActivate={() => setExpanded([])}
          >
            Collapse all
          </Button>
        </div>
      </PrimitiveThemeProvider>
      <div
        testId="tree-frame"
        style={{
          display: "flex",
          height: TREE_VIEWPORT_HEIGHT,
          backgroundColor: theme.colors.card,
          borderWidth: theme.borderWidth.thin,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.md,
        }}
      >
        <virtual-list
          testId="tree-list"
          style={{ flexGrow: 1, minHeight: 0 }}
          onVisibleRange={(event) => {
            setRange(`${event.startIndex ?? -1}..${event.endIndex ?? -1}`);
            setReports((current) => current + 1);
          }}
        >
          {Arr.map(rows, (node) => (
            <TreeRow
              key={node.id}
              node={node}
              open={node.kind === "dir" && isOpen(node.id)}
              selected={selected === node.id}
              register={register}
              onSelect={(row) => setSelected(row.id)}
              onToggle={toggle}
              onKey={onKey}
            />
          ))}
        </virtual-list>
      </div>
      <Readout testId="tree-readout">
        {`visible=${rows.length} expanded=${expanded.length} selected=${selected} range=${range}`}
      </Readout>
      <Readout testId="tree-reports">{`reports=${reports}`}</Readout>
    </div>
  );
};

/** A row line the window painted: the tree's labels, never its readout. */
const paintedTreeRows = (lines: ReadonlyArray<string>): number =>
  Arr.length(
    Arr.filter(
      lines,
      (line) => Str.startsWith("dir ")(line) || Str.startsWith("file ")(line),
    ),
  );

const virtualTreeSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    /** The focused row's testId, asserted against the expected one. */
    const expectFocused = (
      label: string,
      testId: string,
    ): Effect.Effect<void, Smoke.SmokeAssertionError | Smoke.SmokeHostError> =>
      Effect.flatMap(focusedId(ctx), (id) =>
        ctx.expectEqual(label, id, testId),
      );

    yield* ctx.host.waitFor("tree-list");
    yield* Effect.sleep(SETTLE);

    // 1. Collapsed, the tree is its forty root directories — and only a window
    //    of those is painted.
    yield* ctx.expectEqual(
      "a collapsed tree paints one row per directory",
      yield* ctx.host.text("tree-readout"),
      "visible=40 expanded=0 selected=none range=none",
    );
    const atRest = yield* ctx.host.paintedText();
    yield* ctx.expectEqual(
      "the first directory is painted",
      Arr.contains(atRest, "dir 000"),
      true,
    );
    yield* ctx.expectEqual(
      "the last of forty is outside the painted window",
      Arr.contains(atRest, "dir 039"),
      false,
    );

    // 2. A press takes native focus, which is what every arrow needs.
    yield* ctx.host.click("tree-row-dir-000");
    yield* Effect.sleep(SETTLE);
    yield* expectFocused(
      "a press focuses the row it landed on",
      "tree-row-dir-000",
    );

    // 3. Right on a collapsed directory opens it in place: the focus stays on
    //    the directory while ninety-nine files join the flattened rows.
    yield* ctx.host.key("right");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "Right opens a collapsed directory",
      yield* ctx.host.text("tree-readout"),
      "visible=139 expanded=1 selected=dir-000",
    );
    yield* expectFocused(
      "opening a directory keeps the focus on it",
      "tree-row-dir-000",
    );

    // 4. A depth-1 row indents its label by one step.
    const openRows = visibleRows(["dir-000"]);
    const directoryRow = yield* ctx.expectSome(
      "the fixture has a directory row to measure",
      Arr.get(openRows, 0),
    );
    const fileRow = yield* ctx.expectSome(
      "the fixture has a child row to measure",
      Arr.get(openRows, 1),
    );
    const parent = yield* ctx.expectSome(
      "the directory's label painted",
      Option.fromNullishOr(yield* ctx.host.bounds(labelTestId(directoryRow))),
    );
    const child = yield* ctx.expectSome(
      "the child's label painted",
      Option.fromNullishOr(yield* ctx.host.bounds(labelTestId(fileRow))),
    );
    yield* ctx.expectNear(
      "a depth-1 label indents by one step",
      child.x - parent.x,
      TREE_INDENT,
      1,
    );

    // 5. A second Right enters the first child; Left returns to the parent.
    yield* ctx.host.key("right");
    yield* Effect.sleep(SETTLE);
    yield* expectFocused(
      "Right on an open directory enters its first child",
      "tree-row-file-dir-000/000",
    );
    yield* ctx.host.key("left");
    yield* Effect.sleep(SETTLE);
    yield* expectFocused(
      "Left from a child returns to its parent",
      "tree-row-dir-000",
    );

    // 6. Left on an open directory closes it; the rows below move back up.
    yield* ctx.host.key("left");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "Left closes an open directory",
      yield* ctx.host.text("tree-readout"),
      "visible=40 expanded=0",
    );

    // 7. Down and Up move the roving focus row by row.
    yield* ctx.host.key("down");
    yield* Effect.sleep(SETTLE);
    yield* expectFocused(
      "Down moves the focus to the next row",
      "tree-row-dir-001",
    );
    yield* ctx.host.key("up");
    yield* Effect.sleep(SETTLE);
    yield* expectFocused("Up moves the focus back", "tree-row-dir-000");

    // 8. A file is a leaf: Right neither opens nor moves.
    yield* ctx.host.click("tree-toggle-dir-000");
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.click("tree-row-file-dir-000/000");
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.key("right");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "Right on a file changes no row",
      yield* ctx.host.text("tree-readout"),
      "visible=139 expanded=1",
    );
    yield* expectFocused(
      "Right on a file keeps the focus on it",
      "tree-row-file-dir-000/000",
    );

    // 9. Expanded whole, the tree is 4 000 rows and still paints a window.
    yield* ctx.host.click("tree-expand-all");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "Expand all flattens every node",
      yield* ctx.host.text("tree-readout"),
      "visible=4000 expanded=40",
    );
    yield* ctx.host.capture("vtree-expanded");
    const expandedRows = yield* ctx.host.paintedText();
    const paintedCount = paintedTreeRows(expandedRows);
    yield* ctx.expectEqual(
      "a 4 000-row tree paints only its window",
      paintedCount > 0 && paintedCount < 40,
      true,
    );
    yield* ctx.expectEqual(
      "the last of 4 000 rows is not painted",
      Arr.contains(expandedRows, "file 039/098"),
      false,
    );

    // 10. Reveal by index: the path a file tree takes to a deep node, with no
    //     wheel at all. A pixel offset would be wrong while heights are
    //     estimates, so the renderer's own anchor is the evidence.
    const reportsBefore = yield* ctx.host.text("tree-reports");
    yield* ctx.host.scrollToItem("tree-list", TREE_REVEAL_INDEX);
    yield* Effect.sleep(Duration.millis(300));
    yield* ctx.host.capture("vtree-revealed");
    const revealed = yield* ctx.host.paintedText();
    yield* ctx.expectEqual(
      "the reveal paints the directory the index names",
      Arr.contains(revealed, "dir 030"),
      true,
    );
    yield* ctx.expectEqual(
      "the reveal leaves the top of the tree",
      Arr.contains(revealed, "dir 000"),
      false,
    );
    const anchor = yield* ctx.expectSome(
      "the renderer reports the list's logical anchor",
      Option.fromNullishOr(yield* ctx.host.listAnchor("tree-list")),
    );
    yield* ctx.expectNear(
      "the anchor is the row the reveal asked for",
      anchor.itemIndex,
      TREE_REVEAL_INDEX,
      1,
    );
    const frame = yield* ctx.expectSome(
      "the list's frame painted",
      Option.fromNullishOr(yield* ctx.host.bounds("tree-frame")),
    );
    yield* ctx.expectNear(
      "the anchor reports the list's own viewport",
      anchor.viewportHeight,
      frame.height - 2,
      1,
    );
    yield* ctx.expectEqual(
      "a plain container is not a virtual list",
      Option.isNone(
        Option.fromNullishOr(yield* ctx.host.listAnchor("tree-frame")),
      ),
      true,
    );
    yield* ctx.expectEqual(
      "a programmatic reveal fires no visible-range report",
      yield* ctx.host.text("tree-reports"),
      reportsBefore,
    );

    // 11. A revealed row is addressable and focusable like any other.
    yield* ctx.host.click("tree-row-dir-030");
    yield* Effect.sleep(SETTLE);
    yield* expectFocused(
      "the revealed row takes the focus",
      "tree-row-dir-030",
    );
  });

/**
 * Two opaque fills counted in the frame: the clipped card's and the portalled
 * card's. A paint report lists laid-out glyphs, a capture lists what a reader
 * sees, and only the capture can tell a clipped box from a painted one.
 */
const CLIPPED_FILL = "#FF00FF";
const CONTROL_FILL = "#00FFFF";
const PORTAL_FILL = "#00FF00";

/**
 * The context a portalled card reads back.
 *
 * A portal renders into another host element but stays in the caller's React
 * tree, so a theme, a locale or an app store has to survive the move.
 */
const PortalContext = createContext("no-context");

/** The card a detached tab or a dialog would move into its own layer. */
const PortalCard = ({
  onPress,
  typed,
  onType,
}: {
  readonly onPress: () => void;
  readonly typed: string;
  readonly onType: (value: string) => void;
}): ReactNode => {
  const theme = useTheme();
  const inherited = useContext(PortalContext);
  return (
    <div
      testId="portal-card"
      style={{
        position: "absolute",
        left: 20,
        top: 20,
        width: 240,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.xs,
        padding: theme.spacing.md,
        backgroundColor: PORTAL_FILL,
        borderWidth: theme.borderWidth.thin,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.sm,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "body"),
          color: theme.colors.foreground,
        }}
      >
        portalled card
      </text>
      <text
        testId="portal-context"
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        {`ctx=${inherited}`}
      </text>
      <div
        testId="portal-action"
        tabIndex={0}
        role="button"
        onClick={onPress}
        style={{
          padding: theme.spacing.xs,
          borderRadius: theme.radius.sm,
          backgroundColor: theme.colors.muted,
        }}
      >
        <text
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.foreground,
          }}
        >
          press inside the portal
        </text>
      </div>
      <input
        testId="portal-field"
        value={typed}
        placeholder="type inside the portal"
        onChange={(event) => onType(event.value ?? "")}
        style={{
          color: theme.colors.inputForeground,
          backgroundColor: theme.colors.input,
          padding: theme.spacing.xs,
          borderRadius: theme.radius.sm,
        }}
      />
    </div>
  );
};

/**
 * `createPortal` in a window: the published escape hatch an overlay or a
 * detached tab needs when its own ancestor clips.
 *
 * The probe puts one card beyond a clipped box's edge (laid out, not painted)
 * and the same card through a portal into a sibling layer (painted), then
 * measures context, pointer input and keys across the portal boundary.
 */
const PortalProbe = (): ReactNode => {
  const theme = useTheme();
  const [layer, setLayer] = useState<PublicInstance | null>(null);
  const [attached, setAttached] = useState(true);
  const [presses, setPresses] = useState(0);
  const [typed, setTyped] = useState("");

  return (
    <PortalContext.Provider value="portal-context">
      <div
        testId="portal-probe"
        style={{
          position: "relative",
          width: 720,
          height: 440,
          padding: theme.spacing.xl,
          backgroundColor: theme.colors.background,
        }}
      >
        <div
          testId="portal-clip"
          style={{
            position: "relative",
            width: 200,
            height: 100,
            overflow: "hidden",
            backgroundColor: theme.colors.card,
          }}
        >
          <div
            testId="portal-clipped"
            style={{
              position: "absolute",
              left: 240,
              top: 20,
              width: 200,
              padding: theme.spacing.sm,
              backgroundColor: CLIPPED_FILL,
            }}
          >
            <text
              style={{
                ...textStyle(theme, "body"),
                color: theme.colors.foreground,
              }}
            >
              clipped away
            </text>
          </div>
        </div>
        <div
          testId="portal-unclipped"
          style={{
            position: "absolute",
            left: 20,
            top: 280,
            width: 200,
            padding: theme.spacing.sm,
            backgroundColor: CONTROL_FILL,
          }}
        >
          <text
            style={{
              ...textStyle(theme, "body"),
              color: theme.colors.foreground,
            }}
          >
            unclipped card
          </text>
        </div>
        <div
          testId="portal-layer"
          ref={setLayer}
          style={{
            position: "absolute",
            left: 420,
            top: 150,
            width: 280,
            height: 160,
            backgroundColor: theme.colors.card,
            borderWidth: theme.borderWidth.thin,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.md,
          }}
        />
        {layer === null
          ? null
          : attached
            ? createPortal(
                <PortalCard
                  onPress={() => setPresses((count) => count + 1)}
                  typed={typed}
                  onType={setTyped}
                />,
                layer,
              )
            : null}
        <div style={{ position: "absolute", left: 20, top: 130 }}>
          <PrimitiveThemeProvider theme={palettes.dark}>
            <Button
              testId="portal-toggle"
              size="sm"
              variant="secondary"
              onActivate={() => setAttached((current) => !current)}
            >
              {attached ? "Detach" : "Attach"}
            </Button>
          </PrimitiveThemeProvider>
        </div>
        <div style={{ position: "absolute", left: 20, top: 190 }}>
          <Readout testId="portal-readout">
            {`attached=${attached} presses=${presses} typed=${typed}`}
          </Readout>
        </div>
      </div>
    </PortalContext.Provider>
  );
};

const portalSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("portal-card");
    yield* Effect.sleep(SETTLE);

    // 1. The clipped ancestor lays the sibling out and paints none of it; the
    //    same content through the portal paints — the whole reason a detached
    //    tab or an overlay moves into its own layer.
    const clip = yield* ctx.expectSome(
      "the clipping box painted",
      Option.fromNullishOr(yield* ctx.host.bounds("portal-clip")),
    );
    const clipped = yield* ctx.expectSome(
      "the clipped sibling still has a box",
      Option.fromNullishOr(yield* ctx.host.bounds("portal-clipped")),
    );
    yield* ctx.expectEqual(
      "the clipped sibling sits outside the box that clips it",
      clipped.x > clip.x + clip.width,
      true,
    );
    const clippedFill = yield* ctx.expectSome(
      "the clipped fill parses",
      Option.fromNullishOr(Pixels.hexToRgba(CLIPPED_FILL)),
    );
    const portalFill = yield* ctx.expectSome(
      "the portal fill parses",
      Option.fromNullishOr(Pixels.hexToRgba(PORTAL_FILL)),
    );
    const controlFill = yield* ctx.expectSome(
      "the control fill parses",
      Option.fromNullishOr(Pixels.hexToRgba(CONTROL_FILL)),
    );
    yield* ctx.host.capture("portal-attached");
    yield* ctx.expectEqual(
      "the same box paints when nothing clips it",
      (yield* paintedPixels(ctx, "portal-attached", controlFill)) > 0,
      true,
    );
    yield* ctx.expectEqual(
      "the clipped sibling paints no pixel",
      yield* paintedPixels(ctx, "portal-attached", clippedFill),
      0,
    );
    yield* ctx.expectEqual(
      "the portalled card paints its own fill",
      (yield* paintedPixels(ctx, "portal-attached", portalFill)) > 0,
      true,
    );
    yield* ctx.expectEqual(
      "the portalled card paints its text",
      Arr.contains(yield* ctx.host.paintedText(), "portalled card"),
      true,
    );

    // 2. It paints where its target is, not where the caller is.
    const layer = yield* ctx.expectSome(
      "the portal target painted",
      Option.fromNullishOr(yield* ctx.host.bounds("portal-layer")),
    );
    const card = yield* ctx.expectSome(
      "the portalled card painted",
      Option.fromNullishOr(yield* ctx.host.bounds("portal-card")),
    );
    yield* ctx.expectEqual(
      "the card paints inside its target's box",
      card.x >= layer.x && card.y >= layer.y,
      true,
    );

    // 3. The portal keeps the caller's React context across the host boundary.
    yield* ctx.expectEqual(
      "the portalled card reads the caller's context",
      yield* ctx.host.text("portal-context"),
      "ctx=portal-context",
    );

    // 4. Pointer input reaches portalled content.
    yield* ctx.host.click("portal-action");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "a press reaches a control inside the portal",
      yield* ctx.host.text("portal-readout"),
      "presses=1",
    );

    // 5. So do native focus and keys: the field is not in the caller's subtree.
    yield* ctx.host.click("portal-field");
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.key("h");
    yield* ctx.host.key("i");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "keys reach a field inside the portal",
      yield* ctx.host.text("portal-readout"),
      "typed=hi",
    );

    // 6. Removing the portal unpaints it and drops it from the tree.
    yield* ctx.host.capture("portal-attached");
    yield* ctx.host.click("portal-toggle");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "detaching unpaints the card",
      Option.isNone(
        Option.fromNullishOr(yield* ctx.host.bounds("portal-card")),
      ),
      true,
    );
    yield* ctx.expectEqual(
      "detaching removes its text",
      Arr.contains(yield* ctx.host.paintedText(), "portalled card"),
      false,
    );

    // 7. And it can be attached again: a tab moved out and back.
    yield* ctx.host.click("portal-toggle");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "reattaching paints the card again",
      Arr.contains(yield* ctx.host.paintedText(), "portalled card"),
      true,
    );
    yield* ctx.host.capture("portal-reattached");
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
  "filled-action-dim": {
    id: "filled-action-dim",
    view: () => <FilledActionDimProbe />,
    steps: filledActionDimSteps,
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
  "tabs-lifecycle": {
    id: "tabs-lifecycle",
    view: () => <TabsProbe />,
    steps: tabsSteps,
  },
  "slider-lifecycle": {
    id: "slider-lifecycle",
    view: () => <SliderProbe />,
    steps: sliderSteps,
  },
  "tooltip-lifecycle": {
    id: "tooltip-lifecycle",
    view: () => <TooltipProbe />,
    steps: tooltipSteps,
  },
  "drag-between-panes": {
    id: "drag-between-panes",
    view: () => <DragProbe />,
    steps: dragSteps,
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
  "context-menu-lifecycle": {
    id: "context-menu-lifecycle",
    view: () => <ContextMenuProbe />,
    steps: contextMenuSteps,
  },
  "motion-geometry": {
    id: "motion-geometry",
    view: () => <MotionProbe />,
    steps: motionSteps,
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
  "scroll-lifecycle": {
    id: "scroll-lifecycle",
    view: () => <ScrollProbe />,
    steps: scrollSteps,
  },
  "split-pane-lifecycle": {
    id: "split-pane-lifecycle",
    view: () => <SplitPaneProbe />,
    steps: splitSteps,
  },
  "virtual-list-lifecycle": {
    id: "virtual-list-lifecycle",
    view: () => <VirtualListProbe />,
    steps: virtualListSteps,
  },
  "window-shortcut-lifecycle": {
    id: "window-shortcut-lifecycle",
    view: () => <WindowKeyProbe />,
    steps: windowKeySteps,
  },
  "pointer-capture": {
    id: "pointer-capture",
    view: () => <PointerCaptureProbe />,
    steps: pointerCaptureSteps,
  },
  "clipboard-lifecycle": {
    id: "clipboard-lifecycle",
    view: () => <ClipboardProbe />,
    steps: clipboardSteps,
  },
  "select-lifecycle": {
    id: "select-lifecycle",
    view: () => <SelectProbe />,
    steps: selectSteps,
  },
  "selection-lifecycle": {
    id: "selection-lifecycle",
    view: () => <SelectionProbe />,
    steps: selectionSteps,
  },
  "virtual-tree-lifecycle": {
    id: "virtual-tree-lifecycle",
    view: () => <VirtualTreeProbe />,
    steps: virtualTreeSteps,
  },
  "portal-layer": {
    id: "portal-layer",
    view: () => <PortalProbe />,
    steps: portalSteps,
  },
};
