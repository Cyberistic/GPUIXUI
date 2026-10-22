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
import { Duration, Effect, Match, pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import * as Str from "effect/String";
import {
  extendTheme,
  keyboardFocusRing,
  textStyle,
  type FontSource,
  type Theme,
} from "@gpuixui/tokens";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxList,
  ComboboxTrigger,
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
  List,
  ListItem,
  ListItemTitle,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  MessageScroller,
  MessageScrollerItem,
  MessageScrollerJumpToLatest,
  MessageScrollerViewport,
  MotionProvider,
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
import {
  createPortal,
  flushSync,
  useGpuix,
  useWindowInsets,
  useWindowSize,
  motion,
} from "@gpuix/react";
import type {
  ImgInstance,
  NativeWindowInsets,
  PublicInstance,
} from "@gpuix/react";
import type { EventPayload } from "@gpuix/native";
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
import { Pressable, Readout, Toolbar } from "../ui.js";
import { useWindowKey } from "../window-key.js";
import { useWindowFacts } from "./window-facts.js";
import type { LiveProbeId } from "./registry.js";
import {
  BAR_HEIGHT,
  CHROME_FILL,
  SAFE_BAR_X,
  SAFE_FILL,
  TitlebarChrome,
  barPoint,
  insetBarPoint,
  decodeEdges,
  formatEdges,
  type Edges,
} from "./chrome.js";
import {
  BAR_PIXEL,
  MARGIN_PIXEL,
  PLOT,
  PLOT_BACKING,
  PLOT_SIZE,
  PLOT_SVG,
  REPLACEMENT,
  SERIES,
  VECTOR,
  plotPixels,
  pointIn,
  type Box,
} from "./chart.js";
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
  BACKDROP_BOX,
  BACKDROP_FILL,
  BACKDROP_FILL_RGBA,
  backdropPoint,
  contentPoint,
  decodeWindowBackground,
  surfaceAlpha,
} from "./backdrop.js";
import { captureScale, describeColour, framePoint } from "./frame.js";
import {
  FADE_BACKING,
  FADE_BACKING_RGBA,
  FADE_CAPTURE_ATTEMPTS,
  FADE_PARTIAL_MS,
  FADE_REST_MS,
  fadeSample,
  isBacking,
  isFading,
  isSurface,
  surfaceFadeColour,
  type FadeBox,
} from "./fade.js";
import { moveRow, rowAt, type RowHandle } from "./reorder.js";
import { settleNumber, settleUntil } from "./settle.js";
import {
  EDGE_HEIGHT,
  MESSAGE_ROWS,
  MESSAGE_TOP,
  NEWER_FIRST,
  OLDER_FIRST,
  PAGE_ROWS,
  READER_TOP,
  ROW_HEIGHT,
  VIEWPORT_HEIGHT,
  VOID_TOP,
  loadingRowRestore,
  messageIds,
  pageFirstId,
  voidRow,
  type PageDirection,
} from "./loading-row.js";
import {
  FILLER_ROWS,
  FILLER_ROW_HEIGHT,
  INNER_MAX,
  INNER_ROW_HEIGHT,
  INNER_ROWS,
  INNER_STEP,
  INNER_VIEWPORT,
  PANE_FILLER_HEIGHT,
  PANE_FILLER_ROWS,
  PANE_VIEWPORT,
  PANE_ROWS,
  PANE_ROW_HEIGHT,
  PANE_PAGE_VIEWPORT,
  OUTER_ONLY_ROW,
  OUTER_MAX,
  OUTER_VIEWPORT,
} from "./nested-scroll.js";
import { REVIEWERS } from "./combobox.js";
import { listAnchorOf } from "./host.js";
import { LIST_ROWS, TYPEAHEAD_LETTER, type ListRow } from "./list.js";
import {
  TRANSCRIPT_PAGE_ROWS,
  TRANSCRIPT_ROW_HEIGHT,
  TRANSCRIPT_START_ROWS,
  TRANSCRIPT_TAIL_HEIGHT,
  TRANSCRIPT_THRESHOLD,
  TRANSCRIPT_VIEWPORT_HEIGHT,
  scrollRange,
} from "./message-scroller.js";
import {
  TABLE_HEIGHT,
  TABLE_HEADER_HEIGHT,
  TABLE_ROWS,
  TABLE_ROW_HEIGHT,
  TABLE_SORT,
  TABLE_WIDTH,
  TABLE_Y_RANGE,
  COLUMN_WIDTH,
  sortLabel,
  sortTable,
  toggleSort,
  type TableRow,
  type TableSort,
} from "./table.js";
import {
  HEADER_COLUMNS,
  HEADER_FIRST_ITEM,
  HEADER_FRAME,
  HEADER_FRAME_WIDTH,
  HEADER_TRIGGER,
  HEADER_TRIGGER_AFTER,
  HEADER_TRIGGER_CELL,
  HEADER_TRIGGER_WIDTH,
  headerCellId,
  headerContentWidth,
  toggleHidden,
  type HeaderColumn,
} from "./header-menu.js";
import {
  DOCK_GUARDED_ACTION,
  DOCK_SIDEBAR_WIDTH,
  DOCK_STATUS,
  DOCK_TABS,
  DOCK_TOGGLE,
  dockActionId,
  dockFieldId,
  dockPaneId,
  dockRailId,
  dockStops,
  stepTab,
  type DockTab,
} from "./dock-focus.js";
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

/** The rows `drag-reorder` moves, in their declared order. */
const REORDER_ROWS = ["alpha", "bravo", "charlie", "delta"] as const;

/** One row's height, so a probe can aim at a row it read a box from. */
const REORDER_ROW_HEIGHT = 44;

/** What `drag-reorder`'s readout prints; one flat shape keeps a failure readable. */
interface ReorderReadout {
  readonly from: Option.Option<string>;
  readonly over: Option.Option<string>;
  readonly drops: number;
  readonly misses: number;
  readonly heard: number;
  readonly moves: number;
  readonly top: string;
}

const REORDER_START: ReorderReadout = {
  from: Option.none(),
  over: Option.none(),
  drops: 0,
  misses: 0,
  heard: 0,
  moves: 0,
  top: "none",
};

/** A row name, or `"none"`, so the readout reads the same either way. */
const nameOf = (value: Option.Option<string>): string =>
  Option.getOrElse(value, () => "none");

/**
 * What the topmost hit belongs to: a row of this list, another element, nothing.
 *
 * The distinction is the reason the drop rule looks past the first id: the
 * pointer is often over a painted child (a row's `<text>` label), which reads
 * `other` while the row beneath it is the target.
 */
const topOf = (
  hits: ReadonlyArray<number>,
  handles: ReadonlyArray<RowHandle<string>>,
): string =>
  Option.match(Arr.head(hits), {
    onNone: () => "none",
    onSome: (hit) =>
      Arr.some(handles, (handle) => handle.id === hit) ? "own" : "other",
  });

/**
 * One row in the reorder list: a press starts the drag, a move hit-tests the
 * pointer, and a release on the dragged row resolves the drop.
 *
 * The row registers its own native id — and nothing else: the hit test reports
 * its `<text>` label first, because a painted child sits above its parent, so
 * the drop rule has to walk past ids that are not the row.
 */
const ReorderRow = ({
  name,
  register,
  press,
  move,
  release,
}: {
  readonly name: string;
  readonly register: (handle: RowHandle<string>) => void;
  readonly press: (row: string) => void;
  readonly move: (event: EventPayload) => void;
  readonly release: (row: string) => void;
}): ReactNode => {
  const theme = useTheme();
  const bind = useCallback(
    (instance: PublicInstance | null) => {
      if (instance) register({ id: instance.id, row: name });
    },
    [name, register],
  );
  return (
    <div
      testId={`row-${name}`}
      ref={bind}
      onMouseDown={() => press(name)}
      onMouseMove={move}
      onMouseUp={() => release(name)}
      style={{
        height: REORDER_ROW_HEIGHT,
        flexDirection: "row",
        alignItems: "center",
        paddingLeft: theme.spacing.md,
        borderRadius: theme.radius.sm,
        backgroundColor: theme.colors.card,
      }}
    >
      <text
        testId={`row-${name}-label`}
        style={{ ...textStyle(theme, "body"), color: theme.colors.foreground }}
      >
        {name}
      </text>
    </div>
  );
};

/**
 * A reorderable list whose rows capture the pointer, the other half of
 * `drag-between-panes`.
 *
 * A row that wants the travel after it leaves its box listens to `mouseDown`
 * and `mouseMove`, which makes the runtime capture the pointer: every move and
 * the release stay on the dragged row, so the row under the pointer hears
 * nothing. The drop is therefore resolved by the runtime's hit test
 * (`renderer.getElementsAt`) against the ids the rows registered from their
 * refs — the composition a tier-3 reorder, a file tree or a tab strip needs.
 */
const DragReorderProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const renderer = useGpuix().renderer;
  const [order, setOrder] = useState<ReadonlyArray<string>>(REORDER_ROWS);
  const [readout, setReadout] = useState(REORDER_START);
  const handles = useRef<ReadonlyArray<RowHandle<string>>>([]);
  const pressed = useRef<Option.Option<string>>(Option.none());
  const over = useRef<Option.Option<string>>(Option.none());

  const register = useCallback((handle: RowHandle<string>) => {
    handles.current = [
      ...Arr.filter(handles.current, (current) => current.id !== handle.id),
      handle,
    ];
  }, []);

  const press = useCallback((row: string) => {
    pressed.current = Option.some(row);
  }, []);

  const move = useCallback(
    (event: EventPayload) => {
      if (Option.isNone(pressed.current)) return;
      const hits = renderer?.getElementsAt?.(event.x ?? 0, event.y ?? 0) ?? [];
      const target = rowAt(hits, handles.current);
      over.current = target;
      setReadout((current) => ({
        ...current,
        over: target,
        moves: current.moves + 1,
        top: topOf(hits, handles.current),
      }));
    },
    [renderer],
  );

  const release = useCallback((row: string) => {
    const started = pressed.current;
    pressed.current = Option.none();
    if (Option.isNone(started)) return;
    // Another row heard a release while this list was being dragged: the
    // pointer was not captured, which is the runtime fact the probe reports.
    if (!Option.exists(started, (name) => name === row)) {
      setReadout((current) => ({ ...current, heard: current.heard + 1 }));
      return;
    }
    const target = over.current;
    over.current = Option.none();
    setReadout((current) => ({
      ...current,
      from: started,
      over: target,
      drops: Option.isSome(target) ? current.drops + 1 : current.drops,
      misses: Option.isNone(target) ? current.misses + 1 : current.misses,
    }));
    Option.match(target, {
      onNone: () => {},
      onSome: (name) =>
        setOrder((current) =>
          Option.match(
            Option.all([
              Arr.findFirstIndex(current, (candidate) => candidate === row),
              Arr.findFirstIndex(current, (candidate) => candidate === name),
            ]),
            {
              onNone: () => current,
              onSome: ([from, to]) => moveRow(current, from, to),
            },
          ),
        ),
    });
  }, []);

  return (
    <div
      testId="reorder-probe"
      style={{
        width: window.width,
        height: window.height,
        padding: theme.spacing.xl,
        display: "flex",
        flexDirection: "column",
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
        Drag a row onto another: the dragged row keeps the pointer, so the drop
        is resolved by the runtime's hit test.
      </text>
      <div
        testId="reorder-list"
        style={{ width: 280, display: "flex", flexDirection: "column", gap: 6 }}
      >
        {order.map((name) => (
          <ReorderRow
            key={name}
            name={name}
            register={register}
            press={press}
            move={move}
            release={release}
          />
        ))}
      </div>
      <text
        testId="reorder-readout"
        style={{ ...textStyle(theme, "body"), color: theme.colors.foreground }}
      >
        {`order=${order.join(",")} from=${nameOf(readout.from)} over=${nameOf(
          readout.over,
        )} drops=${readout.drops} misses=${readout.misses} heard=${
          readout.heard
        } moves=${readout.moves} top=${readout.top}`}
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
 * The shipped `Dialog` over a white page: the entry fade the presence seam
 * paints, as paint rather than bounds.
 *
 * A window reports no style, so a surface's opacity is only provable from the
 * pixel it paints on the way in. The probe reads one point inside the content's
 * own padding (where nothing but the surface is painted) partway through the
 * entry tween and again past it, and the reduce control swaps the motion
 * preference so the same probe measures the journey the timing removes.
 */
const SurfaceFadeProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const [preference, setPreference] = useState<"animated" | "reduced">(
    "animated",
  );
  const [opens, setOpens] = useState(0);
  const [closes, setCloses] = useState(0);
  return (
    <div
      testId="fade-probe"
      style={{
        width: window.width,
        height: window.height,
        position: "relative",
        backgroundColor: FADE_BACKING,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: theme.spacing.lg,
          top: theme.spacing.lg,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: theme.spacing.sm,
        }}
      >
        <Pressable
          testId="fade-reduce"
          onClick={() => setPreference("reduced")}
        >
          <text
            style={{
              ...textStyle(theme, "body"),
              color: theme.colors.foreground,
            }}
          >
            Reduce motion
          </text>
        </Pressable>
        <MotionProvider preference={preference}>
          <Dialog
            onOpenChange={(open) => {
              if (open) setOpens((count) => count + 1);
              else setCloses((count) => count + 1);
            }}
          >
            <DialogTrigger testId="fade-trigger">Open dialog</DialogTrigger>
            <DialogContent label="Fade in" testId="fade-surface">
              <DialogHeader>
                <DialogTitle>Fade in</DialogTitle>
                <DialogDescription>
                  The surface enters on its own opacity, not on a cut.
                </DialogDescription>
              </DialogHeader>
              {/* Room for the surface to be read below the copy: the sampled
                  point is in the left padding, and a taller box keeps the
                  centre clear of the children's edges. */}
              <div style={{ height: 180 }} />
            </DialogContent>
          </Dialog>
        </MotionProvider>
        <Readout testId="fade-readout">
          {`opens=${opens} closes=${closes} preference=${preference}`}
        </Readout>
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
          The shipped Tooltip: a hover or a Tab traversal's focus opens it, and
          leaving or Escape closes it.
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
    /** Whether `testId` is absent from the window's tree, once it settles. */
    const unpainted = (
      testId: string,
    ): Effect.Effect<boolean, Smoke.SmokeHostError> => settleGone(ctx, testId);

    yield* ctx.host.waitFor("popover-trigger");

    // The default placement: below the trigger, on its start edge, one gap down.
    yield* ctx.host.click("popover-trigger");
    yield* Effect.sleep(SETTLE);
    const trigger = yield* paintedBox(ctx, "popover-trigger");
    const panel = yield* paintedBox(ctx, "popover-panel");
    // The panel enters with a few pixels of travel on its entry axis, so the
    // gap is read at rest: a mid-tween read reported `0.5` for `6`.
    const panelY = yield* settleNumber(boxAxis("y")(ctx, "popover-panel"));
    yield* ctx.expectEqual(
      "the panel opens below its trigger",
      panelY >= trigger.y + trigger.height,
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
      panelY - (trigger.y + trigger.height),
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
      yield* settlePainted(ctx, "popover-panel"),
      true,
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

/**
 * Waits until `testId` stops painting, and reports whether it did.
 *
 * A dismissal is a transition, not an instant: the shipped surfaces stay mounted
 * for their exit tween, so `bounds` still answers for a few hundred milliseconds
 * after Escape. Polling the settled state keeps the check about the dismissal
 * rather than about the tween's duration.
 */
const settleGone = (
  ctx: Smoke.AsyncSmokeContext,
  testId: string,
): Effect.Effect<boolean, Smoke.SmokeHostError> =>
  settleUntil(
    Effect.map(ctx.host.bounds(testId), (bounds) =>
      Option.isNone(Option.fromNullishOr(bounds)),
    ),
    (gone) => gone,
  );

/**
 * Waits until `testId` paints, and reports whether it did.
 *
 * The mirror of {@link settleGone} for a check that expects a surface to
 * survive its input: polling for the painted state stops as soon as the frame
 * arrives, where polling for its absence spends the whole budget on a surface
 * that is doing exactly what it should.
 */
const settlePainted = (
  ctx: Smoke.AsyncSmokeContext,
  testId: string,
): Effect.Effect<boolean, Smoke.SmokeHostError> =>
  settleUntil(
    Effect.map(ctx.host.bounds(testId), (bounds) =>
      Option.isSome(Option.fromNullishOr(bounds)),
    ),
    (painted) => painted,
  );

/** The painted `x` or `y` of `testId`; `NaN` while it paints nothing. */
const boxAxis =
  (field: "x" | "y") =>
  (
    ctx: Smoke.AsyncSmokeContext,
    testId: string,
  ): Effect.Effect<number, Smoke.SmokeHostError> =>
    Effect.map(ctx.host.bounds(testId), (bounds) =>
      Option.match(Option.fromNullishOr(bounds), {
        onNone: () => Number.NaN,
        onSome: (box) => box[field],
      }),
    );

/**
 * The painted box of `testId` once it paints, failing by name if it never does.
 *
 * A surface mounts before its entry tween paints it, so a box read on the frame
 * after the press can miss a surface that is arriving.
 */
const settledBox = (
  ctx: Smoke.AsyncSmokeContext,
  testId: string,
): Effect.Effect<
  Smoke.Bounds,
  Smoke.SmokeAssertionError | Smoke.SmokeHostError
> =>
  Effect.gen(function* () {
    yield* settlePainted(ctx, testId);
    return yield* paintedBox(ctx, testId);
  });

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
    yield* Effect.sleep(Duration.millis(150));
    yield* ctx.expectEqual(
      "Tab stops on the selected trigger",
      yield* focusedId(ctx),
      "tabs-overview",
    );
    // Re-measured 2026-10-22: a window's `Tab` traversal **does** deliver React's
    // `onFocus` at HEAD, so the trigger's counter is 1. The earlier probe read
    // the frame before the event arrived and recorded 0; the component's
    // key-origin anchor still matters, because it is what makes the first arrow
    // move off the traversal's tab rather than re-anchor on the selection.
    yield* ctx.expectEqual(
      "a traversal delivers onFocus to the trigger",
      yield* ctx.host.text("tabs-focus-readout"),
      "focuses=1",
    );
    yield* ctx.host.key("right");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the first arrow moves off the traversal's tab",
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
    // The pill slides to the selected trigger's start edge; read it at rest.
    const secondX = yield* settleNumber(boxAxis("x")(ctx, "tabs-indicator"));
    yield* ctx.expectNear(
      "the pill follows the selected trigger",
      secondX,
      reports.x,
      2,
    );
    yield* ctx.expectEqual(
      "the pill moved with the selection",
      secondX === first.x,
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
    const pressedX = yield* settleNumber(boxAxis("x")(ctx, "tabs-indicator"));
    yield* ctx.expectNear(
      "the pill follows a pressed trigger",
      pressedX,
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
 * Drags a row onto another and reads back the order, the pointer's target and
 * which channel resolved it.
 *
 * What it measures: the dragged row keeps every move and the release (the list's
 * other rows never hear it), the row under the pointer comes from
 * `renderer.getElementsAt` matched against the rows' own ids, and the painted
 * order follows with the moved row in the drop row's slot. A release that never
 * left its own row reorders nothing, and a release over no row is a miss rather
 * than a drop on the nearest one.
 */
const dragReorderSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("reorder-readout");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the list starts in its declared order",
      yield* ctx.host.text("reorder-readout"),
      "order=alpha,bravo,charlie,delta from=none over=none drops=0 misses=0 heard=0 moves=0 top=none",
    );

    const first = yield* paintedBox(ctx, "row-alpha");
    const delta = yield* paintedBox(ctx, "row-delta");
    const last = yield* paintedBox(ctx, "row-delta-label");
    yield* ctx.host.drag(
      "row-alpha",
      last.x + last.width / 2 - (first.x + first.width / 2),
      last.y + last.height / 2 - (first.y + first.height / 2),
    );
    yield* Effect.sleep(SETTLE);
    const dropped = yield* ctx.host.text("reorder-readout");
    yield* ctx.expectContains(
      "the dragged row takes the dropped-on row's slot",
      dropped,
      "order=bravo,charlie,delta,alpha",
    );
    yield* ctx.expectContains(
      "the readout names the dragged row",
      dropped,
      "from=alpha",
    );
    yield* ctx.expectContains(
      "the hit test names the row under the pointer",
      dropped,
      "over=delta",
    );
    yield* ctx.expectContains("the drag resolved one drop", dropped, "drops=1");
    yield* ctx.expectContains(
      "no other row heard the release",
      dropped,
      "heard=0",
    );
    yield* ctx.expectEqual(
      "the dragged row received the travel",
      Str.includes("moves=0")(dropped),
      false,
    );
    yield* ctx.expectContains(
      "the pointer is over the row's painted label, not the row",
      dropped,
      "top=other",
    );

    const moved = yield* paintedBox(ctx, "row-alpha");
    yield* ctx.expectNear(
      "the dragged row paints where the drop row was",
      moved.y,
      delta.y,
      1,
    );
    const closed = yield* paintedBox(ctx, "row-bravo");
    yield* ctx.expectNear(
      "the row that was first closes the gap",
      closed.y,
      first.y,
      1,
    );
    yield* ctx.host.capture("drag-reorder");

    // A release that never left its own row is not a reorder.
    yield* ctx.host.drag("row-bravo", 0, 4);
    yield* Effect.sleep(SETTLE);
    const jittered = yield* ctx.host.text("reorder-readout");
    yield* ctx.expectContains(
      "a jitter inside the row keeps the order",
      jittered,
      "order=bravo,charlie,delta,alpha",
    );
    yield* ctx.expectContains(
      "it resolves the row it never left",
      jittered,
      "over=bravo",
    );
    yield* ctx.expectContains(
      "the second drop is counted",
      jittered,
      "drops=2",
    );

    // The hit test decides, not the distance travelled.
    yield* ctx.host.drag("row-alpha", 420, 0);
    yield* Effect.sleep(SETTLE);
    const missed = yield* ctx.host.text("reorder-readout");
    yield* ctx.expectContains(
      "a release outside the list names no row",
      missed,
      "over=none",
    );
    yield* ctx.expectContains(
      "a missed drop leaves the order alone",
      missed,
      "order=bravo,charlie,delta,alpha",
    );
    yield* ctx.expectContains("the miss is counted", missed, "misses=1");
    yield* ctx.expectContains(
      "the missed release is not a drop",
      missed,
      "drops=2",
    );
  });

/** One transcript row, sized so the probe can predict the content height. */
const TranscriptRow = ({
  testId,
  children,
}: {
  readonly testId: string;
  readonly children: ReactNode;
}): ReactNode => {
  const theme = useTheme();
  return (
    <MessageScrollerItem
      testId={testId}
      style={{ height: TRANSCRIPT_ROW_HEIGHT, paddingBottom: 0 }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.foreground,
        }}
      >
        {children}
      </text>
    </MessageScrollerItem>
  );
};

/**
 * The input proof: a plain scroller that follows the tail on every render.
 *
 * The real scroller must leave an unpinned reader's offset alone, and "the
 * offset did not move" is also what a probe reads when its append control is
 * dead. This control appends the same page through the same verbs and always
 * follows, so its offset *does* move — proving the wheel and the append reached
 * a scroller before the real transcript's unchanged offset is believed.
 */
const FollowingControl = ({ count }: { readonly count: number }): ReactNode => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const tail = useRef<PublicInstance | null>(null);

  useLayoutEffect(() => {
    const instance = tail.current;
    if (instance !== null && renderer?.scrollIntoView !== undefined) {
      renderer.scrollIntoView(instance.id);
    }
  });

  return (
    <div
      testId="ms-control-viewport"
      style={{
        height: TRANSCRIPT_VIEWPORT_HEIGHT,
        overflowY: "scroll",
        flexDirection: "column",
        backgroundColor: theme.colors.background,
      }}
    >
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          testId={`ms-control-row-${index}`}
          style={{ height: TRANSCRIPT_ROW_HEIGHT, flexShrink: 0 }}
        >
          <text
            style={{
              ...textStyle(theme, "caption"),
              color: theme.colors.foreground,
            }}
          >
            {`control ${index}`}
          </text>
        </div>
      ))}
      <div
        ref={tail}
        style={{ height: TRANSCRIPT_TAIL_HEIGHT, flexShrink: 0 }}
      />
    </div>
  );
};

/**
 * `message-scroller-lifecycle` — the shipped `MessageScroller` in a real window.
 *
 * The component's rules are `TestRenderer` facts so far: a pinned transcript
 * follows an appended row with `scrollIntoView`, an unpinned one keeps the
 * reader's offset and counts what arrived, and the way back re-pins. The window
 * is where the two scroll channels meet React: `scrollIntoView` has to paint
 * synchronously, `onScroll` has to report the wheel before the rule folds it,
 * and the jump control has to repaint the viewport on the following frame.
 *
 * Two transcripts share the geometry. The real one measures the shipped rules;
 * the control (`FollowingControl`) is a plain scroller that always follows, so
 * the "the reader was not yanked" check has a measured non-zero delta beside it.
 */
const MessageScrollerProbe = (): ReactNode => {
  const theme = useTheme();
  const [count, setCount] = useState(TRANSCRIPT_START_ROWS);
  const [controlCount, setControlCount] = useState(TRANSCRIPT_START_ROWS);
  const [pinned, setPinned] = useState(true);
  const [changes, setChanges] = useState(0);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        gap: 8,
      }}
    >
      <text
        testId="ms-state"
        style={{
          ...textStyle(theme, "code"),
          color: theme.colors.mutedForeground,
        }}
      >
        {`pinned=${pinned} changes=${changes} rows=${count}`}
      </text>
      <div style={{ display: "flex", gap: 8 }}>
        <Pressable
          testId="ms-append"
          onClick={() => setCount((current) => current + TRANSCRIPT_PAGE_ROWS)}
        >
          Append two
        </Pressable>
        <Pressable
          testId="ms-append-control"
          onClick={() =>
            setControlCount((current) => current + TRANSCRIPT_PAGE_ROWS)
          }
        >
          Append to control
        </Pressable>
      </div>
      <div style={{ display: "flex", flexDirection: "row", gap: 16 }}>
        <div style={{ width: 420 }}>
          <MessageScroller
            label="Conversation"
            threshold={TRANSCRIPT_THRESHOLD}
            onPinnedChange={(next) => {
              setPinned(next);
              setChanges((current) => current + 1);
            }}
          >
            <MessageScrollerViewport
              testId="ms-viewport"
              style={{ height: TRANSCRIPT_VIEWPORT_HEIGHT }}
            >
              {Array.from({ length: count }, (_, index) => (
                <TranscriptRow key={index} testId={`ms-row-${index}`}>
                  {`message ${index}`}
                </TranscriptRow>
              ))}
            </MessageScrollerViewport>
            <MessageScrollerJumpToLatest testId="ms-jump" />
          </MessageScroller>
        </div>
        <div style={{ width: 420 }}>
          <FollowingControl count={controlCount} />
        </div>
      </div>
    </div>
  );
};

/** The offset `testId` holds, failing by name when the element is no scroller. */
const scrollY = (
  ctx: Smoke.AsyncSmokeContext,
  testId: string,
): Effect.Effect<number, Smoke.SmokeAssertionError | Smoke.SmokeHostError> =>
  Effect.gen(function* () {
    const offset = yield* ctx.expectSome(
      `${testId} is a scroller`,
      Option.fromNullishOr(yield* ctx.host.scrollOffset(testId)),
    );
    return offset.y;
  });

/** Whether `testId` painted at all. */
const paintedAt = (
  ctx: Smoke.AsyncSmokeContext,
  testId: string,
): Effect.Effect<boolean, Smoke.SmokeHostError> =>
  Effect.map(ctx.host.bounds(testId), (bounds) => bounds !== null);

/** Whether a row sits wholly inside the viewport's painted box. */
const rowInside = (
  ctx: Smoke.AsyncSmokeContext,
  row: string,
  viewport: string,
): Effect.Effect<boolean, Smoke.SmokeAssertionError | Smoke.SmokeHostError> =>
  Effect.gen(function* () {
    const box = yield* paintedBox(ctx, row);
    const frame = yield* paintedBox(ctx, viewport);
    return (
      box.y >= frame.y - 1 && box.y + box.height <= frame.y + frame.height + 1
    );
  });

const messageScrollerSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("ms-state");
    yield* Effect.sleep(SETTLE);

    // 1. A fresh transcript follows the end.
    yield* ctx.expectEqual(
      "a transcript starts pinned with nothing unseen",
      yield* ctx.host.text("ms-state"),
      `pinned=true changes=0 rows=${TRANSCRIPT_START_ROWS}`,
    );
    yield* ctx.expectNear(
      "the mount scrolls to the end of the transcript",
      yield* scrollY(ctx, "ms-viewport"),
      -scrollRange(TRANSCRIPT_START_ROWS),
      2,
    );
    yield* ctx.expectEqual(
      "the last message is inside the viewport",
      yield* rowInside(
        ctx,
        `ms-row-${TRANSCRIPT_START_ROWS - 1}`,
        "ms-viewport",
      ),
      true,
    );
    yield* ctx.expectEqual(
      "a pinned reader sees no jump control",
      yield* paintedAt(ctx, "ms-jump"),
      false,
    );
    yield* ctx.host.capture("message-scroller-end");

    // 2. An appended page is followed while pinned.
    yield* ctx.host.click("ms-append");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the append keeps the transcript pinned",
      yield* ctx.host.text("ms-state"),
      `pinned=true changes=0 rows=${TRANSCRIPT_START_ROWS + TRANSCRIPT_PAGE_ROWS}`,
    );
    yield* ctx.expectNear(
      "the pinned transcript follows the page by its own height",
      yield* scrollY(ctx, "ms-viewport"),
      -scrollRange(TRANSCRIPT_START_ROWS + TRANSCRIPT_PAGE_ROWS),
      2,
    );
    yield* ctx.expectEqual(
      "the appended message is inside the viewport",
      yield* rowInside(
        ctx,
        `ms-row-${TRANSCRIPT_START_ROWS + TRANSCRIPT_PAGE_ROWS - 1}`,
        "ms-viewport",
      ),
      true,
    );
    yield* ctx.host.capture("message-scroller-followed");

    // 3. Scrolling away unpins and offers the way back.
    yield* ctx.host.wheel("ms-viewport", 0, 400);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "scrolling up unpins the reader",
      yield* ctx.host.text("ms-state"),
      `pinned=false changes=1 rows=${TRANSCRIPT_START_ROWS + TRANSCRIPT_PAGE_ROWS}`,
    );
    yield* ctx.expectNear(
      "a wheel past the top clamps the offset at zero",
      yield* scrollY(ctx, "ms-viewport"),
      0,
      1,
    );
    yield* ctx.expectEqual(
      "an unpinned reader is offered the way back",
      yield* paintedAt(ctx, "ms-jump"),
      true,
    );
    yield* ctx.expectEqual(
      "nothing has arrived yet, so the control names no count",
      yield* ctx.host.text("ms-jump"),
      "Jump to latest",
    );
    yield* ctx.host.capture("message-scroller-unpinned");

    // 4. A page while unpinned is counted, not followed.
    const before = yield* scrollY(ctx, "ms-viewport");
    yield* ctx.host.click("ms-append");
    yield* Effect.sleep(SETTLE);
    const after = yield* scrollY(ctx, "ms-viewport");
    yield* ctx.expectEqual(
      "the unpinned transcript did not move",
      after,
      before,
    );
    yield* ctx.expectEqual(
      "the page did not pin the reader",
      yield* ctx.host.text("ms-state"),
      `pinned=false changes=1 rows=${TRANSCRIPT_START_ROWS + TRANSCRIPT_PAGE_ROWS * 2}`,
    );
    yield* ctx.expectEqual(
      "the control counts the two rows that arrived unseen",
      yield* ctx.host.text("ms-jump"),
      "2 new messages",
    );
    yield* ctx.expectEqual(
      "the arrived page waits below the viewport",
      yield* rowInside(
        ctx,
        `ms-row-${TRANSCRIPT_START_ROWS + TRANSCRIPT_PAGE_ROWS * 2 - 1}`,
        "ms-viewport",
      ),
      false,
    );
    yield* ctx.host.capture("message-scroller-unpinned-arrivals");

    // 5. The control proves the verbs above reach a scroller: it always
    //    follows, so the same page moves its offset back to its end.
    yield* ctx.host.wheel("ms-control-viewport", 0, 400);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectNear(
      "the control scroller starts at its top",
      yield* scrollY(ctx, "ms-control-viewport"),
      0,
      1,
    );
    yield* ctx.host.click("ms-append-control");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectNear(
      "a following control is yanked back to its end",
      yield* scrollY(ctx, "ms-control-viewport"),
      -scrollRange(TRANSCRIPT_START_ROWS + TRANSCRIPT_PAGE_ROWS),
      2,
    );

    // 6. Jumping returns to the newest row and clears the count.
    yield* ctx.host.click("ms-jump");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "jumping pins the reader again",
      yield* ctx.host.text("ms-state"),
      `pinned=true changes=2 rows=${TRANSCRIPT_START_ROWS + TRANSCRIPT_PAGE_ROWS * 2}`,
    );
    yield* ctx.expectNear(
      "jumping scrolls to the transcript's end",
      yield* scrollY(ctx, "ms-viewport"),
      -scrollRange(TRANSCRIPT_START_ROWS + TRANSCRIPT_PAGE_ROWS * 2),
      2,
    );
    yield* ctx.expectEqual(
      "the jump control leaves once the reader is back",
      yield* paintedAt(ctx, "ms-jump"),
      false,
    );
    yield* ctx.expectEqual(
      "the newest message is inside the viewport",
      yield* rowInside(
        ctx,
        `ms-row-${TRANSCRIPT_START_ROWS + TRANSCRIPT_PAGE_ROWS * 2 - 1}`,
        "ms-viewport",
      ),
      true,
    );
    yield* ctx.host.capture("message-scroller-jumped");

    // 7. A wheel back to the end re-pins without the control.
    yield* ctx.host.wheel("ms-viewport", 0, 400);
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.click("ms-append");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the second page is counted while the reader is away",
      yield* ctx.host.text("ms-jump"),
      "2 new messages",
    );
    yield* ctx.host.wheel("ms-viewport", 0, -10000);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a wheel to the end pins the reader",
      yield* ctx.host.text("ms-state"),
      `pinned=true changes=4 rows=${TRANSCRIPT_START_ROWS + TRANSCRIPT_PAGE_ROWS * 3}`,
    );
    yield* ctx.expectNear(
      "the wheel lands on the transcript's end",
      yield* scrollY(ctx, "ms-viewport"),
      -scrollRange(TRANSCRIPT_START_ROWS + TRANSCRIPT_PAGE_ROWS * 3),
      2,
    );
    yield* ctx.expectEqual(
      "the way back is gone once the end is visible",
      yield* paintedAt(ctx, "ms-jump"),
      false,
    );
    yield* ctx.host.capture("message-scroller-rerolled");
  });

/**
 * `combobox-lifecycle` — the shipped `Combobox` in a real window.
 *
 * The component wraps GPUix's headless combobox, so focus, the active row and
 * the keyboard are the runtime's; its 21 behaviour tests run in a
 * `TestRenderer`, where `renderer.focusElement` lands immediately. A window is
 * the only place that proves the popup takes the focus from a press, that a
 * typed query filters the painted rows, that a disabled row is skipped by the
 * arrow path, and that Escape/outside press close it without stealing the
 * focus back.
 */
const ComboboxProbe = (): ReactNode => {
  const theme = useTheme();
  const [value, setValue] = useState<string | null>(null);
  const [changes, setChanges] = useState(0);
  const [presses, setPresses] = useState(0);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: 420,
        gap: 8,
      }}
    >
      <text
        testId="cb-readout"
        style={{
          ...textStyle(theme, "code"),
          color: theme.colors.mutedForeground,
        }}
      >
        {`value=${value ?? "none"} changes=${changes} presses=${presses}`}
      </text>
      <div style={{ display: "flex", flexDirection: "row", gap: 16 }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: 420,
            gap: 8,
          }}
        >
          <Combobox
            options={REVIEWERS}
            onValueChange={(next) => {
              setValue(typeof next === "string" ? next : null);
              setChanges((current) => current + 1);
            }}
          >
            <ComboboxTrigger
              testId="cb-trigger"
              label="Assign reviewer"
              placeholder="Assign reviewer"
            />
            <ComboboxContent>
              <ComboboxInput />
              <ComboboxList />
              <ComboboxEmpty />
            </ComboboxContent>
          </Combobox>
        </div>
        <Pressable
          testId="cb-outside"
          onClick={() => setPresses((current) => current + 1)}
        >
          Outside control
        </Pressable>
      </div>
    </div>
  );
};

const comboboxSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("cb-trigger");
    yield* Effect.sleep(SETTLE);

    // 1. Closed at rest.
    yield* ctx.expectEqual(
      "the combobox starts closed with nothing chosen",
      yield* ctx.host.text("cb-readout"),
      "value=none changes=0 presses=0",
    );
    yield* ctx.expectEqual(
      "the trigger shows its placeholder",
      yield* ctx.host.text("cb-trigger"),
      "Assign reviewer",
    );
    yield* ctx.expectEqual(
      "a closed combobox paints no list",
      yield* paintedAt(ctx, "combobox-content"),
      false,
    );

    // 2. A press opens the list below the trigger and moves focus in.
    const trigger = yield* paintedBox(ctx, "cb-trigger");
    yield* ctx.host.click("cb-trigger");
    yield* Effect.sleep(SETTLE);
    const surface = yield* paintedBox(ctx, "combobox-content");
    yield* ctx.expectEqual(
      "the search field takes the focus when the list opens",
      yield* focusedId(ctx),
      "combobox-input",
    );
    yield* ctx.expectNear(
      "the list opens one gap below the trigger",
      surface.y,
      trigger.y + trigger.height + 4,
      2,
    );
    yield* ctx.expectNear(
      "the list starts on the trigger's edge",
      surface.x,
      trigger.x,
      2,
    );
    yield* Effect.sleep(Duration.millis(200));
    yield* ctx.expectEqual(
      "the first option paints while the query is empty",
      yield* paintedAt(ctx, "combobox-option-ada"),
      true,
    );
    yield* ctx.expectEqual(
      "the last option paints while the query is empty",
      yield* paintedAt(ctx, "combobox-option-margaret"),
      true,
    );
    yield* ctx.host.capture("combobox-open");

    // 3. Typing filters by the component's ranking.
    yield* ctx.host.key("g");
    yield* ctx.host.key("r");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "typing keeps the matching row",
      yield* paintedAt(ctx, "combobox-option-grace"),
      true,
    );
    yield* ctx.expectEqual(
      "typing drops the rows that do not match",
      Arr.every(
        yield* Effect.all(
          [
            paintedAt(ctx, "combobox-option-ada"),
            paintedAt(ctx, "combobox-option-alan"),
            paintedAt(ctx, "combobox-option-linus"),
            paintedAt(ctx, "combobox-option-margaret"),
          ],
          { concurrency: "unbounded" },
        ),
        (present) => !present,
      ),
      true,
    );
    yield* ctx.host.capture("combobox-filtered");

    // 4. Enter selects the highlighted match, closes and restores focus.
    yield* ctx.host.key("enter");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Enter selects the highlighted match",
      yield* ctx.host.text("cb-readout"),
      "value=grace changes=1 presses=0",
    );
    yield* ctx.expectEqual(
      "the trigger paints the chosen label",
      yield* ctx.host.text("cb-trigger"),
      "Grace Hopper",
    );
    yield* ctx.expectEqual(
      "choosing closes the list",
      yield* paintedAt(ctx, "combobox-content"),
      false,
    );
    yield* ctx.expectEqual(
      "choosing returns the focus to the trigger",
      yield* focusedId(ctx),
      "cb-trigger",
    );

    // 5. Arrows move the highlight and skip the disabled row.
    yield* ctx.host.click("cb-trigger");
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.key("down");
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.key("down");
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.key("down");
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.key("enter");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "three arrows skip the disabled row and Enter chooses the next",
      yield* ctx.host.text("cb-readout"),
      "value=linus changes=2 presses=0",
    );
    yield* ctx.host.capture("combobox-selected");

    // 6. A query that only matches a disabled row chooses nothing.
    yield* ctx.host.click("cb-trigger");
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.key("a");
    yield* ctx.host.key("l");
    yield* ctx.host.key("a");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the disabled row still paints",
      yield* paintedAt(ctx, "combobox-option-alan"),
      true,
    );
    yield* ctx.host.key("enter");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Enter cannot choose a disabled row",
      yield* ctx.host.text("cb-readout"),
      "value=linus changes=2 presses=0",
    );
    yield* ctx.expectEqual(
      "a refused choice leaves the list open",
      yield* paintedAt(ctx, "combobox-content"),
      true,
    );

    // 7. Escape closes and returns the focus; the value is untouched.
    yield* ctx.host.key("escape");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Escape closes the list",
      yield* paintedAt(ctx, "combobox-content"),
      false,
    );
    yield* ctx.expectEqual(
      "Escape returns the focus to the trigger",
      yield* focusedId(ctx),
      "cb-trigger",
    );
    yield* ctx.expectEqual(
      "Escape leaves the chosen value alone",
      yield* ctx.host.text("cb-readout"),
      "value=linus changes=2 presses=0",
    );

    // 8. The empty state, and an outside press that dismisses without focus.
    yield* ctx.host.click("cb-trigger");
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.key("z");
    yield* ctx.host.key("z");
    yield* ctx.host.key("z");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a query that matches nothing paints no row",
      yield* paintedAt(ctx, "combobox-option-ada"),
      false,
    );
    yield* ctx.expectEqual(
      "the empty slot paints its message",
      yield* ctx.host.text("combobox-empty"),
      "No matches",
    );
    yield* ctx.host.capture("combobox-empty");

    yield* ctx.host.click("cb-outside");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "an outside press reaches its control",
      yield* ctx.host.text("cb-readout"),
      "value=linus changes=2 presses=1",
    );
    yield* ctx.expectEqual(
      "an outside press dismisses the list",
      yield* paintedAt(ctx, "combobox-content"),
      false,
    );
  });

/** One row of the list probe: a value, a title and the disabled flag. */
const ListRowItem = ({
  row,
  prefix,
}: {
  readonly row: ListRow;
  readonly prefix: string;
}): ReactNode => (
  <ListItem
    value={row.value}
    textValue={row.title}
    disabled={row.disabled}
    testId={`${prefix}-row-${row.value}`}
  >
    <ListItemTitle>{row.title}</ListItemTitle>
  </ListItem>
);

/**
 * `list-lifecycle` — the shipped `List` selection model in a real window.
 *
 * The list is the keyboard and selection foundation the menus and tabs reuse:
 * a roving tab stop, arrow moves that skip disabled rows, Enter/Space
 * activation (Space on the release), Home/End, type-ahead, and `Cmd+A` /
 * `Shift+Arrow` in multiple mode. Its 38 behaviour tests run in a
 * `TestRenderer`; the window is where the key event has to bubble from the
 * focused row to the list, which is the origin rule `keyOrigin` exists for.
 */
const ListProbe = (): ReactNode => {
  const theme = useTheme();
  const [single, setSingle] = useState("");
  const [singleChanges, setSingleChanges] = useState(0);
  const [activations, setActivations] = useState(0);
  const [multi, setMulti] = useState<ReadonlyArray<string>>([]);
  const [multiChanges, setMultiChanges] = useState(0);

  return (
    <div style={{ display: "flex", flexDirection: "row", gap: 24 }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: 340,
          gap: 6,
        }}
      >
        <text
          testId="list-single-readout"
          style={{
            ...textStyle(theme, "code"),
            color: theme.colors.mutedForeground,
          }}
        >
          {`selected=${single === "" ? "none" : single} changes=${singleChanges} activates=${activations}`}
        </text>
        <List
          testId="list-single"
          selectionMode="single"
          onValueChange={(value) => {
            setSingle(value);
            setSingleChanges((current) => current + 1);
          }}
          onActivate={() => setActivations((current) => current + 1)}
        >
          {Arr.map(LIST_ROWS, (row) => (
            <ListRowItem key={row.value} row={row} prefix="single" />
          ))}
        </List>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: 340,
          gap: 6,
        }}
      >
        <text
          testId="list-multi-readout"
          style={{
            ...textStyle(theme, "code"),
            color: theme.colors.mutedForeground,
          }}
        >
          {`selected=${multi.length === 0 ? "none" : Arr.join(multi, ",")} changes=${multiChanges}`}
        </text>
        <List
          testId="list-multi"
          selectionMode="multiple"
          onValueChange={(values) => {
            setMulti(values);
            setMultiChanges((current) => current + 1);
          }}
        >
          {Arr.map(LIST_ROWS, (row) => (
            <ListRowItem key={row.value} row={row} prefix="multi" />
          ))}
        </List>
      </div>
    </div>
  );
};

const listSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("list-single-readout");
    yield* Effect.sleep(SETTLE);

    // 1. A press selects and focuses the row it landed on.
    yield* ctx.expectEqual(
      "the single list starts with nothing selected",
      yield* ctx.host.text("list-single-readout"),
      "selected=none changes=0 activates=0",
    );
    yield* ctx.host.click("single-row-grace");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a press selects the row and reports one activation",
      yield* ctx.host.text("list-single-readout"),
      "selected=grace changes=1 activates=1",
    );
    yield* ctx.expectEqual(
      "a press focuses the row",
      yield* focusedId(ctx),
      "single-row-grace",
    );

    // 2. An arrow moves real focus and skips the disabled row.
    yield* ctx.host.key("down");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "down skips the disabled row",
      yield* focusedId(ctx),
      "single-row-linus",
    );
    yield* ctx.expectEqual(
      "an arrow moves focus without changing the selection",
      yield* ctx.host.text("list-single-readout"),
      "selected=grace changes=1 activates=1",
    );

    // 3. Enter selects the row focus landed on.
    yield* ctx.host.key("enter");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Enter selects the focused row and runs its action",
      yield* ctx.host.text("list-single-readout"),
      "selected=linus changes=2 activates=2",
    );

    // 4. Space selects on the release, and never runs the action.
    yield* ctx.host.key("up");
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.key("space");
    yield* ctx.host.keyUp("space");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Space on the release selects the focused row",
      yield* ctx.host.text("list-single-readout"),
      "selected=grace changes=3 activates=2",
    );

    // 5. Home/End move to the edges; Enter acts on what focus names.
    yield* ctx.host.key("home");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Home focuses the first enabled row",
      yield* focusedId(ctx),
      "single-row-ada",
    );
    yield* ctx.host.key("end");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "End focuses the last enabled row",
      yield* focusedId(ctx),
      "single-row-margaret",
    );
    yield* ctx.host.key("enter");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Enter selects the row End reached",
      yield* ctx.host.text("list-single-readout"),
      "selected=margaret changes=4 activates=3",
    );

    // 6. A typed letter jumps focus, and the next Enter acts from there.
    yield* ctx.host.key(TYPEAHEAD_LETTER);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "type-ahead focuses the matching row",
      yield* focusedId(ctx),
      "single-row-grace",
    );
    yield* ctx.expectEqual(
      "the typed jump does not select",
      yield* ctx.host.text("list-single-readout"),
      "selected=margaret changes=4 activates=3",
    );
    yield* ctx.host.key("enter");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Enter acts on the row the typed jump reached",
      yield* ctx.host.text("list-single-readout"),
      "selected=grace changes=5 activates=4",
    );

    // 7. A disabled row can take the pointer's focus but is never chosen.
    yield* ctx.host.click("single-row-alan");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a disabled row ignores the press",
      yield* ctx.host.text("list-single-readout"),
      "selected=grace changes=5 activates=4",
    );
    yield* ctx.expectEqual(
      "the pointer can still focus a disabled row",
      yield* focusedId(ctx),
      "single-row-alan",
    );
    yield* ctx.host.key("enter");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Enter cannot choose the focused disabled row",
      yield* ctx.host.text("list-single-readout"),
      "selected=grace changes=5 activates=4",
    );
    yield* ctx.host.key("down");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "an arrow leaves the disabled row for the next enabled one",
      yield* focusedId(ctx),
      "single-row-linus",
    );
    yield* ctx.host.capture("list-single");

    // 8. Multiple mode: a plain press replaces, Shift extends, Cmd+A selects.
    yield* ctx.expectEqual(
      "the multiple list starts empty",
      yield* ctx.host.text("list-multi-readout"),
      "selected=none changes=0",
    );
    yield* ctx.host.click("multi-row-ada");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a plain press replaces the selection",
      yield* ctx.host.text("list-multi-readout"),
      "selected=ada changes=1",
    );
    yield* ctx.host.key("shift-down");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Shift+down extends from the pressed row",
      yield* ctx.host.text("list-multi-readout"),
      "selected=ada,grace changes=2",
    );
    yield* ctx.host.key("cmd-a");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Cmd+A selects every enabled row",
      yield* ctx.host.text("list-multi-readout"),
      "selected=ada,grace,linus,margaret changes=3",
    );
    yield* ctx.host.click("multi-row-grace");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a plain press after select-all replaces it",
      yield* ctx.host.text("list-multi-readout"),
      "selected=grace changes=4",
    );
    yield* ctx.host.click("multi-row-alan");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a disabled row is not selected",
      yield* ctx.host.text("list-multi-readout"),
      "selected=grace changes=4",
    );
    yield* ctx.host.capture("list-multiple");
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
    yield* ctx.expectEqual(
      "Escape unpaints the dialog surface",
      yield* settleGone(ctx, "dialog-content"),
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
 * Reads the fade the presence seam paints, from the pixel the entry leaves.
 *
 * The seam is a `motion` description, and no window exposes one, so the surface
 * is measured where it paints: a point inside the content's own padding, over a
 * page the probe fills white. The reading is taken on the renderer's **motion
 * clock** rather than on wall time — a software renderer can block a paint
 * longer than the tween, and a read "at 107 ms" would then name a frame the
 * renderer had not produced. Freeze, advance by an exact offset, let the frame
 * paint, capture: the same read is repeatable.
 *
 * Partway through the level the pixel is a mix of the surface and the page; past
 * it the pixel is the surface's own colour. The frozen clock then repeats the
 * reading under a reduced preference, where the resting frame paints with no
 * journey at all — so the timing, not the paint, is what the preference removes.
 */
const surfaceFadeSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("fade-trigger");
    const surface = yield* ctx.expectSome(
      "the palette names the surface colour",
      surfaceFadeColour(palettes.dark.colors.popover),
    );
    const pauseClock = yield* ctx.expectSome(
      "the window exposes a motion clock",
      Option.fromNullishOr(ctx.host.clockPause),
    );
    const fastForward = yield* ctx.expectSome(
      "the clock can be advanced",
      Option.fromNullishOr(ctx.host.clockFastForward),
    );
    const resumeClock = yield* ctx.expectSome(
      "the clock can be resumed",
      Option.fromNullishOr(ctx.host.clockResume),
    );
    yield* ctx.expectEqual(
      "a closed dialog paints no surface",
      Option.isNone(
        Option.fromNullishOr(yield* ctx.host.bounds("fade-surface")),
      ),
      true,
    );

    /** The surface's painted box right now; frozen time keeps it the sampled frame's. */
    const currentBox = (): Effect.Effect<
      FadeBox,
      Smoke.SmokeAssertionError | Smoke.SmokeHostError
    > =>
      Effect.gen(function* () {
        return yield* ctx.expectSome(
          "the surface paints a box to sample",
          Option.fromNullishOr(yield* ctx.host.bounds("fade-surface")),
        );
      });

    /**
     * The colour at the sample point of a capture.
     *
     * The device scale is read from a frame once: a capture that is not the
     * window's box cannot be sampled at a logical point, and saying so is better
     * than reading a pixel from another part of the window.
     */
    const sampleIn = (
      frame: Pixels.Pixels,
      box: FadeBox,
      scale: number,
    ): Option.Option<Pixels.Rgba> => {
      const point = framePoint(fadeSample(box), scale);
      return Option.fromNullishOr(Pixels.pixelAt(frame, point.x, point.y));
    };

    /** Captures `name` and samples it, once the paint has caught up with the clock. */
    const captureSample = (
      name: string,
      scale: number,
    ): Effect.Effect<
      Pixels.Rgba,
      Smoke.SmokeAssertionError | Smoke.SmokeHostError
    > =>
      Effect.gen(function* () {
        yield* ctx.host.capture(name);
        const box = yield* currentBox();
        return yield* ctx.expectSome(
          `the ${name} capture holds the sample point`,
          sampleIn(yield* ctx.host.pixels(name), box, scale),
        );
      });

    // ── Animated: the surface arrives on a painted fade ─────────────────────
    // The clock is frozen before the press, so the mount's first frame is
    // opacity 0 and stays there until the probe advances it.
    const frozenAt = yield* pauseClock();
    yield* ctx.host.click("fade-trigger");
    yield* ctx.expectContains(
      "the press opens the dialog",
      yield* settleUntil(ctx.host.text("fade-readout"), (value) =>
        value.includes("opens=1 closes=0"),
      ),
      "opens=1 closes=0",
    );
    yield* ctx.host.waitFor("fade-surface");
    yield* ctx.host.capture("fade-frozen");
    const frozen = yield* ctx.host.pixels("fade-frozen");
    const size = yield* ctx.host.windowSize();
    const scale = yield* ctx.expectSome(
      "the capture is the window at a whole device scale",
      captureScale(frozen, size),
    );
    const frozenSample = yield* ctx.expectSome(
      "the fade-frozen capture holds the sample point",
      sampleIn(frozen, yield* currentBox(), scale),
    );
    yield* ctx.expectEqual(
      "a frozen mount paints the page, not the surface",
      isBacking(frozenSample, FADE_BACKING_RGBA),
      true,
    );

    const partialAt = yield* fastForward(FADE_PARTIAL_MS);
    yield* ctx.expectEqual(
      "the clock advances by the partial offset",
      Math.round(partialAt - frozenAt),
      FADE_PARTIAL_MS,
    );
    const partial = yield* settleUntil(
      captureSample("fade-partial", scale),
      (sample) => isFading(sample, FADE_BACKING_RGBA, surface),
      FADE_CAPTURE_ATTEMPTS,
    );
    yield* ctx.expectEqual(
      "partway through its level the surface is a mix of surface and page",
      isFading(partial, FADE_BACKING_RGBA, surface),
      true,
    );

    yield* fastForward(FADE_REST_MS - FADE_PARTIAL_MS);
    const settled = yield* settleUntil(
      captureSample("fade-settled", scale),
      (sample) => isSurface(sample, surface),
      FADE_CAPTURE_ATTEMPTS,
    );
    yield* ctx.expectEqual(
      "past its level the surface rests on its own colour",
      isSurface(settled, surface),
      true,
    );
    yield* resumeClock();

    // ── Reduced: the journey is gone, the resting frame is not ──────────────
    // Freezing the clock is what makes this a control: an animated surface
    // under the same frozen clock stays at opacity 0, so a preference the
    // runtime ignored could never paint the surface here.
    yield* ctx.host.key("escape");
    yield* ctx.expectEqual(
      "Escape unpaints the surface",
      yield* settleGone(ctx, "fade-surface"),
      true,
    );
    yield* ctx.host.click("fade-reduce");
    yield* ctx.expectContains(
      "the reduce control takes the preference",
      yield* settleUntil(ctx.host.text("fade-readout"), (value) =>
        value.includes("preference=reduced"),
      ),
      "preference=reduced",
    );
    yield* pauseClock();
    yield* ctx.host.click("fade-trigger");
    yield* ctx.host.waitFor("fade-surface");
    const reduced = yield* settleUntil(
      captureSample("fade-reduced", scale),
      (sample) => isSurface(sample, surface),
      FADE_CAPTURE_ATTEMPTS,
    );
    yield* ctx.expectEqual(
      "a reduced surface paints at rest under the same frozen clock",
      isSurface(reduced, surface),
      true,
    );
    yield* resumeClock();
    yield* ctx.expectContains(
      "both opens reached onOpenChange",
      yield* ctx.host.text("fade-readout"),
      "opens=2 closes=1",
    );
  });

/**
 * Drives the shipped `Tooltip` through the paths it opens on and the way it
 * leaves: a `Tab` traversal's focus, the pointer entering the trigger, and a
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

    /**
     * Waits until the tip's paint state is `wanted`, then gives up.
     *
     * The shared bounded poll: the assertion that follows reports the state it
     * actually read.
     */
    const settleTip = (
      wanted: boolean,
    ): Effect.Effect<void, Smoke.SmokeHostError> =>
      Effect.asVoid(settleUntil(painted, (shown) => shown === wanted));

    yield* ctx.host.waitFor("tooltip-trigger");
    yield* ctx.expectEqual("a tooltip starts closed", yield* painted, false);
    yield* ctx.expectContains(
      "the trigger has not been entered yet",
      yield* ctx.host.text("tooltip-readout"),
      "enters=0 leaves=0",
    );

    // The keyboard path: the trigger is the probe's first tab stop. A window
    // delivers React's `onFocus` for a traversal at HEAD (re-measured
    // 2026-10-22; the earlier probe read the frame before it arrived), so the
    // tip opens. Escape then closes it, so the pointer path starts from closed.
    yield* ctx.host.key("tab");
    yield* settleTip(true);
    yield* ctx.expectEqual(
      "Tab lands on the trigger",
      yield* focusedId(ctx),
      "tooltip-trigger",
    );
    yield* ctx.expectEqual(
      "a keyboard focus opens the tip",
      yield* painted,
      true,
    );
    yield* ctx.host.key("escape");
    yield* settleTip(false);
    yield* ctx.expectEqual(
      "Escape closes the tip the keyboard opened",
      yield* painted,
      false,
    );
    yield* ctx.expectEqual(
      "the trigger keeps the focus after Escape",
      yield* focusedId(ctx),
      "tooltip-trigger",
    );

    // The pointer path. The tip opens immediately (the wrapper's provider has a
    // zero delay), so the wait is for the frame, not for a timer.
    yield* ctx.host.hover("tooltip-trigger");
    yield* settleTip(true);
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
    // so the probe reads frames until the tip is gone rather than one fixed one.
    yield* ctx.host.hover("tooltip-away");
    yield* settleTip(false);
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
    yield* settleTip(true);
    yield* ctx.expectEqual(
      "a second hover reopens the tip",
      yield* painted,
      true,
    );
    yield* ctx.host.key("escape");
    yield* settleTip(false);
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
    /** The menu surface is gone once its exit tween has finished. */
    const unpainted = settleGone(ctx, "menu-content");

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
    /** The surface is gone once its exit tween has finished. */
    const unpainted = settleGone(ctx, "context-menu");

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
    // The panel enters with a few pixels of travel on its entry axis, so both
    // axes are read at rest: a mid-tween read reported `y=121.5` for `124`.
    const pointerX = yield* settleNumber(boxAxis("x")(ctx, "context-menu"));
    const pointerY = yield* settleNumber(boxAxis("y")(ctx, "context-menu"));
    yield* ctx.expectNear(
      "the surface starts at the press point's x",
      pointerX,
      trigger.x + trigger.width / 2,
      1,
    );
    yield* ctx.expectNear(
      "the surface starts at the press point's y",
      pointerY,
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
    // The surface enters with a few pixels of travel on its entry axis, so both
    // axes are read at rest: a mid-tween read reported `y=201` for `204`.
    const fromKeyboardX = yield* settleNumber(
      boxAxis("x")(ctx, "context-menu"),
    );
    const fromKeyboardY = yield* settleNumber(
      boxAxis("y")(ctx, "context-menu"),
    );
    yield* ctx.expectNear(
      "the keyboard surface starts at the trigger's left edge",
      fromKeyboardX,
      trigger.x,
      1,
    );
    yield* ctx.expectNear(
      "the keyboard surface starts under the trigger",
      fromKeyboardY,
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
    /** Whether `testId` is absent from the window's tree, once it settles. */
    const unpainted = (
      testId: string,
    ): Effect.Effect<boolean, Smoke.SmokeHostError> => settleGone(ctx, testId);

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
    // The modal records the opener in the render that opens it, before the
    // field exists, so `autoFocus` cannot steal the restore target: the focus
    // comes back to the trigger.
    yield* ctx.expectEqual(
      "a field that took the focus at mount gives it back to the opener",
      yield* focusedAfterPaint(ctx),
      "restore-auto-trigger",
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

/**
 * A scroller inside a scroller: the page a pane's list sits in.
 *
 * A dock pane, a dialog body and a settings form all put a scroller inside
 * another one, so the wheel has a routing decision to make: does the inner
 * scroller keep it while it can move, does the outer one take it when the inner
 * reaches its end, and does the inner's event reach an ancestor's `onScroll`
 * handler? The fixture's geometry (`nested-scroll.ts`) puts the inner scroller
 * wholly inside the page and the page-only wheel on a filler row the list does
 * not cover, so each wheel can only be aimed at the scroller it names.
 */
const NestedScrollProbe = (): ReactNode => {
  const theme = useTheme();
  const [inner, setInner] = useState<Smoke.Offset>({ x: 0, y: 0 });
  const [outer, setOuter] = useState<Smoke.Offset>({ x: 0, y: 0 });
  const [innerEvents, setInnerEvents] = useState(0);
  const [outerEvents, setOuterEvents] = useState(0);
  const [listPage, setListPage] = useState<Smoke.Offset>({ x: 0, y: 0 });
  const [listEvents, setListEvents] = useState(0);

  return (
    <div
      testId="nested-probe"
      style={{
        width: 720,
        height: 460,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-start",
        gap: theme.spacing.xl,
      }}
    >
      <div
        style={{
          width: OUTER_VIEWPORT.width,
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
          Wheeling over the list scrolls the page behind it too: one wheel moves
          every scroller above the pointer.
        </text>
        <div
          testId="nested-outer"
          style={{
            ...OUTER_VIEWPORT,
            overflow: "scroll",
            backgroundColor: theme.colors.card,
          }}
          onScroll={() => setOuterEvents((current) => current + 1)}
          onScrollChange={(event) =>
            setOuter({ x: event.scrollX ?? 0, y: event.scrollY ?? 0 })
          }
        >
          <div
            testId="nested-inner"
            style={{
              ...INNER_VIEWPORT,
              overflow: "scroll",
              backgroundColor: theme.colors.muted,
            }}
            onScroll={() => setInnerEvents((current) => current + 1)}
            onScrollChange={(event) =>
              setInner({ x: event.scrollX ?? 0, y: event.scrollY ?? 0 })
            }
          >
            {Array.from({ length: INNER_ROWS }, (_, index) => (
              <div
                key={index}
                testId={`nested-inner-row-${index}`}
                style={{ height: INNER_ROW_HEIGHT }}
              >
                <text
                  style={{
                    ...textStyle(theme, "body"),
                    color: theme.colors.foreground,
                  }}
                >
                  {`inner ${index}`}
                </text>
              </div>
            ))}
          </div>
          {Array.from({ length: FILLER_ROWS }, (_, index) => (
            <div
              key={index}
              testId={`nested-filler-${index}`}
              style={{ height: FILLER_ROW_HEIGHT }}
            >
              <text
                style={{
                  ...textStyle(theme, "body"),
                  color: theme.colors.foreground,
                }}
              >
                {`page ${index}`}
              </text>
            </div>
          ))}
        </div>
        <text
          testId="nested-inner-offset"
          style={{
            ...textStyle(theme, "code"),
            color: theme.colors.mutedForeground,
          }}
        >
          {`inner=x${inner.x} y${inner.y} events=${innerEvents}`}
        </text>
        <text
          testId="nested-outer-offset"
          style={{
            ...textStyle(theme, "code"),
            color: theme.colors.mutedForeground,
          }}
        >
          {`outer=x${outer.x} y${outer.y} events=${outerEvents}`}
        </text>
      </div>
      <div
        style={{
          width: PANE_PAGE_VIEWPORT.width,
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
          The same page with a virtual list as the pane:
        </text>
        <div
          testId="nested-list-page"
          style={{
            ...PANE_PAGE_VIEWPORT,
            overflow: "scroll",
            backgroundColor: theme.colors.card,
          }}
          onScroll={() => setListEvents((current) => current + 1)}
          onScrollChange={(event) =>
            setListPage({ x: event.scrollX ?? 0, y: event.scrollY ?? 0 })
          }
        >
          <div
            testId="nested-list-frame"
            style={{ height: PANE_VIEWPORT, display: "flex" }}
          >
            <virtual-list
              testId="nested-list"
              style={{ flexGrow: 1, minHeight: 0 }}
            >
              {Array.from({ length: PANE_ROWS }, (_, index) => (
                <div
                  key={index}
                  testId={`nested-list-row-${index}`}
                  style={{ height: PANE_ROW_HEIGHT }}
                >
                  <text
                    style={{
                      ...textStyle(theme, "body"),
                      color: theme.colors.foreground,
                    }}
                  >
                    {`pane row ${index}`}
                  </text>
                </div>
              ))}
            </virtual-list>
          </div>
          {Array.from({ length: PANE_FILLER_ROWS }, (_, index) => (
            <div
              key={index}
              testId={`nested-list-filler-${index}`}
              style={{ height: PANE_FILLER_HEIGHT }}
            >
              <text
                style={{
                  ...textStyle(theme, "body"),
                  color: theme.colors.foreground,
                }}
              >
                {`list page ${index}`}
              </text>
            </div>
          ))}
        </div>
        <text
          testId="nested-list-offset"
          style={{
            ...textStyle(theme, "code"),
            color: theme.colors.mutedForeground,
          }}
        >
          {`page=x${listPage.x} y${listPage.y} events=${listEvents}`}
        </text>
      </div>
    </div>
  );
};

const nestedScrollSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("nested-inner-row-0");
    yield* Effect.sleep(SETTLE);

    const offsetOf = (
      testId: string,
    ): Effect.Effect<
      Smoke.Offset,
      Smoke.SmokeAssertionError | Smoke.SmokeHostError
    > =>
      Effect.gen(function* () {
        return yield* ctx.expectSome(
          `the ${testId} scroller reports an offset`,
          Option.fromNullishOr(yield* ctx.host.scrollOffset(testId)),
        );
      });

    const innerOffset = yield* offsetOf("nested-inner");
    const outerOffset = yield* offsetOf("nested-outer");
    yield* ctx.expectEqual(
      "the inner list starts at the top",
      innerOffset.y,
      0,
    );
    yield* ctx.expectEqual("the page starts at the top", outerOffset.y, 0);

    // The geometry the two wheels rest on: the inner is wholly inside the
    // outer's viewport, and the filler row the page-only wheel aims at starts
    // below the inner, so that wheel cannot land on the list.
    const outerBox = yield* paintedBox(ctx, "nested-outer");
    const innerBox = yield* paintedBox(ctx, "nested-inner");
    const fillerBox = yield* paintedBox(ctx, `nested-filler-${OUTER_ONLY_ROW}`);
    yield* ctx.expectEqual(
      "the inner scroller is painted inside the page scroller",
      innerBox.y >= outerBox.y &&
        innerBox.y + innerBox.height <= outerBox.y + outerBox.height &&
        innerBox.x >= outerBox.x &&
        innerBox.x + innerBox.width <= outerBox.x + outerBox.width,
      true,
    );
    yield* ctx.expectEqual(
      "the page-only wheel aims at a row below the inner list",
      fillerBox.y >= innerBox.y + innerBox.height,
      true,
    );

    // One wheel over the inner list: the measured routing question.
    yield* ctx.host.wheel("nested-inner", 0, INNER_STEP);
    yield* Effect.sleep(SETTLE);
    const innerMoved = yield* offsetOf("nested-inner");
    yield* ctx.expectNear(
      "the inner list takes the wheel's own delta",
      innerMoved.y,
      INNER_STEP,
      1,
    );
    const pageAlong = yield* offsetOf("nested-outer");
    yield* ctx.expectNear(
      "the page scrolls by the same wheel, though the inner list had 240px left",
      pageAlong.y,
      INNER_STEP,
      1,
    );
    yield* ctx.expectEqual(
      "the page's handler heard the wheel aimed inside the list",
      yield* ctx.host.text("nested-outer-offset"),
      `outer=x0 y${INNER_STEP} events=1`,
    );

    // The one wheel that moves a single scroller: aimed below the list.
    yield* ctx.host.wheel(`nested-filler-${OUTER_ONLY_ROW}`, 0, -INNER_STEP);
    yield* Effect.sleep(SETTLE);
    const pageBack = yield* offsetOf("nested-outer");
    yield* ctx.expectNear(
      "a wheel outside the list takes the page back on its own",
      pageBack.y,
      0,
      1,
    );
    yield* ctx.expectNear(
      "the page's wheel leaves the list untouched",
      (yield* offsetOf("nested-inner")).y,
      INNER_STEP,
      1,
    );

    // At the inner's end the page still takes the whole delta: each scroller
    // clamps against its own content, not the other's.
    yield* ctx.host.wheel("nested-inner", 0, -100000);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectNear(
      "the inner list clamps at its content's end",
      (yield* offsetOf("nested-inner")).y,
      INNER_MAX,
      1,
    );
    yield* ctx.expectNear(
      "the page clamps against its own content, not the list's end",
      (yield* offsetOf("nested-outer")).y,
      OUTER_MAX,
      1,
    );

    yield* ctx.expectEqual(
      "the inner readout carries the end and every wheel it heard",
      yield* ctx.host.text("nested-inner-offset"),
      `inner=x0 y${INNER_MAX} events=2`,
    );
    yield* ctx.expectEqual(
      "the page readout counts the wheels aimed inside the list too",
      yield* ctx.host.text("nested-outer-offset"),
      `outer=x0 y${OUTER_MAX} events=3`,
    );

    // The same question for the pane a dock actually ships: a virtual list,
    // which is a native scroll host rather than an `overflow: "scroll"` box.
    yield* ctx.host.waitFor("nested-list-row-0");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the list page starts at the top",
      (yield* offsetOf("nested-list-page")).y,
      0,
    );
    yield* ctx.expectEqual(
      "the virtual list paints its first row",
      Arr.contains(yield* ctx.host.paintedText(), "pane row 0"),
      true,
    );
    yield* ctx.host.wheel("nested-list-frame", 0, INNER_STEP);
    yield* Effect.sleep(Duration.millis(300));
    yield* ctx.expectEqual(
      "the wheel reached the virtual list, whose first row is now gone",
      Arr.contains(yield* ctx.host.paintedText(), "pane row 0"),
      false,
    );
    const listPageMoved = yield* offsetOf("nested-list-page");
    yield* ctx.expectNear(
      "the page behind the virtual list scrolls by the same wheel",
      listPageMoved.y,
      INNER_STEP,
      1,
    );
    yield* ctx.expectEqual(
      "the list page's readout carries the offset and the wheel it heard",
      yield* ctx.host.text("nested-list-offset"),
      `page=x0 y${INNER_STEP} events=1`,
    );
    yield* ctx.host.capture("nested-scroll");
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

/**
 * One paginated list with a loading void at the edge `direction` names.
 *
 * `correct` applies `loadingRowRestore` after the commit; the twin without it
 * lets the runtime keep whatever row it anchored, which is the behaviour the
 * probe measures against.
 */
const LoadingRowList = ({
  testId,
  prefix,
  direction,
  correct,
}: {
  readonly testId: string;
  readonly prefix: string;
  readonly direction: PageDirection;
  readonly correct: boolean;
}): ReactNode => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const list = useRef<PublicInstance | null>(null);
  const [page, setPage] = useState(0);
  const [corrections, setCorrections] = useState(0);
  const [guards, setGuards] = useState(0);
  const [request, setRequest] = useState("none");

  const messages = messageIds(direction, page);
  const loadingRow = voidRow(direction, messages.length);

  const load = (): void => {
    const target = Option.flatMap(
      Option.fromNullishOr(list.current?.id),
      (elementId) =>
        Option.map(
          Option.fromNullishOr(
            listAnchorOf(renderer?.getListScrollTop?.(elementId) ?? null),
          ),
          (anchor) => ({ elementId, anchor }),
        ),
    );
    // The reader's place, decided before the commit and applied after it.
    const arrival = Option.flatMap(target, ({ elementId, anchor }) =>
      Option.map(
        loadingRowRestore({
          direction,
          anchor,
          voidRow: loadingRow,
          pageRows: PAGE_ROWS,
          edgeHeight: EDGE_HEIGHT,
        }),
        (scroll) => ({ elementId, scroll }),
      ),
    );
    // Commit the splice **synchronously** before queueing the scroll: the
    // runtime applies a queued list scroll on the next render, and a scroll
    // queued before the splice lands would name rows in the old child list.
    flushSync(() => setPage(page + 1));
    if (!correct) return;
    Option.match(arrival, {
      onNone: () => setGuards((count) => count + 1),
      onSome: ({ elementId, scroll }) => {
        renderer?.scrollToItem?.(elementId, scroll.index, scroll.offsetInItem);
        setRequest(`${scroll.index}:${scroll.offsetInItem}`);
        setCorrections((count) => count + 1);
      },
    });
  };

  const row = (id: number) => (
    <div key={id} testId={`${testId}-row-${id}`} style={{ height: ROW_HEIGHT }}>
      <text
        style={{ ...textStyle(theme, "body"), color: theme.colors.foreground }}
      >
        {`${prefix} ${id}`}
      </text>
    </div>
  );

  const edge = (
    <div
      key="loading-row"
      testId={`${testId}-void`}
      style={{
        height: EDGE_HEIGHT,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        {`${prefix} loading`}
      </text>
    </div>
  );

  const rows = Arr.map(messages, row);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div
        testId={`${testId}-frame`}
        style={{ display: "flex", height: VIEWPORT_HEIGHT }}
      >
        <virtual-list
          ref={list}
          testId={testId}
          alignment={direction === "append" ? "bottom" : "top"}
          style={{ flexGrow: 1, minHeight: 0 }}
        >
          {direction === "prepend"
            ? Arr.prepend(rows, edge)
            : Arr.append(rows, edge)}
        </virtual-list>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <Pressable
          testId={`${testId}-load`}
          onClick={load}
          style={{ padding: theme.spacing.xs }}
        >
          <text
            style={{
              ...textStyle(theme, "caption"),
              color: theme.colors.foreground,
            }}
          >
            load page
          </text>
        </Pressable>
        <Readout testId={`${testId}-readout`}>
          {`pages=${page} corrected=${corrections} guarded=${guards} request=${request}`}
        </Readout>
      </div>
    </div>
  );
};

/**
 * The loading-row correction, measured on both edges of a paginated history.
 *
 * Four lists, identical geometry, in two pairs (top void and bottom void): the
 * left pair is left to the runtime, the right pair re-anchors. The reader waits
 * in the void, a page arrives, and the probe asserts the pixel the message they
 * were reading keeps — or loses.
 */
const LoadingRowProbe = (): ReactNode => {
  const theme = useTheme();
  return (
    <div
      testId="loading-row-probe"
      style={{
        width: 880,
        height: 500,
        padding: theme.spacing.md,
        display: "flex",
        flexDirection: "column",
        gap: 6,
        backgroundColor: theme.colors.background,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        A page arrives while the reader waits in the loading row. The runtime
        anchors that row, so only the app can put the reader back.
      </text>
      <div style={{ display: "flex", gap: 16 }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            width: 410,
          }}
        >
          <text
            style={{
              ...textStyle(theme, "caption"),
              color: theme.colors.mutedForeground,
            }}
          >
            no correction — the splice keeps the loading row
          </text>
          <LoadingRowList
            testId="loading-top-naive"
            prefix="naive older"
            direction="prepend"
            correct={false}
          />
          <LoadingRowList
            testId="loading-bottom-naive"
            prefix="naive newer"
            direction="append"
            correct={false}
          />
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            width: 410,
          }}
        >
          <text
            style={{
              ...textStyle(theme, "caption"),
              color: theme.colors.mutedForeground,
            }}
          >
            re-anchored on the message under the loading row
          </text>
          <LoadingRowList
            testId="loading-top-fixed"
            prefix="fixed older"
            direction="prepend"
            correct
          />
          <LoadingRowList
            testId="loading-bottom-fixed"
            prefix="fixed newer"
            direction="append"
            correct
          />
        </div>
      </div>
    </div>
  );
};

/**
 * The `loading-row-correction` steps: the same arrival on both edges, once left
 * to the runtime and once re-anchored by the app.
 *
 * Every expected number comes from `loading-row.ts`, so the probe cannot drift
 * from the rule its unit test guards.
 */
const loadingRowSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    /** The painted box of `testId`, or `None` when the row is not painted. */
    const boxOf = (testId: string) =>
      Effect.map(ctx.host.bounds(testId), Option.fromNullishOr);
    /** The window y of `testId`'s top edge, with the check that names it missing. */
    const topOf = (label: string, testId: string) =>
      Effect.flatMap(boxOf(testId), (box) =>
        Effect.map(ctx.expectSome(label, box), (bounds) => bounds.y),
      );
    /**
     * A row's y relative to its list's frame.
     *
     * The renderer reports window coordinates, and the four lists sit below the
     * probe's caption, so an absolute `y` would assert the layout of the probe
     * instead of the list's own placement.
     */
    const yIn =
      (origin: number) =>
      (
        label: string,
        testId: string,
      ): Effect.Effect<
        number,
        Smoke.SmokeAssertionError | Smoke.SmokeHostError
      > =>
        Effect.flatMap(boxOf(testId), (box) =>
          Effect.map(ctx.expectSome(label, box), (bounds) => bounds.y - origin),
        );
    const anchorOf = (label: string, testId: string) =>
      Effect.flatMap(
        Effect.map(ctx.host.listAnchor(testId), Option.fromNullishOr),
        (anchor) => ctx.expectSome(label, anchor),
      );
    /** A row that paints no pixel inside its list's frame: above or below it. */
    const offScreenIn =
      (origin: number) =>
      (
        label: string,
        testId: string,
      ): Effect.Effect<
        void,
        Smoke.SmokeAssertionError | Smoke.SmokeHostError
      > =>
        Effect.flatMap(boxOf(testId), (box) =>
          ctx.expectEqual(
            label,
            Option.match(box, {
              onNone: () => true,
              onSome: (bounds) => {
                const top = bounds.y - origin;
                return top + bounds.height <= 1 || top >= VIEWPORT_HEIGHT - 1;
              },
            }),
            true,
          ),
        );
    /** Presses a list's loader and waits past the commit and the splice. */
    const load = (testId: string) =>
      Effect.gen(function* () {
        yield* ctx.host.click(`${testId}-load`);
        yield* Effect.sleep(Duration.millis(250));
      });

    const topNaive = "loading-top-naive";
    const topFixed = "loading-top-fixed";
    const bottomNaive = "loading-bottom-naive";
    const bottomFixed = "loading-bottom-fixed";
    const newerLast = NEWER_FIRST + MESSAGE_ROWS - 1;

    yield* ctx.host.waitFor(`${topNaive}-row-${OLDER_FIRST}`);
    // `waitFor` answers from the automation tree, which exists a frame before
    // the paint: `bounds` is a painted value, so the four frames need one.
    yield* Effect.sleep(Duration.millis(300));

    const topNaiveTop = yield* topOf(
      "the top naive list's frame painted",
      `${topNaive}-frame`,
    );
    const topFixedTop = yield* topOf(
      "the top re-anchored list's frame painted",
      `${topFixed}-frame`,
    );
    const bottomNaiveTop = yield* topOf(
      "the bottom naive list's frame painted",
      `${bottomNaive}-frame`,
    );
    const bottomFixedTop = yield* topOf(
      "the bottom re-anchored list's frame painted",
      `${bottomFixed}-frame`,
    );
    const topNaiveY = yIn(topNaiveTop);
    const topFixedY = yIn(topFixedTop);
    const bottomNaiveY = yIn(bottomNaiveTop);
    const bottomFixedY = yIn(bottomFixedTop);
    const topNaiveOff = offScreenIn(topNaiveTop);
    const bottomNaiveOff = offScreenIn(bottomNaiveTop);
    const topFixedOff = offScreenIn(topFixedTop);

    // 1. Premise: while the page is in flight the void IS the list's anchor,
    //    and the message the reader is reading sits one void height below it.
    const restAnchor = yield* anchorOf(
      "the top list reports its anchor",
      topNaive,
    );
    yield* ctx.expectEqual(
      "the top void is the list's anchor",
      restAnchor.itemIndex,
      0,
    );
    yield* ctx.expectEqual(
      "the reader waits at the void's own top",
      restAnchor.offsetInItem,
      0,
    );
    yield* ctx.expectNear(
      "the anchor reports the list's viewport",
      restAnchor.viewportHeight,
      VIEWPORT_HEIGHT,
      1,
    );
    const readerTop = yield* topNaiveY(
      "the message under the top void painted",
      `${topNaive}-row-${OLDER_FIRST}`,
    );
    yield* ctx.expectNear(
      "the message under the void sits one void height down",
      readerTop,
      MESSAGE_TOP,
      1,
    );
    yield* ctx.expectNear(
      "both top lists start on the same pixel",
      yield* topFixedY(
        "the re-anchored twin painted",
        `${topFixed}-row-${OLDER_FIRST}`,
      ),
      readerTop,
      1,
    );

    // 2. The same page arrives in both top lists.
    yield* load(topNaive);
    yield* load(topFixed);

    // 3. Left to the runtime, the void stays put and the page takes the
    //    reader's screen: this is the defect the correction exists for.
    yield* ctx.expectEqual(
      "the naive list still anchors the void",
      (yield* anchorOf("the naive list reports its anchor", topNaive))
        .itemIndex,
      0,
    );
    yield* ctx.expectNear(
      "the naive load paints the page where the reader was reading",
      yield* topNaiveY(
        "the page's first row painted",
        `${topNaive}-row-${pageFirstId("prepend", 1)}`,
      ),
      MESSAGE_TOP,
      1,
    );
    yield* topNaiveOff(
      "the naive load takes the reader's message off the screen",
      `${topNaive}-row-${OLDER_FIRST}`,
    );

    // 4. Re-anchored, the page fills the void's old extent and the message the
    //    reader was on does not move a pixel.
    const corrected = yield* anchorOf(
      "the re-anchored list reports its anchor",
      topFixed,
    );
    yield* ctx.expectEqual(
      "the top void is no longer the list's anchor",
      corrected.itemIndex !== 0,
      true,
    );
    yield* ctx.expectNear(
      "the corrected load leaves the reader's message where it was",
      yield* topFixedY(
        "the reader's message painted",
        `${topFixed}-row-${OLDER_FIRST}`,
      ),
      MESSAGE_TOP,
      1,
    );
    yield* ctx.expectNear(
      "the corrected load puts the page above the message",
      yield* topFixedY(
        "the page's last row painted",
        `${topFixed}-row-${OLDER_FIRST - 1}`,
      ),
      (PAGE_ROWS - 1) * ROW_HEIGHT,
      1,
    );
    yield* ctx.expectEqual(
      "the correction asked for the message under the void, one void up",
      yield* ctx.host.text(`${topFixed}-readout`),
      `pages=1 corrected=1 guarded=0 request=${1 + PAGE_ROWS}:-${EDGE_HEIGHT}`,
    );

    // 5. A second page, with the reader already past the void: the anchor is a
    //    message row, so the runtime's own index shift holds the screen and the
    //    app must NOT correct again.
    yield* load(topFixed);
    yield* ctx.expectNear(
      "a second page leaves the reader's message still",
      yield* topFixedY(
        "the reader's message still painted",
        `${topFixed}-row-${OLDER_FIRST}`,
      ),
      MESSAGE_TOP,
      1,
    );
    yield* ctx.expectNear(
      "the page already on screen stays put",
      yield* topFixedY(
        "the first page's last row painted",
        `${topFixed}-row-${OLDER_FIRST - 1}`,
      ),
      (PAGE_ROWS - 1) * ROW_HEIGHT,
      1,
    );
    yield* topFixedOff(
      "the second page joins above the viewport",
      `${topFixed}-row-${pageFirstId("prepend", 2)}`,
    );
    yield* ctx.expectEqual(
      "the app corrected the void arrival and left the scrolled one alone",
      yield* ctx.host.text(`${topFixed}-readout`),
      `pages=2 corrected=1 guarded=1 request=${1 + PAGE_ROWS}:-${EDGE_HEIGHT}`,
    );
    yield* ctx.expectEqual(
      "the naive list never corrected anything",
      yield* ctx.host.text(`${topNaive}-readout`),
      "pages=1 corrected=0 guarded=0 request=none",
    );

    // 6. The bottom edge: a bottom-aligned list resting at its end reports the
    //    at-end sentinel, and its trailing void's top edge is one viewport less
    //    a void below the top.
    const endAnchor = yield* anchorOf(
      "the bottom list reports its anchor",
      bottomNaive,
    );
    yield* ctx.expectEqual(
      "a list resting at its end reports the at-end sentinel",
      endAnchor.itemIndex,
      MESSAGE_ROWS + 1,
    );
    yield* ctx.expectNear(
      "the trailing void's top edge sits one viewport less a void down",
      yield* bottomNaiveY("the trailing void painted", `${bottomNaive}-void`),
      VOID_TOP,
      1,
    );
    yield* ctx.expectNear(
      "the reader's last message sits above the trailing void",
      yield* bottomNaiveY(
        "the reader's last message painted",
        `${bottomNaive}-row-${newerLast}`,
      ),
      READER_TOP,
      1,
    );

    // 7. Left to the runtime, the sentinel follows the new end and the reader
    //    jumps: the message they were on leaves the screen.
    yield* load(bottomNaive);
    yield* ctx.expectEqual(
      "the naive append follows the sentinel to the new row count",
      (yield* anchorOf("the naive bottom list reports its anchor", bottomNaive))
        .itemIndex,
      MESSAGE_ROWS + PAGE_ROWS + 1,
    );
    yield* bottomNaiveOff(
      "the naive append takes the reader's message off the screen",
      `${bottomNaive}-row-${newerLast}`,
    );
    yield* ctx.expectNear(
      "the naive append paints the page at the top of the screen",
      yield* bottomNaiveY(
        "the appended page's first row painted",
        `${bottomNaive}-row-${pageFirstId("append", 1)}`,
      ),
      0,
      1,
    );

    // 8. Re-anchored, the page's first row takes the void's old top edge and
    //    the row above the void keeps its pixel.
    yield* load(bottomFixed);
    const appended = yield* anchorOf(
      "the re-anchored bottom list reports its anchor",
      bottomFixed,
    );
    yield* ctx.expectEqual(
      "the at-end sentinel is no longer the anchor",
      appended.itemIndex < MESSAGE_ROWS + 1,
      true,
    );
    yield* ctx.expectNear(
      "the reader's last message keeps its pixel",
      yield* bottomFixedY(
        "the reader's last message still painted",
        `${bottomFixed}-row-${newerLast}`,
      ),
      READER_TOP,
      1,
    );
    yield* ctx.expectNear(
      "the page's first row takes the void's old top edge",
      yield* bottomFixedY(
        "the appended page's first row painted",
        `${bottomFixed}-row-${pageFirstId("append", 1)}`,
      ),
      VOID_TOP,
      1,
    );
    yield* ctx.expectEqual(
      "the correction asked for the page's first row at the void's top edge",
      yield* ctx.host.text(`${bottomFixed}-readout`),
      `pages=1 corrected=1 guarded=0 request=${MESSAGE_ROWS}:-${VOID_TOP}`,
    );

    // 9. Return to the end and load again: the sentinel rule applies a second
    //    time, so the correction is not a one-shot.
    yield* ctx.host.wheel(`${bottomFixed}-frame`, 0, -100000);
    yield* Effect.sleep(Duration.millis(250));
    yield* ctx.expectEqual(
      "a wheel returns the list to the at-end sentinel",
      (yield* anchorOf("the returned list reports its anchor", bottomFixed))
        .itemIndex,
      MESSAGE_ROWS + PAGE_ROWS + 1,
    );
    yield* ctx.expectNear(
      "the trailing void is back at the bottom edge",
      yield* bottomFixedY(
        "the trailing void painted again",
        `${bottomFixed}-void`,
      ),
      VOID_TOP,
      1,
    );
    yield* load(bottomFixed);
    yield* ctx.expectNear(
      "the second page pins the row that was above the void",
      yield* bottomFixedY(
        "the row above the void painted",
        `${bottomFixed}-row-${newerLast + PAGE_ROWS}`,
      ),
      READER_TOP,
      1,
    );
    yield* ctx.expectNear(
      "the second page's first row takes the void's old top edge",
      yield* bottomFixedY(
        "the second page's first row painted",
        `${bottomFixed}-row-${pageFirstId("append", 2)}`,
      ),
      VOID_TOP,
      1,
    );
    yield* ctx.expectEqual(
      "the app corrected both arrivals at the bottom edge",
      yield* ctx.host.text(`${bottomFixed}-readout`),
      `pages=2 corrected=2 guarded=0 request=${MESSAGE_ROWS + PAGE_ROWS}:-${VOID_TOP}`,
    );

    yield* ctx.host.capture("loading-row-corrected");
  });

/** The fixed pane the resize probe lays its flexible region against. */
const RESIZE_SIDEBAR = 120;

/**
 * A `key=value` field out of a readout, or `-1` when the key is absent.
 *
 * A missing key must never read as `0`: the probe asserts that a width changed,
 * and `0` is a plausible stale width.
 */
const readoutNumber = (readout: string, key: string): number =>
  Option.getOrElse(
    pipe(
      Str.match(new RegExp(`${key}=(-?\\d+)`))(readout),
      Option.flatMap((match) => Option.fromNullishOr(match[1])),
      Option.map((digits) => Number.parseInt(digits, 10)),
    ),
    () => -1,
  );

/**
 * `window-resize-reflow` — the window an app is laid out in changes, and both
 * channels a panel has to it report the change.
 *
 * A workspace is resized by its user, not only by a sibling pane: a split's
 * `max` is the caller's number, and a sidebar, inspector or dock that re-clamps
 * only on `onLayout` still needs the window's own size to pass as that number.
 * Nothing had measured either channel. The renderer's `getWindowSize` is
 * documented as having once answered a hardcoded 800x600, and `useWindowSize()`
 * samples it every 100ms — no probe had read either against a real layout.
 *
 * The probe lays a 120px sidebar beside a flexible centre that fills the row,
 * then zooms the window through the only lever the binding exposes. A window
 * open at 900x520 is a user frame, so the platform's zoom takes it to its
 * standard frame and calling it again restores the user frame; the probe waits
 * for each frame before asserting, because the hook polls and the zoom animates.
 *
 * What it measures: the renderer's size is the box the layout occupies (the
 * sidebar plus centre equal it, so a constant would fail); the app's
 * `useWindowSize()` reports the same pair; zoom changes the size, the flexible
 * pane reflows to it and `onLayout` reports the new width; and the restore puts
 * both back.
 */
const WindowResizeProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const [centre, setCentre] = useState({ width: 0, reports: 0 });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        gap: 6,
      }}
    >
      <text
        testId="resize-window-readout"
        style={{
          ...textStyle(theme, "code"),
          color: theme.colors.mutedForeground,
        }}
      >
        {`w=${Math.round(window.width)} h=${Math.round(window.height)}`}
      </text>
      <div
        testId="resize-row"
        style={{
          display: "flex",
          width: "100%",
          flexGrow: 1,
          minHeight: 0,
        }}
      >
        <div
          testId="resize-sidebar"
          style={{
            width: RESIZE_SIDEBAR,
            flexShrink: 0,
            backgroundColor: theme.colors.muted,
          }}
        />
        <div
          testId="resize-centre"
          onLayout={(payload) =>
            setCentre((current) => ({
              width: Math.round(payload.width ?? current.width),
              reports: current.reports + 1,
            }))
          }
          style={{ flexGrow: 1, backgroundColor: theme.colors.card }}
        />
      </div>
      <text
        testId="resize-centre-readout"
        style={{
          ...textStyle(theme, "code"),
          color: theme.colors.mutedForeground,
        }}
      >
        {`w=${centre.width} reports=${centre.reports}`}
      </text>
    </div>
  );
};

const windowResizeSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    /** The app's own read of the window, as its readout prints it. */
    const appSize = () =>
      Effect.map(ctx.host.text("resize-window-readout"), (readout) => ({
        width: readoutNumber(readout, "w"),
        height: readoutNumber(readout, "h"),
      }));
    /** The centre pane's `onLayout` count and last reported width. */
    const centreReport = () =>
      Effect.map(ctx.host.text("resize-centre-readout"), (readout) => ({
        width: readoutNumber(readout, "w"),
        reports: readoutNumber(readout, "reports"),
      }));
    /** The centre pane's painted box. */
    const centreBounds = () =>
      Effect.flatMap(
        Effect.map(ctx.host.bounds("resize-centre"), Option.fromNullishOr),
        (bounds) => ctx.expectSome("the centre pane painted", bounds),
      );
    /**
     * The window's size after a zoom has settled in **both** channels.
     *
     * `zoomWindow` is animated and the app's hook polls every 100ms, so a single
     * frame after the call proves neither. The helper samples until the
     * renderer's box changed and `useWindowSize` names it, then returns the
     * renderer's size; a timeout returns what it last read so the assertion
     * reports the number the app actually shows.
     */
    const settledSize = (previous: Smoke.Size) => {
      const poll = (
        tries: number,
      ): Effect.Effect<Smoke.Size, Smoke.SmokeHostError> =>
        Effect.gen(function* () {
          const size = yield* ctx.host.windowSize();
          const app = yield* appSize();
          const followed =
            size.width !== previous.width &&
            app.width === Math.round(size.width) &&
            app.height === Math.round(size.height);
          if (followed || tries <= 0) return size;
          yield* Effect.sleep(Duration.millis(80));
          return yield* poll(tries - 1);
        });
      return poll(12);
    };

    // 1. The renderer's size is a real box and the app reads the same one.
    const size = yield* ctx.host.windowSize();
    const app = yield* appSize();
    yield* ctx.expectEqual(
      "the renderer reports a positive paintable width",
      size.width > 0,
      true,
    );
    yield* ctx.expectEqual(
      "useWindowSize reads the renderer's width",
      app.width,
      Math.round(size.width),
    );
    yield* ctx.expectEqual(
      "useWindowSize reads the renderer's height",
      app.height,
      Math.round(size.height),
    );

    // 2. That number is the box the layout occupies, not a constant: the row
    //    fills it and the flexible pane takes what the sidebar leaves.
    const centre = yield* centreBounds();
    yield* ctx.expectNear(
      "the sidebar plus the centre fill the window's width",
      RESIZE_SIDEBAR + centre.width,
      size.width,
      1,
    );
    yield* ctx.expectNear(
      "the centre is the painted box the onLayout report names",
      (yield* centreReport()).width,
      centre.width,
      1,
    );

    // 3. Zoom changes the window. The app's hook follows it, and the flexible
    //    pane reflows without the app writing a width.
    const reportsBefore = (yield* centreReport()).reports;
    yield* ctx.host.zoomWindow();
    const zoomed = yield* settledSize(size);
    yield* ctx.expectEqual(
      "the platform's zoom changes the window's width",
      zoomed.width !== size.width,
      true,
    );
    yield* ctx.expectEqual(
      "useWindowSize follows the zoomed width",
      (yield* appSize()).width,
      Math.round(zoomed.width),
    );
    const zoomedCentre = yield* centreBounds();
    yield* ctx.expectNear(
      "the flexible pane reflows to the zoomed window",
      RESIZE_SIDEBAR + zoomedCentre.width,
      zoomed.width,
      1,
    );
    const afterZoom = yield* centreReport();
    yield* ctx.expectNear(
      "the pane's layout report is its reflowed box",
      afterZoom.width,
      zoomedCentre.width,
      1,
    );
    yield* ctx.expectEqual(
      "the window resize runs the pane's layout pass again",
      afterZoom.reports > reportsBefore,
      true,
    );
    yield* ctx.host.capture("window-zoomed");

    // 4. Zoom back: the window returns to the size it opened at, and so does
    //    the layout. The probe leaves the window as it found it for the probes
    //    that ran before it and for the next run.
    yield* ctx.host.zoomWindow();
    const restored = yield* settledSize(zoomed);
    yield* ctx.expectNear(
      "zooming back restores the window it opened at",
      restored.width,
      size.width,
      1,
    );
    const restoredCentre = yield* centreBounds();
    yield* ctx.expectNear(
      "the layout returns with the window",
      RESIZE_SIDEBAR + restoredCentre.width,
      restored.width,
      1,
    );
    yield* ctx.expectNear(
      "the restored width is what useWindowSize reports",
      (yield* appSize()).width,
      Math.round(restored.width),
      1,
    );
    yield* ctx.host.capture("window-restored");
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

/**
 * One table header cell that sorts by a press.
 *
 * It is the press target itself rather than a row above the table: a header that
 * only responds to a control beside it measures nothing about a table, and the
 * probe's press is hit-tested on the cell's painted centre.
 */
const TableHeaderCell = ({
  testId,
  label,
  width,
  onPress,
}: {
  readonly testId: string;
  readonly label: string;
  readonly width: number;
  readonly onPress: () => void;
}): ReactNode => {
  const theme = useTheme();
  return (
    <div
      testId={testId}
      role="button"
      tabIndex={0}
      onClick={onPress}
      style={{
        width,
        height: TABLE_HEADER_HEIGHT,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        paddingLeft: 6,
        borderBottomWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.muted,
        cursor: "pointer",
        hover: { backgroundColor: theme.colors.border },
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.foreground,
        }}
      >
        {label}
      </text>
    </div>
  );
};

/**
 * A Tier 3 table: a sortable header sibling above the row scroller, inside one
 * horizontal scroller.
 *
 * The composition is the one the headless `data-grid-fixed-header` and
 * `table-select-sort` scenarios measured. What a window adds is that a press is
 * hit-tested rather than a handler invoked, a wheel is aimed by geometry, and a
 * key only reaches the element the press actually focused. Order and selection
 * are keyed by **record**, so a sort cannot leave the highlight on a different
 * row.
 */
const TableProbe = (): ReactNode => {
  const theme = useTheme();
  const windowSize = useWindowSize();
  const renderer = useGpuix().renderer;
  const [sort, setSort] = useState<TableSort>(TABLE_SORT);
  const [selected, setSelected] = useState(Option.none<number>());
  const elements = useRef(new Map<number, number>());

  const rows = sortTable(sort);
  const direction = sort.descending ? "desc" : "asc";
  const isSelected = (row: TableRow): boolean =>
    Option.contains(selected, row.n);
  const cell = {
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
    paddingLeft: 6,
    height: TABLE_ROW_HEIGHT,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  } as const;

  const register = useCallback((n: number, instance: PublicInstance | null) => {
    const map = elements.current;
    if (instance === null) map.delete(n);
    else map.set(n, instance.id);
  }, []);

  const focus = (n: number): void => {
    const elementId = elements.current.get(n);
    if (elementId !== undefined) renderer?.focusElement?.(elementId);
  };

  /** Moves selection and focus together, as a table's roving focus does. */
  const step = (row: TableRow, delta: number): void =>
    Option.match(
      Option.flatMap(
        Arr.findFirstIndex(rows, (candidate) => candidate.n === row.n),
        (index) => Arr.get(rows, index + delta),
      ),
      {
        onNone: () => undefined,
        onSome: (next) => {
          setSelected(Option.some(next.n));
          focus(next.n);
        },
      },
    );

  return (
    <div
      testId="table-probe"
      style={{
        width: windowSize.width,
        height: windowSize.height,
        padding: theme.spacing.xl,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.md,
        backgroundColor: theme.colors.background,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        Press a header to sort, press a row to select it, and use the arrows to
        walk the table.
      </text>
      <Readout testId="table-readout">
        {`rows=${TABLE_ROWS} sorted=${sortLabel(sort)} selected=${Option.match(
          selected,
          { onNone: () => "none", onSome: (n) => `r${n}` },
        )}`}
      </Readout>
      <div
        testId="table-hscroll"
        style={{
          width: TABLE_WIDTH,
          height: TABLE_HEADER_HEIGHT + TABLE_HEIGHT + 16,
          overflowX: "scroll",
          backgroundColor: theme.colors.card,
        }}
      >
        <div
          style={{
            width: COLUMN_WIDTH.name + COLUMN_WIDTH.status + COLUMN_WIDTH.size,
            height: "100%",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            testId="table-header"
            style={{
              display: "flex",
              flexDirection: "row",
              height: TABLE_HEADER_HEIGHT,
              backgroundColor: theme.colors.muted,
            }}
          >
            <TableHeaderCell
              testId="table-header-name"
              label={sort.column === "name" ? `name ${direction}` : "name"}
              width={COLUMN_WIDTH.name}
              onPress={() => setSort((current) => toggleSort(current, "name"))}
            />
            <TableHeaderCell
              testId="table-header-size"
              label={sort.column === "size" ? `size ${direction}` : "size"}
              width={COLUMN_WIDTH.size}
              onPress={() => setSort((current) => toggleSort(current, "size"))}
            />
            <div
              testId="table-header-status"
              style={{
                width: COLUMN_WIDTH.status,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                paddingLeft: 6,
                borderBottomWidth: 1,
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.muted,
              }}
            >
              <text
                style={{
                  ...textStyle(theme, "caption"),
                  color: theme.colors.mutedForeground,
                }}
              >
                status
              </text>
            </div>
          </div>
          <div
            testId="table-body"
            style={{ height: TABLE_HEIGHT, overflowY: "scroll" }}
          >
            {rows.map((row, index) => (
              <div
                key={row.n}
                testId={`table-row-${index}`}
                ref={(instance: PublicInstance | null) =>
                  register(row.n, instance)
                }
                tabIndex={0}
                role="row"
                aria-selected={isSelected(row)}
                onClick={() => setSelected(Option.some(row.n))}
                onKeyDown={(event) => {
                  const delta =
                    event.key === "down" ? 1 : event.key === "up" ? -1 : 0;
                  if (delta !== 0) step(row, delta);
                }}
                style={{
                  display: "flex",
                  flexDirection: "row",
                  height: TABLE_ROW_HEIGHT,
                  flexShrink: 0,
                  backgroundColor: isSelected(row)
                    ? theme.colors.accent
                    : index % 2 === 0
                      ? theme.colors.background
                      : theme.colors.card,
                  hover: { backgroundColor: theme.colors.muted },
                  ...keyboardFocusRing(theme),
                }}
              >
                <div style={{ ...cell, width: COLUMN_WIDTH.name }}>
                  <text
                    testId={`table-name-${index}`}
                    style={{
                      ...textStyle(theme, "body"),
                      color: isSelected(row)
                        ? theme.colors.accentForeground
                        : theme.colors.foreground,
                    }}
                  >
                    {row.name}
                  </text>
                </div>
                <div
                  testId={`table-size-${index}`}
                  style={{ ...cell, width: COLUMN_WIDTH.size }}
                >
                  <text
                    style={{
                      ...textStyle(theme, "caption"),
                      color: theme.colors.mutedForeground,
                    }}
                  >
                    {`${row.size} B`}
                  </text>
                </div>
                <div style={{ ...cell, width: COLUMN_WIDTH.status }}>
                  <text
                    style={{
                      ...textStyle(theme, "caption"),
                      color: theme.colors.mutedForeground,
                    }}
                  >
                    {row.status}
                  </text>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * The table probe's checks.
 *
 * A press is a hit test in a window: the locator aims the element's painted
 * centre, so a header cell that is covered, clipped or misaligned sorts nothing.
 * The readout names the order and the selected **record**, which is what makes
 * "the selection survived the sort" a check rather than a coincidence.
 */
const tableLifecycleSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("table-readout");
    yield* Effect.sleep(SETTLE);

    const readout = () => ctx.host.text("table-readout");
    const nameAt = (index: number) => ctx.host.text(`table-name-${index}`);
    const offsetOf: (
      testId: string,
    ) => Effect.Effect<
      Smoke.Offset,
      Smoke.SmokeAssertionError | Smoke.SmokeHostError
    > = (testId) =>
      Effect.gen(function* () {
        return yield* ctx.expectSome(
          `${testId} reports a scroll offset`,
          Option.fromNullishOr(yield* ctx.host.scrollOffset(testId)),
        );
      });
    /** The focus id as a readout reads it: `none` rather than a null. */
    const focusOf = Effect.map(ctx.host.focused(), (id) =>
      Option.getOrElse(Option.fromNullishOr(id), () => "none"),
    );

    yield* ctx.expectEqual(
      "the table mounts in name order with nothing selected",
      yield* readout(),
      "rows=60 sorted=name-asc selected=none",
    );

    // The header is a sibling of the row scroller, so it cannot scroll with the
    // rows: the first row starts where the header ends.
    const header = yield* paintedBox(ctx, "table-header");
    const first = yield* paintedBox(ctx, "table-row-0");
    yield* ctx.expectNear(
      "the first row starts below the header",
      first.y,
      header.y + header.height,
      1,
    );

    // 1. A press selects the row it landed on, and that row holds the focus.
    yield* ctx.host.click("table-row-3");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "a press selects the row it hit",
      yield* readout(),
      "selected=r3",
    );
    yield* ctx.expectEqual(
      "the pressed row took the focus",
      yield* focusOf,
      "table-row-3",
    );

    // 2. An arrow key reaches the focused row and roves both focus and selection.
    yield* ctx.host.key("down");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "down moves the selection one record on",
      yield* readout(),
      "selected=r4",
    );
    yield* ctx.expectEqual(
      "down moves the focus with it",
      yield* focusOf,
      "table-row-4",
    );

    // 3. A press on the size header sorts by the column it hit, not by the other.
    yield* ctx.host.click("table-header-size");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "a press on the size header sorts by size",
      yield* readout(),
      "sorted=size-asc",
    );
    yield* ctx.expectEqual(
      "the smallest row paints first",
      yield* nameAt(0),
      "Item 005",
    );
    yield* ctx.expectContains(
      "the selection is a record, so it survives the sort",
      yield* readout(),
      "selected=r4",
    );

    // 4. The same header again flips the direction.
    yield* ctx.host.click("table-header-size");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "a second press flips the column it is on",
      yield* readout(),
      "sorted=size-desc",
    );
    yield* ctx.expectEqual(
      "the largest row paints first",
      yield* nameAt(0),
      "Item 004",
    );

    // 5. A wheel over the rows scrolls them under a header that does not move.
    const headerBefore = yield* paintedBox(ctx, "table-header");
    const rowBefore = yield* paintedBox(ctx, "table-row-5");
    yield* ctx.host.wheel("table-body", 0, -100);
    yield* Effect.sleep(SETTLE);
    const scrolled = yield* offsetOf("table-body");
    yield* ctx.expectNear("the wheel scrolls the rows", scrolled.y, -100, 2);
    const headerAfter = yield* paintedBox(ctx, "table-header");
    yield* ctx.expectNear(
      "the header keeps its painted y",
      headerAfter.y,
      headerBefore.y,
      1,
    );
    const rowAfter = yield* paintedBox(ctx, "table-row-5");
    yield* ctx.expectNear(
      "the row moved up by the scroll amount",
      rowAfter.y - rowBefore.y,
      scrolled.y,
      2,
    );

    // 6. The header is outside the row scroller, so a wheel over it scrolls nothing.
    yield* ctx.host.wheel("table-header", 0, -100);
    yield* Effect.sleep(SETTLE);
    const afterHeaderWheel = yield* offsetOf("table-body");
    yield* ctx.expectNear(
      "a wheel over the header leaves the rows where they are",
      afterHeaderWheel.y,
      scrolled.y,
      1,
    );

    // 7. One horizontal scroller carries the header and the cells together.
    const headerCellBefore = yield* paintedBox(ctx, "table-header-size");
    const sizeCellBefore = yield* paintedBox(ctx, "table-size-5");
    yield* ctx.host.wheel("table-header", -60, 0);
    yield* Effect.sleep(SETTLE);
    const panned = yield* offsetOf("table-hscroll");
    yield* ctx.expectNear(
      "a horizontal wheel pans the table",
      panned.x,
      -60,
      2,
    );
    const headerCellAfter = yield* paintedBox(ctx, "table-header-size");
    const sizeCellAfter = yield* paintedBox(ctx, "table-size-5");
    yield* ctx.expectNear(
      "the header cell moved with the pan",
      headerCellAfter.x - headerCellBefore.x,
      panned.x,
      2,
    );
    yield* ctx.expectNear(
      "the row's cell moved by the same amount",
      sizeCellAfter.x - sizeCellBefore.x,
      panned.x,
      2,
    );
    yield* ctx.expectEqual(
      "the header and the row stay aligned after the pan",
      headerCellAfter.x,
      sizeCellAfter.x,
    );

    // 8. The rows stop at the content's end.
    yield* ctx.host.wheel("table-body", 0, -10_000);
    yield* Effect.sleep(SETTLE);
    const clamped = yield* offsetOf("table-body");
    yield* ctx.expectNear(
      "the rows clamp at the content's end",
      clamped.y,
      -TABLE_Y_RANGE,
      2,
    );
    yield* ctx.host.capture("table-sorted");
  });

/** The frozen-column probe's geometry: two panes, one row height. */
const FROZEN_ROWS = 60;
const FROZEN_ROW_HEIGHT = 28;
const FROZEN_WIDTH = 120;
const FROZEN_BODY_WIDTH = 240;
const FROZEN_VIEWPORT = 240;
const FROZEN_CELL_WIDTH = 200;
/** `rows × height - viewport`: the offset both panes clamp at. */
const FROZEN_MAX = FROZEN_ROWS * FROZEN_ROW_HEIGHT - FROZEN_VIEWPORT;
const FROZEN_ROW_INDEXES = Arr.range(0, FROZEN_ROWS - 1);

/**
 * A frozen first column beside a grid, in a window.
 *
 * The runtime has no `position: "sticky"`, so a frozen column is two vertical
 * scrollers that must move as one: each `onScrollChange` mirrors its `y` into
 * the other through `renderer.scrollTo`, guarded by a ref because a programmatic
 * scroll reports its own change inside the call. The headless
 * `data-grid-frozen-column` scenario measured the arithmetic; this probe asks
 * whether the mirror holds in a window, where the wheel is hit-tested and a
 * press selects through the painted cell.
 */
const FrozenColumnProbe = (): ReactNode => {
  const theme = useTheme();
  const windowSize = useWindowSize();
  const renderer = useGpuix().renderer;
  const frozen = useRef<PublicInstance | null>(null);
  const body = useRef<PublicInstance | null>(null);
  const syncing = useRef(false);
  const [selected, setSelected] = useState(Option.none<number>());

  const mirror =
    (target: "frozen" | "body") =>
    (event: EventPayload): void => {
      const elementId = (target === "frozen" ? frozen : body).current?.id;
      const y = event.scrollY;
      // The programmatic scroll paints synchronously, so the target's own change
      // arrives inside this call; the flag stops it mirroring back.
      if (elementId == null || y == null || syncing.current) return;
      syncing.current = true;
      renderer?.scrollTo?.(elementId, 0, y);
      syncing.current = false;
    };

  const rowStyle = (index: number) => ({
    display: "flex",
    height: FROZEN_ROW_HEIGHT,
    alignItems: "center",
    flexShrink: 0,
    backgroundColor: Option.contains(selected, index)
      ? theme.colors.accent
      : index % 2 === 0
        ? theme.colors.background
        : theme.colors.card,
    hover: { backgroundColor: theme.colors.muted },
  });

  return (
    <div
      testId="frozen-probe"
      style={{
        width: windowSize.width,
        height: windowSize.height,
        padding: theme.spacing.xl,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.md,
        backgroundColor: theme.colors.background,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        Two scrollers, one offset: either pane's wheel moves both, and the
        frozen column never pans.
      </text>
      <Readout testId="frozen-selected">
        {Option.match(selected, {
          onNone: () => "none",
          onSome: (n) => `r${n}`,
        })}
      </Readout>
      <div style={{ display: "flex", flexDirection: "row" }}>
        <div
          testId="frozen"
          ref={frozen}
          onScrollChange={mirror("body")}
          style={{
            width: FROZEN_WIDTH,
            height: FROZEN_VIEWPORT,
            overflowY: "scroll",
            backgroundColor: theme.colors.muted,
          }}
        >
          {FROZEN_ROW_INDEXES.map((index) => (
            <div
              key={index}
              testId={`frozen-row-${index}`}
              tabIndex={0}
              role="row"
              aria-selected={Option.contains(selected, index)}
              onClick={() => setSelected(Option.some(index))}
              style={rowStyle(index)}
            >
              <text style={{ color: theme.colors.foreground }}>
                {`F${index}`}
              </text>
            </div>
          ))}
        </div>
        <div
          testId="frozen-body"
          ref={body}
          onScrollChange={mirror("frozen")}
          style={{
            width: FROZEN_BODY_WIDTH,
            height: FROZEN_VIEWPORT,
            overflowY: "scroll",
            overflowX: "scroll",
            backgroundColor: theme.colors.card,
          }}
        >
          {FROZEN_ROW_INDEXES.map((index) => (
            <div
              key={index}
              testId={`frozen-body-row-${index}`}
              style={{ ...rowStyle(index), width: FROZEN_CELL_WIDTH * 3 }}
            >
              <div style={{ width: FROZEN_CELL_WIDTH, flexShrink: 0 }}>
                <text style={{ color: theme.colors.foreground }}>
                  {`B${index}`}
                </text>
              </div>
              <div style={{ width: FROZEN_CELL_WIDTH, flexShrink: 0 }}>
                <text style={{ color: theme.colors.mutedForeground }}>
                  {`C${index}`}
                </text>
              </div>
              <div style={{ width: FROZEN_CELL_WIDTH, flexShrink: 0 }}>
                <text style={{ color: theme.colors.mutedForeground }}>
                  {`D${index}`}
                </text>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * The frozen column's checks: both panes follow either wheel, the row under the
 * reader lines up across them, the frozen column ignores a horizontal pan, and a
 * frozen cell selects the row for the grid.
 */
const frozenColumnSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("frozen-selected");
    yield* Effect.sleep(SETTLE);

    const offsetOf = (testId: string) =>
      Effect.gen(function* () {
        return yield* ctx.expectSome(
          `${testId} reports a scroll offset`,
          Option.fromNullishOr(yield* ctx.host.scrollOffset(testId)),
        );
      });
    const yOf = (testId: string) =>
      Effect.map(paintedBox(ctx, testId), (bounds) => bounds.y);
    const xOf = (testId: string) =>
      Effect.map(paintedBox(ctx, testId), (bounds) => bounds.x);
    const paintedRows = Effect.map(ctx.host.paintedText(), (lines) =>
      Arr.filterMap(lines, (line) =>
        Option.match(Str.match(/^B(\d+)$/)(line), {
          onNone: () => Result.failVoid,
          onSome: (match) =>
            Option.match(Option.fromNullishOr(match[1]), {
              onNone: () => Result.failVoid,
              onSome: (digits) => Result.succeed(Number.parseInt(digits, 10)),
            }),
        }),
      ),
    );

    // 1. Both panes start at the top, and the first row lines up across them.
    yield* ctx.expectEqual(
      "the frozen column starts at the top",
      (yield* offsetOf("frozen")).y,
      0,
    );
    yield* ctx.expectEqual(
      "the grid starts at the top",
      (yield* offsetOf("frozen-body")).y,
      0,
    );
    yield* ctx.expectNear(
      "the first row sits at the same y in both panes",
      yield* yOf("frozen-row-0"),
      yield* yOf("frozen-body-row-0"),
      1,
    );

    // 2. A wheel over the grid moves both panes.
    yield* ctx.host.wheel("frozen-body", 0, -300);
    yield* Effect.sleep(SETTLE);
    const bodyAfterGrid = yield* offsetOf("frozen-body");
    yield* ctx.expectNear(
      "the grid follows the wheel",
      bodyAfterGrid.y,
      -300,
      2,
    );
    yield* ctx.expectNear(
      "the frozen column mirrors the grid in the same frame",
      (yield* offsetOf("frozen")).y,
      bodyAfterGrid.y,
      1,
    );

    // 3. A wheel over the frozen column moves both back: the mirror is two-way.
    yield* ctx.host.wheel("frozen", 0, -300);
    yield* Effect.sleep(SETTLE);
    const frozenAfterBoth = yield* offsetOf("frozen");
    yield* ctx.expectNear(
      "the frozen column's own wheel scrolls it",
      frozenAfterBoth.y,
      -600,
      2,
    );
    yield* ctx.expectNear(
      "the grid mirrors the frozen column",
      (yield* offsetOf("frozen-body")).y,
      frozenAfterBoth.y,
      1,
    );

    // 4. The row the reader is looking at lines up across the panes.
    const rows = yield* paintedRows;
    const row = yield* ctx.expectSome(
      "a row inside the scrolled window is painted",
      Arr.findFirst(rows, (value) => value >= 22 && value <= 25),
    );
    yield* ctx.expectNear(
      `row ${row} lines up between the frozen column and the grid`,
      yield* yOf(`frozen-row-${row}`),
      yield* yOf(`frozen-body-row-${row}`),
      1,
    );

    // 5. A horizontal wheel pans the grid's cells and leaves the frozen column.
    const frozenX = yield* xOf(`frozen-row-${row}`);
    const bodyX = yield* xOf(`frozen-body-row-${row}`);
    yield* ctx.host.wheel("frozen-body", -200, 0);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectNear(
      "a horizontal wheel pans the grid",
      (yield* offsetOf("frozen-body")).x,
      -200,
      2,
    );
    yield* ctx.expectNear(
      "the grid's row moved left with the pan",
      yield* xOf(`frozen-body-row-${row}`),
      bodyX - 200,
      2,
    );
    yield* ctx.expectNear(
      "the frozen column stayed where it was",
      yield* xOf(`frozen-row-${row}`),
      frozenX,
      1,
    );

    // 6. A frozen cell selects the row for the whole grid.
    yield* ctx.host.click(`frozen-row-${row}`);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a press on a frozen cell selects its row",
      yield* ctx.host.text("frozen-selected"),
      `r${row}`,
    );
    yield* ctx.host.capture("frozen-column");

    // 7. A huge wheel clamps both panes at the same end.
    yield* ctx.host.wheel("frozen-body", 0, -10_000);
    yield* Effect.sleep(SETTLE);
    const bodyEnd = yield* offsetOf("frozen-body");
    yield* ctx.expectNear(
      "the grid clamps at the content's end",
      bodyEnd.y,
      -FROZEN_MAX,
      2,
    );
    yield* ctx.expectNear(
      "the frozen column clamps with it",
      (yield* offsetOf("frozen")).y,
      bodyEnd.y,
      1,
    );
  });

/**
 * `dock-focus-lifecycle` — what a keyboard reaches inside a nested dock.
 *
 * Tier 4's **keyboard navigation** is the one capability with no measurement:
 * a dock is a rail, a collapsible sidebar and a pane inside one layout, and the
 * questions a plan needs answered are which controls a Tab traversal visits and
 * in what order, what a collapsed sidebar's controls do to that traversal, and
 * what a key pressed in the pane's field does to the rail. The fixture is
 * composed by hand — the shipped `Tabs` already owns roving focus
 * (`tabs-lifecycle`), and this is the layer above it.
 */
const DockFocusProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const renderer = useGpuix().renderer;
  const railIds = useRef<Partial<Record<DockTab, number>>>({});
  const [tab, setTab] = useState<DockTab>("explorer");
  const [changes, setChanges] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [actions, setActions] = useState(0);

  const select = (next: DockTab) => {
    setTab(next);
    setChanges((count) => count + 1);
    const id = railIds.current[next];
    if (id !== undefined) renderer?.focusElement?.(id);
  };

  const actionStyle = {
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.muted,
    ...keyboardFocusRing(theme),
  } as const;

  return (
    <div
      testId="dock-probe"
      style={{
        width: window.width,
        height: window.height,
        padding: theme.spacing.xl,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.md,
        backgroundColor: theme.colors.background,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        A Tab traversal walks the dock: toggle, sidebar, the selected tab, its
        field, the status bar.
      </text>
      <Readout testId="dock-readout">{`tab=${tab} changes=${changes} sidebar=${
        sidebarOpen ? "open" : "closed"
      } actions=${actions}`}</Readout>
      <div
        testId={DOCK_TOGGLE}
        tabIndex={0}
        role="button"
        aria-expanded={sidebarOpen}
        onClick={() => setSidebarOpen((open) => !open)}
        style={{ ...actionStyle, alignSelf: "start" }}
      >
        <text style={{ color: theme.colors.foreground }}>
          {sidebarOpen ? "hide sidebar" : "show sidebar"}
        </text>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: theme.spacing.md,
          flexGrow: 1,
        }}
      >
        <div
          testId="dock-sidebar"
          style={{
            width: sidebarOpen ? DOCK_SIDEBAR_WIDTH : 0,
            flexShrink: 0,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            gap: theme.spacing.xs,
            backgroundColor: theme.colors.card,
          }}
        >
          {(["new", "settings"] as const).map((action) => (
            <div
              key={action}
              testId={dockActionId(action)}
              // The guard a dock owes: a control in a closed pane leaves the
              // traversal. `new` keeps its stop on purpose — the probe measures
              // the runtime with it.
              tabIndex={sidebarOpen || action !== DOCK_GUARDED_ACTION ? 0 : -1}
              role="button"
              onClick={() => setActions((count) => count + 1)}
              style={actionStyle}
            >
              <text style={{ color: theme.colors.foreground }}>{action}</text>
            </div>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: theme.spacing.sm,
            flexGrow: 1,
          }}
        >
          <div
            testId="dock-rail"
            role="tablist"
            style={{ display: "flex", flexDirection: "row", gap: 4 }}
          >
            {DOCK_TABS.map((value) => (
              <div
                key={value}
                testId={dockRailId(value)}
                ref={(instance) => {
                  railIds.current[value] = instance?.id;
                }}
                role="tab"
                aria-selected={tab === value}
                tabIndex={tab === value ? 0 : -1}
                onClick={() => select(value)}
                onKeyDown={(event: EventPayload) => {
                  if (event.key === "right") select(stepTab(value, 1));
                  if (event.key === "left") select(stepTab(value, -1));
                }}
                style={{
                  padding: theme.spacing.sm,
                  borderRadius: theme.radius.sm,
                  backgroundColor:
                    tab === value ? theme.colors.accent : theme.colors.muted,
                  ...keyboardFocusRing(theme),
                }}
              >
                <text
                  style={{
                    color:
                      tab === value
                        ? theme.colors.accentForeground
                        : theme.colors.foreground,
                  }}
                >
                  {value}
                </text>
              </div>
            ))}
          </div>
          <div
            testId={dockPaneId(tab)}
            role="tabpanel"
            style={{
              padding: theme.spacing.md,
              borderWidth: theme.borderWidth.thin,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.card,
              display: "flex",
              flexDirection: "column",
              gap: theme.spacing.sm,
            }}
          >
            <text
              style={{
                ...textStyle(theme, "body"),
                color: theme.colors.foreground,
              }}
            >
              {`${tab} pane`}
            </text>
            <input
              testId={dockFieldId(tab)}
              style={{
                width: 240,
                height: 24,
                borderWidth: theme.borderWidth.thin,
                borderColor: theme.colors.borderStrong,
                color: theme.colors.inputForeground,
                backgroundColor: theme.colors.input,
                padding: theme.spacing.xs,
              }}
            />
          </div>
        </div>
      </div>
      <div
        testId={DOCK_STATUS}
        tabIndex={0}
        role="button"
        style={{ ...actionStyle, alignSelf: "start" }}
      >
        <text style={{ color: theme.colors.mutedForeground }}>
          ready · 0 problems
        </text>
      </div>
    </div>
  );
};

/**
 * The dock's checks: the traversal's order, a closed sidebar's unguarded
 * control still being reached while its guarded one is skipped, the rail
 * stepping focus with its panes, and a field keeping its own arrows.
 */
const dockFocusSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("dock-probe");
    yield* Effect.sleep(SETTLE);

    const readout = () => ctx.host.text("dock-readout");
    /** An element's painted width; an unpainted one is zero. */
    const widthOf = (testId: string) =>
      Effect.map(ctx.host.bounds(testId), (bounds) =>
        Option.match(Option.fromNullishOr(bounds), {
          onNone: () => 0,
          onSome: (value) => value.width,
        }),
      );
    /** Press Tab `count` times, reading the focus each press left behind. */
    const tabThrough = (count: number) =>
      Effect.forEach(
        Arr.range(1, count),
        () => Effect.flatMap(ctx.host.key("tab"), () => focusedAfterPaint(ctx)),
        { concurrency: 1 },
      );

    yield* ctx.expectContains(
      "the dock opens on its first document with the sidebar open",
      yield* readout(),
      "tab=explorer changes=0 sidebar=open",
    );

    // 1. The open dock's traversal, from the toggle through to the status bar.
    yield* ctx.host.focusElement(DOCK_TOGGLE);
    yield* ctx.expectEqual(
      "the sidebar toggle takes the focus",
      yield* focusedAfterPaint(ctx),
      DOCK_TOGGLE,
    );
    const openStops = dockStops(true, "explorer");
    const walked = yield* tabThrough(Arr.length(openStops));
    yield* ctx.expectEqual(
      "a Tab traversal visits the dock's stops in tree order, wrapping at the end",
      Arr.join(walked, " > "),
      Arr.join(Arr.append(Arr.drop(openStops, 1), DOCK_TOGGLE), " > "),
    );

    // 2. A collapsed sidebar paints no width...
    yield* ctx.host.click(DOCK_TOGGLE);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "the toggle closes the sidebar",
      yield* readout(),
      "sidebar=closed",
    );
    yield* ctx.expectNear(
      "the closed sidebar paints no width",
      yield* widthOf("dock-sidebar"),
      0,
      0.5,
    );

    // 3. ...but the control without a guard keeps its stop, which is the rule
    //    a dock has to apply itself: the runtime does not skip it.
    yield* ctx.host.focusElement(DOCK_TOGGLE);
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.key("tab");
    yield* ctx.expectEqual(
      "an unguarded control in a closed sidebar keeps its tab stop",
      yield* focusedAfterPaint(ctx),
      dockActionId("new"),
    );
    const hiddenWidth = yield* widthOf(dockActionId("new"));
    yield* ctx.expectNear(
      "a control inside the closed sidebar still reports its own 12px box",
      hiddenWidth,
      12,
      1,
    );
    yield* ctx.host.key("tab");
    yield* ctx.expectEqual(
      "the guarded control is skipped by the same traversal",
      yield* focusedAfterPaint(ctx),
      dockRailId("explorer"),
    );
    yield* ctx.host.click(dockActionId("new"));
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "a press on the clipped control does not reach it, though the keyboard did",
      yield* readout(),
      "actions=0",
    );

    // 4. Programmatic focus still lands in the hidden sidebar.
    yield* ctx.host.focusElement(dockActionId("new"));
    yield* ctx.expectEqual(
      "the runtime focuses a control the app never shows",
      yield* focusedAfterPaint(ctx),
      dockActionId("new"),
    );

    // 5. Reopening restores the guarded stop.
    yield* ctx.host.click(DOCK_TOGGLE);
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.focusElement(DOCK_TOGGLE);
    yield* ctx.host.key("tab");
    yield* ctx.host.key("tab");
    yield* ctx.expectEqual(
      "reopening the sidebar restores the guarded stop",
      yield* focusedAfterPaint(ctx),
      dockActionId("settings"),
    );

    // 6. A rail step moves real focus and swaps the pane.
    yield* ctx.host.focusElement(dockRailId("explorer"));
    yield* ctx.host.key("right");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the rail moves focus to the next document",
      yield* focusedAfterPaint(ctx),
      dockRailId("output"),
    );
    yield* ctx.expectContains(
      "the step changed the selected document",
      yield* readout(),
      "tab=output changes=1",
    );
    yield* ctx.expectEqual(
      "the previous document's field left the tree",
      Option.isNone(
        Option.fromNullishOr(yield* ctx.host.bounds(dockFieldId("explorer"))),
      ),
      true,
    );
    yield* ctx.expectSome(
      "the new document's field is painted",
      Option.fromNullishOr(yield* ctx.host.bounds(dockFieldId("output"))),
    );

    // 7. The pane's field is the rail's next stop.
    yield* ctx.host.key("tab");
    yield* ctx.expectEqual(
      "Tab from the rail reaches the pane's field",
      yield* focusedAfterPaint(ctx),
      dockFieldId("output"),
    );

    // 8. An arrow in the field belongs to the field, not the rail.
    yield* ctx.host.key("left");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "an arrow in a field keeps the focus there",
      yield* focusedAfterPaint(ctx),
      dockFieldId("output"),
    );
    yield* ctx.expectContains(
      "…and does not switch the document",
      yield* readout(),
      "tab=output changes=1",
    );

    // 9. Shift+Tab walks back out, and the rail steps back with it.
    yield* ctx.host.key("shift-tab");
    yield* ctx.expectEqual(
      "Shift+Tab returns to the rail",
      yield* focusedAfterPaint(ctx),
      dockRailId("output"),
    );
    yield* ctx.host.key("left");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the rail steps back and focus follows",
      yield* focusedAfterPaint(ctx),
      dockRailId("explorer"),
    );
    yield* ctx.expectContains(
      "the step back selected the first document again",
      yield* readout(),
      "tab=explorer changes=2",
    );
    yield* ctx.host.key("tab");
    yield* ctx.expectEqual(
      "the restored document's field is reachable",
      yield* focusedAfterPaint(ctx),
      dockFieldId("explorer"),
    );

    // 10. The rail wraps in the direction it was given.
    yield* ctx.host.focusElement(dockRailId("explorer"));
    yield* ctx.host.key("left");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the rail wraps to the last document",
      yield* focusedAfterPaint(ctx),
      dockRailId("problems"),
    );
    yield* ctx.expectContains(
      "…and selects it",
      yield* readout(),
      "tab=problems changes=3",
    );
    yield* ctx.host.capture("dock-focus");
  });

/**
 * `header-menu-lifecycle` — a column menu anchored **inside a scrolled header**.
 *
 * Tier 3's column-configuration row is `?`, and the half that decides whether
 * it is buildable is the overlay: the trigger sits in a horizontally scrolled
 * header, whose offset is a paint-level value. The probe opens the shipped
 * `DropdownMenu` from that trigger, then wheels the header and asks whether the
 * painted panel moved with its anchor, dismisses it and reopens it by keyboard,
 * and hides a column from the menu.
 */
const HeaderMenuProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const [hidden, setHidden] = useState<ReadonlyArray<HeaderColumn["id"]>>([]);
  const [changes, setChanges] = useState(0);

  const toggle = (id: HeaderColumn["id"]) => {
    setHidden((current) => toggleHidden(current, id));
    setChanges((count) => count + 1);
  };

  const visible = Arr.filter(
    HEADER_COLUMNS,
    (column) => !Arr.contains(hidden, column.id),
  );
  const renderCell = (column: HeaderColumn) => (
    <div
      key={column.id}
      testId={headerCellId(column.id)}
      style={{
        width: column.width,
        flexShrink: 0,
        padding: 6,
        borderBottomWidth: theme.borderWidth.thin,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.card,
      }}
    >
      <text style={{ color: theme.colors.mutedForeground }}>
        {column.label}
      </text>
    </div>
  );

  return (
    <div
      testId="header-probe"
      style={{
        width: window.width,
        height: window.height,
        padding: theme.spacing.xl,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.md,
        backgroundColor: theme.colors.background,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        A column menu anchored in a scrolled header: does the panel follow the
        wheel?
      </text>
      <Readout testId="header-readout">{`hidden=${
        Arr.isReadonlyArrayNonEmpty(hidden) ? Arr.join(hidden, "+") : "none"
      } changes=${changes}`}</Readout>
      <div
        testId={HEADER_FRAME}
        style={{
          width: HEADER_FRAME_WIDTH,
          overflowX: "scroll",
          backgroundColor: theme.colors.card,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            width: headerContentWidth(hidden),
          }}
        >
          {Arr.filter(
            visible,
            (column) => column.id === HEADER_TRIGGER_AFTER,
          ).map(renderCell)}
          <div
            testId={HEADER_TRIGGER_CELL}
            style={{
              width: HEADER_TRIGGER_WIDTH,
              flexShrink: 0,
              padding: 6,
              borderBottomWidth: theme.borderWidth.thin,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.card,
            }}
          >
            <DropdownMenu>
              <DropdownMenuTrigger testId={HEADER_TRIGGER}>
                columns…
              </DropdownMenuTrigger>
              <DropdownMenuContent label="Columns" testId="header-menu">
                {Arr.map(Arr.reverse(HEADER_COLUMNS), (column) => (
                  <DropdownMenuItem
                    key={column.id}
                    testId={`header-menu-item-${column.id}`}
                    onSelect={() => toggle(column.id)}
                  >
                    {column.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {Arr.filter(
            visible,
            (column) => column.id !== HEADER_TRIGGER_AFTER,
          ).map(renderCell)}
        </div>
      </div>
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        the header is one scroller; the rows are a sibling, as a table has them
      </text>
    </div>
  );
};

/**
 * The menu's checks: it opens under its anchor inside the scroller, the panel
 * follows (or does not follow) the header's wheel, Escape returns the focus,
 * and the first item hides a column without moving the anchor.
 */
const headerMenuSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("header-probe");
    yield* Effect.sleep(SETTLE);

    const readout = () => ctx.host.text("header-readout");
    const box = (testId: string) => settledBox(ctx, testId);

    yield* ctx.expectContains(
      "the header starts with every column visible",
      yield* readout(),
      "hidden=none changes=0",
    );

    // 1. The trigger's cell is the first column, then the header's own x.
    const nameCell = yield* box(headerCellId("name"));
    yield* ctx.expectNear(
      "the trigger cell starts where the name column ends",
      (yield* box(HEADER_TRIGGER_CELL)).x,
      nameCell.x + nameCell.width,
      1,
    );
    const trigger = yield* box(HEADER_TRIGGER);

    // 2. A press opens the menu under its anchor.
    yield* ctx.host.click(HEADER_TRIGGER);
    yield* Effect.sleep(SETTLE);
    const menu = yield* box("header-menu");
    yield* ctx.expectEqual(
      "the menu opens below the trigger's box",
      menu.y >= trigger.y + trigger.height,
      true,
    );
    yield* ctx.expectNear(
      "the menu starts from the trigger's own x",
      menu.x,
      trigger.x,
      2,
    );

    // 3. Wheel the header and read where the panel went.
    yield* ctx.host.wheel(HEADER_FRAME, -100, 0);
    yield* Effect.sleep(SETTLE);
    const triggerAfter = yield* box(HEADER_TRIGGER);
    const menuAfter = yield* box("header-menu");
    yield* ctx.expectNear(
      "the wheel moved the trigger with its column",
      triggerAfter.x,
      trigger.x - 100,
      2,
    );
    yield* ctx.expectNear(
      "the menu follows its anchor's wheel",
      menuAfter.x,
      menu.x - 100,
      2,
    );

    // 4. Escape dismisses it and returns the focus.
    yield* ctx.host.key("escape");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Escape unpaints the menu",
      yield* settleGone(ctx, "header-menu"),
      true,
    );
    yield* ctx.expectEqual(
      "Escape returns the focus to the trigger",
      yield* focusedAfterPaint(ctx),
      HEADER_TRIGGER,
    );

    // 5. Keyboard-open it and hide the last column from the first item.
    yield* ctx.host.wheel(HEADER_FRAME, 100, 0);
    yield* ctx.host.focusElement(HEADER_TRIGGER);
    yield* ctx.host.key("enter");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Enter opens the menu on its first item",
      yield* focusedAfterPaint(ctx),
      HEADER_FIRST_ITEM,
    );
    yield* ctx.host.key("enter");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "the first item hides its column",
      yield* readout(),
      "hidden=status changes=1",
    );
    yield* ctx.expectEqual(
      "the hidden column's header unpaints",
      yield* settleGone(ctx, headerCellId("status")),
      true,
    );
    yield* ctx.expectNear(
      "a column after the anchor does not move it",
      (yield* box(HEADER_TRIGGER)).x,
      trigger.x,
      1,
    );

    // 6. A press on the trigger still opens the menu after the relayout.
    yield* ctx.host.click(HEADER_TRIGGER);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a press still opens the menu after the header shrank",
      yield* settlePainted(ctx, "header-menu"),
      true,
    );
    yield* ctx.host.key("escape");
    yield* ctx.host.capture("header-menu");
  });

/**
 * One painted box in a window that is otherwise left to the window server.
 *
 * The paint is deliberately sparse: every pixel the app does not cover is the
 * backdrop under test, so the probe's own chrome would become the measurement.
 * The root carries no background for the same reason, and the children are
 * absolute because an absolute element resolves against its direct parent.
 */
const BackdropProbe = (): ReactNode => {
  const { background } = useWindowFacts();
  const window = useWindowSize();
  return (
    <div
      style={{
        width: window.width,
        height: window.height,
        position: "relative",
      }}
    >
      <div
        testId="backdrop-box"
        style={{
          position: "absolute",
          left: BACKDROP_BOX.x,
          top: BACKDROP_BOX.y,
          width: BACKDROP_BOX.width,
          height: BACKDROP_BOX.height,
          backgroundColor: BACKDROP_FILL,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: BACKDROP_BOX.x,
          top: BACKDROP_BOX.y + BACKDROP_BOX.height + 40,
        }}
      >
        <Readout testId="backdrop-mode">{background}</Readout>
      </div>
    </div>
  );
};

const backdropSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("backdrop-box");
    const mode = yield* ctx.expectSome(
      "the window names the backdrop it opened with",
      decodeWindowBackground(yield* ctx.host.text("backdrop-mode")),
    );
    yield* ctx.host.capture("backdrop");

    // A window is captured at its display's scale, so the fixture's logical
    // points are converted rather than assumed: a hardcoded 2 would read the
    // wrong pixel on a 1x display.
    const frame = yield* ctx.host.pixels("backdrop");
    const size = yield* ctx.host.windowSize();
    const scale = yield* ctx.expectSome(
      "the capture is the window at a whole device scale",
      captureScale(frame, size),
    );
    const at = (point: { readonly x: number; readonly y: number }) =>
      Option.fromNullishOr(Pixels.pixelAt(frame, point.x, point.y));

    yield* ctx.expectEqual(
      `${mode}: the box the app paints carries its fill`,
      Option.match(at(framePoint(contentPoint, scale)), {
        onNone: () => "outside the capture",
        onSome: describeColour,
      }),
      describeColour(BACKDROP_FILL_RGBA),
    );
    yield* ctx.expectEqual(
      `${mode}: the window's unpainted surface alpha`,
      Option.match(at(framePoint(backdropPoint(size), scale)), {
        onNone: () => "outside the capture",
        onSome: (colour) => colour.a,
      }),
      surfaceAlpha(mode),
    );
  });

/**
 * The chart probe: the same three-bar plot drawn into a pixel buffer, painted
 * again from a second buffer when the data changes, and pushed as SVG bytes.
 */
const ChartProbe = (): ReactNode => {
  const theme = useTheme();
  const bufferImage = useRef<ImgInstance>(null);
  const svgImage = useRef<ImgInstance>(null);
  const [frame, setFrame] = useState(1);
  const [svgStatus, setSvgStatus] = useState("pending");

  // The pixels must be on the element before the frame that paints it, and a
  // re-push has to be readable as the frame the data changed in.
  useLayoutEffect(() => {
    const instance = bufferImage.current;
    if (instance === null) return;
    instance.setImagePixels(
      PLOT.width,
      PLOT.height,
      Buffer.from(plotPixels(frame === 1 ? SERIES : REPLACEMENT)),
    );
  }, [frame]);

  useLayoutEffect(() => {
    const instance = svgImage.current;
    if (instance === null) return;
    // A layout effect is the boundary: the native decoder is an imperative call
    // that may throw, and there is no Effect runtime inside a render, so the
    // outcome is captured as the readout the probe asserts on.
    const decoded = Effect.try(() => instance.setImage(Buffer.from(PLOT_SVG)));
    setSvgStatus(
      Effect.runSync(
        Effect.match(decoded, {
          onFailure: (error) => `threw ${String(error)}`,
          onSuccess: () => "set",
        }),
      ),
    );
  }, []);

  const plot = (testId: string, ref: typeof bufferImage) => (
    <div
      style={{
        width: PLOT_SIZE.width,
        height: PLOT_SIZE.height,
        backgroundColor: hexOf(PLOT_BACKING),
      }}
    >
      <img
        testId={testId}
        ref={ref}
        alt="A three-series bar plot"
        objectFit="fill"
        style={{ width: PLOT_SIZE.width, height: PLOT_SIZE.height }}
      />
    </div>
  );

  return (
    <div
      testId="chart-probe"
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
        {plot("chart-buffer", bufferImage)}
        {plot("chart-svg", svgImage)}
      </div>
      <Toolbar>
        <Pressable testId="chart-next" onClick={() => setFrame(2)}>
          <text
            style={{
              ...textStyle(theme, "label"),
              color: theme.colors.foreground,
            }}
          >
            New data
          </text>
        </Pressable>
      </Toolbar>
      <Readout testId="chart-frame">{`frame=${frame}`}</Readout>
      <Readout testId="chart-svg-status">{`svg=${svgStatus}`}</Readout>
    </div>
  );
};

/** How many pixels of one decoded capture paint `colour` exactly. */
const chartCount = (frame: Pixels.Pixels, colour: Rgb): number =>
  Pixels.countColour(frame, new Pixels.Rgba({ ...colour, a: 0xff }));

/** One buffer pixel read out of the capture, named by the colour it landed on. */
const chartSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("chart-buffer");
    yield* ctx.host.capture("chart");
    const frame = yield* ctx.host.pixels("chart");
    const size = yield* ctx.host.windowSize();
    const scale = yield* ctx.expectSome(
      "the capture is the window at a whole device scale",
      captureScale(frame, size),
    );
    const box = (testId: string) =>
      Effect.flatMap(
        Effect.map(ctx.host.bounds(testId), Option.fromNullishOr),
        (bounds) =>
          ctx.expectSome(`the ${testId} plot occupies its box`, bounds),
      );
    const sample = (bounds: Box, pixel: { x: number; y: number }): string => {
      const point = framePoint(pointIn(bounds, pixel), scale);
      return Option.match(
        Option.fromNullishOr(Pixels.pixelAt(frame, point.x, point.y)),
        { onNone: () => "outside the capture", onSome: describeColour },
      );
    };
    const paints = (captured: Pixels.Pixels, colour: Rgb, label: string) =>
      ctx.expectEqual(label, chartCount(captured, colour) > 0, true);
    const absent = (captured: Pixels.Pixels, colour: Rgb, label: string) =>
      ctx.expectEqual(label, chartCount(captured, colour), 0);

    // 1. A buffer keeps its own per-pixel colours: the route a chart with more
    //    than one series needs, which a tinted `<svg>` cannot take.
    const buffer = yield* box("chart-buffer");
    yield* box("chart-svg");
    yield* Effect.forEach(
      SERIES,
      (colour, index) =>
        paints(frame, colour, `series ${index + 1} paints from the buffer`),
      { concurrency: 1 },
    );
    yield* ctx.expectEqual(
      "a bar's body reads its own series colour",
      sample(buffer, BAR_PIXEL),
      describeColour(new Pixels.Rgba({ ...SERIES[0], a: 0xff })),
    );

    // 2. A margin pixel is the card behind the plot, so the element composites
    //    its transparency instead of painting an opaque square.
    yield* ctx.expectEqual(
      "the plot's transparent margin shows the surface behind it",
      sample(buffer, MARGIN_PIXEL),
      describeColour(new Pixels.Rgba({ ...PLOT_BACKING, a: 0xff })),
    );

    // 3. `setImage` decodes SVG bytes: the vector route, with every fill its
    //    own colour rather than one mask tint.
    yield* ctx.expectEqual(
      "the svg bytes reached the element",
      yield* ctx.host.text("chart-svg-status"),
      "svg=set",
    );
    yield* Effect.forEach(
      VECTOR,
      (colour, index) =>
        paints(frame, colour, `vector series ${index + 1} paints its own fill`),
      { concurrency: 1 },
    );

    // 4. New data replaces the frame: a chart that only ever painted once would
    //    be a screenshot.
    yield* ctx.host.click("chart-next");
    yield* ctx.expectEqual(
      "the probe is on the frame the press produced",
      yield* settleUntil(
        ctx.host.text("chart-frame"),
        (value) => value === "frame=2",
      ),
      "frame=2",
    );
    yield* ctx.host.capture("chart-second");
    const updated = yield* ctx.host.pixels("chart-second");
    yield* Effect.forEach(
      REPLACEMENT,
      (colour, index) =>
        paints(
          updated,
          colour,
          `the updated series ${index + 1} paints from the second buffer`,
        ),
      { concurrency: 1 },
    );
    yield* Effect.forEach(
      SERIES,
      (colour, index) =>
        absent(
          updated,
          colour,
          `the first buffer's series ${index + 1} is gone`,
        ),
      { concurrency: 1 },
    );
  });

/**
 * The window-chrome probe: where the app's own layout starts, and what the
 * window reports as its safe area.
 */
const WindowChromeProbe = (): ReactNode => {
  const theme = useTheme();
  const facts = useWindowFacts();
  const { renderer } = useGpuix();
  const live = useWindowInsets();
  const [insets, setInsets] = useState<Option.Option<NativeWindowInsets>>(
    Option.none(),
  );

  // The renderer's own answer, read at mount: the hook samples every 100ms, so
  // the two channels are a fact about the app rather than the same read twice.
  useLayoutEffect(() => {
    setInsets(Option.fromNullishOr(renderer?.getWindowInsets?.()));
  }, [renderer]);

  const edge = (pick: (value: NativeWindowInsets) => Edges): ReactNode =>
    Option.match(insets, {
      onNone: () => "pending",
      onSome: (value) => formatEdges(pick(value)),
    });

  return (
    <div
      testId="chrome-probe"
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: theme.colors.background,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        testId="chrome-top-bar"
        style={{ height: BAR_HEIGHT, backgroundColor: hexOf(CHROME_FILL) }}
      />
      <div
        testId="chrome-safe-bar"
        style={{
          position: "absolute",
          top: Option.match(insets, {
            onNone: () => 0,
            onSome: (value) => value.effective.top,
          }),
          left: SAFE_BAR_X,
          right: 0,
          height: BAR_HEIGHT,
          backgroundColor: hexOf(SAFE_FILL),
        }}
      />
      <div
        style={{
          marginTop: BAR_HEIGHT * 3,
          padding: theme.spacing.lg,
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.sm,
        }}
      >
        <Readout testId="chrome-mode">{`titlebar=${facts.chrome}`}</Readout>
        <Readout testId="chrome-renderer-safe">
          {edge((value) => value.safeArea)}
        </Readout>
        <Readout testId="chrome-renderer-ime">
          {edge((value) => value.ime)}
        </Readout>
        <Readout testId="chrome-renderer-effective">
          {edge((value) => value.effective)}
        </Readout>
        <Readout testId="chrome-hook-safe">
          {formatEdges(live.safeArea)}
        </Readout>
      </div>
    </div>
  );
};

/** Where the app's own layout starts, and what the window reports as its safe area. */
const windowChromeSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("chrome-top-bar");
    const chrome = yield* ctx.expectSome(
      "the window names the titlebar it opened with",
      pipe(
        yield* ctx.host.text("chrome-mode"),
        Str.replace("titlebar=", ""),
        Schema.decodeUnknownOption(TitlebarChrome),
      ),
    );
    const edgesOf = (testId: string) =>
      Effect.gen(function* () {
        const text = yield* settleUntil(ctx.host.text(testId), (value) =>
          Option.isSome(decodeEdges(value)),
        );
        return yield* ctx.expectSome(
          `the ${testId} readout is four numbers`,
          decodeEdges(text),
        );
      });

    const safe = yield* edgesOf("chrome-renderer-safe");
    const ime = yield* edgesOf("chrome-renderer-ime");
    const effective = yield* edgesOf("chrome-renderer-effective");
    const hookSafe = yield* edgesOf("chrome-hook-safe");

    // 1. The app channel and the renderer answer for the same window: the hook
    //    samples every 100ms, so a mismatch is a lag, and the poll above is what
    //    a consumer's own inset code has to survive.
    yield* ctx.expectEqual(
      "the app channel reports the renderer's safe area",
      formatEdges(hookSafe),
      formatEdges(safe),
    );

    // 2. With no text session there is no keyboard inset, and the effective
    //    edges are the safe area itself — the composite an app insets by.
    yield* ctx.expectEqual(
      "the keyboard inset is empty without a text session",
      formatEdges(ime),
      "0,0,0,0",
    );
    yield* ctx.expectEqual(
      "the effective inset is the safe area while no keyboard is up",
      formatEdges(effective),
      formatEdges(safe),
    );

    // 3. A bar painted at `top: effective.top` starts exactly there, so the
    //    number a toolbar insets by is the number the app is given.
    const safeBar = yield* ctx.expectSome(
      "the inset bar painted",
      Option.fromNullishOr(yield* ctx.host.bounds("chrome-safe-bar")),
    );
    yield* ctx.expectNear(
      "a bar inset by the effective top starts there",
      safeBar.y,
      effective.top,
      1,
    );

    // 4. The app's layout starts at the capture's top edge, so the window's
    //    chrome is the app's to paint over — not something the runtime reserves.
    yield* ctx.host.capture("chrome");
    const frame = yield* ctx.host.pixels("chrome");
    const size = yield* ctx.host.windowSize();
    const scale = yield* ctx.expectSome(
      "the capture is the window at a whole device scale",
      captureScale(frame, size),
    );
    const point = framePoint(barPoint(0), scale);
    const insetPoint = framePoint(insetBarPoint(effective.top), scale);
    const at = (spot: { x: number; y: number }) =>
      Option.match(
        Option.fromNullishOr(Pixels.pixelAt(frame, spot.x, spot.y)),
        { onNone: () => "outside the capture", onSome: describeColour },
      );
    yield* ctx.expectEqual(
      "the app's own bar paints at the window's top edge",
      at(point),
      describeColour(new Pixels.Rgba({ ...CHROME_FILL, a: 0xff })),
    );
    yield* ctx.expectEqual(
      "the bar inset by the safe area paints where the inset puts it",
      at(insetPoint),
      describeColour(new Pixels.Rgba({ ...SAFE_FILL, a: 0xff })),
    );

    // 5. The safe area is the one the window reports, not a titlebar band: in
    //    both modes it is empty on this host, so a toolbar that draws under a
    //    transparent titlebar reserves its own inset — there is no reported
    //    number to read it from.
    yield* ctx.expectEqual(
      `${chrome}: the safe area the window reports`,
      formatEdges(safe),
      "0,0,0,0",
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
  "list-lifecycle": {
    id: "list-lifecycle",
    view: () => <ListProbe />,
    steps: listSteps,
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
  "surface-fade": {
    id: "surface-fade",
    view: () => <SurfaceFadeProbe />,
    steps: surfaceFadeSteps,
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
  "nested-scroll-lifecycle": {
    id: "nested-scroll-lifecycle",
    view: () => <NestedScrollProbe />,
    steps: nestedScrollSteps,
  },
  "message-scroller-lifecycle": {
    id: "message-scroller-lifecycle",
    view: () => <MessageScrollerProbe />,
    steps: messageScrollerSteps,
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
  "combobox-lifecycle": {
    id: "combobox-lifecycle",
    view: () => <ComboboxProbe />,
    steps: comboboxSteps,
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
  "loading-row-correction": {
    id: "loading-row-correction",
    view: () => <LoadingRowProbe />,
    steps: loadingRowSteps,
  },
  "window-resize-reflow": {
    id: "window-resize-reflow",
    view: () => <WindowResizeProbe />,
    steps: windowResizeSteps,
  },
  "drag-reorder": {
    id: "drag-reorder",
    view: () => <DragReorderProbe />,
    steps: dragReorderSteps,
  },
  "table-lifecycle": {
    id: "table-lifecycle",
    view: () => <TableProbe />,
    steps: tableLifecycleSteps,
  },
  "frozen-column-lifecycle": {
    id: "frozen-column-lifecycle",
    view: () => <FrozenColumnProbe />,
    steps: frozenColumnSteps,
  },
  "dock-focus-lifecycle": {
    id: "dock-focus-lifecycle",
    view: () => <DockFocusProbe />,
    steps: dockFocusSteps,
  },
  "header-menu-lifecycle": {
    id: "header-menu-lifecycle",
    view: () => <HeaderMenuProbe />,
    steps: headerMenuSteps,
  },
  "window-backdrop": {
    id: "window-backdrop",
    view: () => <BackdropProbe />,
    steps: backdropSteps,
  },
  "chart-raster": {
    id: "chart-raster",
    view: () => <ChartProbe />,
    steps: chartSteps,
  },
  "window-chrome": {
    id: "window-chrome",
    view: () => <WindowChromeProbe />,
    steps: windowChromeSteps,
  },
};
