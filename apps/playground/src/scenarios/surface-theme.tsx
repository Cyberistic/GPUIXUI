/**
 * `surface-theme` / `live-surface-theme`: does a token palette reach the native
 * content surfaces?
 *
 * Every `<markdown>`, `<code>` and `<diff>` mount in both registries is
 * theme-less, and the runtime's base is always `Theme::dark()` — so a preview
 * shipped in our light palette paints Comet's colours and no existing check
 * (bounds, painted text, authored style) can see it. This probe mounts the same
 * documents twice, themed and default, on one stage, and reads **one** decoded
 * frame per host: the A/B pair is in one paint, so a wrong theme cannot be
 * confused with a different capture.
 *
 * Measured facts and the deferred fields: plan `784` §5/§10. The two washes
 * (`codeWash`, `diffHunkBg`) and the hunk band's frame check: plan `816`.
 */
import { Duration, Effect } from "effect";
import type { ReactNode } from "react";
import { Pixels, Smoke } from "@gpuixui/testing";
import type { ThemeColors } from "@gpuixui/tokens";
import { palettes } from "../palettes.js";
import type { PlaygroundScenario } from "../types.js";
import {
  asHex,
  captureHeadless,
  captureLive,
  expectColour,
  paintedBox,
  parseColour,
  pixelAtPoint,
  readAsync,
  readSync,
  type FrameReader,
} from "./frames.js";
import { INK_TOLERANCE, inkEvidence, scanInk } from "./text-ink-model.js";
import {
  CODE_FONT_SIZE,
  CODE_LINE_HEIGHT,
  CODE_SAMPLE,
  DARK_INK_FLOOR,
  GUTTER_WIDTH,
  LIGHT_INK_CEILING,
  MD_APPEARANCE_SOURCE,
  MD_CODE_SOURCE,
  MD_LINK_SOURCE,
  MD_LIST_SOURCE,
  MD_TEXT_SOURCE,
  MIN_SURFACE_PIXELS,
  STAGE_HEIGHT,
  STAGE_ID,
  STAGE_WIDTH,
  SURFACE_PANEL_RECORD,
  SURFACE_PATCH,
  bulletPaint,
  bulletPoint,
  diffRowPoints,
  diffTint,
  hunkPaint,
  nativeContentTheme,
  scanDarkest,
} from "./surface-theme-model.js";

const theme = palettes.dark;
const themed = nativeContentTheme(theme);

/** One absolutely placed card; the child stretches to its content box. */
const Panel = ({
  panel,
  background,
  children,
}: {
  readonly panel: (typeof SURFACE_PANEL_RECORD)[keyof typeof SURFACE_PANEL_RECORD];
  readonly background: string;
  readonly children: ReactNode;
}) => (
  <div
    testId={panel.cardId}
    style={{
      position: "absolute",
      left: panel.left,
      top: panel.top,
      width: panel.width,
      height: panel.height,
      padding: 8,
      display: "flex",
      flexDirection: "column",
      backgroundColor: background,
    }}
  >
    {children}
  </div>
);

const SurfaceThemeProbe = () => (
  <div
    testId={STAGE_ID}
    style={{
      position: "relative",
      width: STAGE_WIDTH,
      height: STAGE_HEIGHT,
      backgroundColor: theme.colors.background,
    }}
  >
    <Panel
      panel={SURFACE_PANEL_RECORD["st-md-text"]}
      background={theme.colors.card}
    >
      <markdown testId="st-md-text" source={MD_TEXT_SOURCE} theme={themed} />
    </Panel>
    <Panel
      panel={SURFACE_PANEL_RECORD["st-md-text-default"]}
      background={theme.colors.card}
    >
      <markdown testId="st-md-text-default" source={MD_TEXT_SOURCE} />
    </Panel>
    <Panel
      panel={SURFACE_PANEL_RECORD["st-md-code"]}
      background={theme.colors.card}
    >
      <markdown testId="st-md-code" source={MD_CODE_SOURCE} theme={themed} />
    </Panel>
    <Panel
      panel={SURFACE_PANEL_RECORD["st-md-code-default"]}
      background={theme.colors.card}
    >
      <markdown testId="st-md-code-default" source={MD_CODE_SOURCE} />
    </Panel>
    <Panel
      panel={SURFACE_PANEL_RECORD["st-md-link"]}
      background={theme.colors.card}
    >
      <markdown testId="st-md-link" source={MD_LINK_SOURCE} theme={themed} />
    </Panel>
    <Panel
      panel={SURFACE_PANEL_RECORD["st-md-list"]}
      background={theme.colors.card}
    >
      <markdown testId="st-md-list" source={MD_LIST_SOURCE} theme={themed} />
    </Panel>
    <Panel
      panel={SURFACE_PANEL_RECORD["st-md-light"]}
      background={palettes.light.colors.card}
    >
      <markdown
        testId="st-md-light"
        source={MD_APPEARANCE_SOURCE}
        theme={{ appearance: "light" }}
      />
    </Panel>
    <Panel
      panel={SURFACE_PANEL_RECORD["st-md-dark"]}
      background={palettes.light.colors.card}
    >
      <markdown
        testId="st-md-dark"
        source={MD_APPEARANCE_SOURCE}
        theme={{ appearance: "dark" }}
      />
    </Panel>
    <Panel
      panel={SURFACE_PANEL_RECORD["st-code"]}
      background={theme.colors.card}
    >
      <code
        testId="st-code"
        code={CODE_SAMPLE}
        language="ts"
        showLineNumbers
        theme={themed}
        style={{ fontSize: CODE_FONT_SIZE, lineHeight: CODE_LINE_HEIGHT }}
      />
    </Panel>
    <Panel
      panel={SURFACE_PANEL_RECORD["st-code-default"]}
      background={theme.colors.card}
    >
      <code
        testId="st-code-default"
        code={CODE_SAMPLE}
        language="ts"
        showLineNumbers
        style={{ fontSize: CODE_FONT_SIZE, lineHeight: CODE_LINE_HEIGHT }}
      />
    </Panel>
    <Panel
      panel={SURFACE_PANEL_RECORD["st-diff"]}
      background={theme.colors.card}
    >
      <diff testId="st-diff" patch={SURFACE_PATCH} theme={themed} />
    </Panel>
  </div>
);

export const surfaceThemeView = (): ReactNode => <SurfaceThemeProbe />;

/** The one difference between the hosts: values or Effects, plus a settle. */
interface ThemeDriver<E> {
  readonly reader: FrameReader<E>;
  readonly capture: () => Effect.Effect<
    Pixels.Pixels,
    Smoke.SmokeAssertionError | E
  >;
}

const inkFailure = (
  label: string,
  expected: string,
  scan: {
    readonly near: number;
    readonly sampled: number;
    readonly closest: Pixels.Rgba;
  },
): Effect.Effect<void, Smoke.SmokeAssertionError> =>
  Effect.fail(
    new Smoke.SmokeAssertionError({
      label,
      expected,
      actual: `${scan.near}/${scan.sampled} pixels, closest ${asHex(scan.closest)}`,
    }),
  );

/** A scan of one element's box (or its leading band) for an exact token. */
const expectInk = <Host, E>(
  ctx: Smoke.SmokeContext<Host>,
  reader: FrameReader<E>,
  frame: Pixels.Pixels,
  testId: string,
  expected: Pixels.Rgba,
  label: string,
  options: { readonly band?: number; readonly minimum?: number } = {},
): Effect.Effect<void, Smoke.SmokeAssertionError | E> =>
  Effect.gen(function* () {
    const box = yield* paintedBox(ctx, reader, testId);
    const target =
      options.band === undefined ? box : { ...box, width: options.band };
    const scan = scanInk(
      frame,
      yield* reader.windowSize(),
      target,
      expected,
      INK_TOLERANCE,
    );
    const minimum = options.minimum ?? MIN_SURFACE_PIXELS;
    const ok = minimum === 0 ? scan.near === 0 : inkEvidence(scan, minimum);
    yield* ctx.check(
      label,
      ok
        ? Effect.void
        : inkFailure(
            label,
            minimum === 0
              ? "no pixel near the token"
              : `at least ${minimum} pixels near ${asHex(expected)}`,
            scan,
          ),
    );
  });

/** A single-pixel comparison at a computed point inside an element's box. */
const expectPoint = <Host, E>(
  ctx: Smoke.SmokeContext<Host>,
  reader: FrameReader<E>,
  frame: Pixels.Pixels,
  testId: string,
  point: (box: Smoke.Bounds) => { readonly x: number; readonly y: number },
  expected: Pixels.Rgba,
  label: string,
): Effect.Effect<void, Smoke.SmokeAssertionError | E> =>
  Effect.gen(function* () {
    const box = yield* paintedBox(ctx, reader, testId);
    const at = point(box);
    yield* expectColour(
      ctx,
      label,
      yield* pixelAtPoint(
        ctx,
        frame,
        yield* reader.windowSize(),
        at.x,
        at.y,
        label,
      ),
      expected,
    );
  });

/** The two appearance fixtures sit on a light card, so the ink is the minimum. */
const expectInkLuminance = <Host, E>(
  ctx: Smoke.SmokeContext<Host>,
  reader: FrameReader<E>,
  frame: Pixels.Pixels,
  testId: string,
  label: string,
  passes: (scan: ReturnType<typeof scanDarkest>) => boolean,
  expected: string,
): Effect.Effect<void, Smoke.SmokeAssertionError | E> =>
  Effect.gen(function* () {
    const box = yield* paintedBox(ctx, reader, testId);
    const scan = scanDarkest(frame, yield* reader.windowSize(), box);
    yield* ctx.check(
      label,
      passes(scan) && scan.sampled > 0
        ? Effect.void
        : Effect.fail(
            new Smoke.SmokeAssertionError({
              label,
              expected,
              actual: `${asHex(scan.darkest)} luminance ${scan.luminance.toFixed(2)} over ${scan.sampled} px`,
            }),
          ),
    );
  });

/** The corner of an element's box: no glyph reaches it, so the plane shows. */
const topRight = (
  box: Smoke.Bounds,
): { readonly x: number; readonly y: number } => ({
  x: box.x + box.width - 2,
  y: box.y + 2,
});

const check = <Host, E>(
  ctx: Smoke.SmokeContext<Host>,
  driver: ThemeDriver<E>,
): Effect.Effect<void, Smoke.SmokeAssertionError | E> =>
  Effect.gen(function* () {
    const window = yield* driver.reader.windowSize();
    const frame = yield* driver.capture();
    yield* ctx.expectSome(
      "the frame's device scale is an integer",
      Pixels.frameScale(frame, window),
    );

    const colors: ThemeColors = theme.colors;
    const ink = {
      text: yield* parseColour("the foreground role parses", colors.foreground),
      code: yield* parseColour("the primary role parses", colors.primary),
      muted: yield* parseColour(
        "the muted role parses",
        colors.mutedForeground,
      ),
      faint: yield* parseColour(
        "the placeholder role parses",
        colors.placeholder,
      ),
      add: yield* parseColour("the success role parses", colors.success),
      del: yield* parseColour(
        "the destructive role parses",
        colors.destructive,
      ),
      plane: yield* parseColour(
        "the background role parses",
        colors.background,
      ),
      card: yield* parseColour("the card role parses", colors.card),
      surface: yield* parseColour("the muted role parses", colors.muted),
    };

    // 1. Text and inline code: the themed mount paints the token, the default
    //    mount proves the check is not satisfied by the runtime's own palette.
    yield* expectInk(
      ctx,
      driver.reader,
      frame,
      "st-md-text",
      ink.text,
      "the themed document paints the theme's text token",
    );
    yield* expectInk(
      ctx,
      driver.reader,
      frame,
      "st-md-text-default",
      ink.text,
      "the default document does not paint the theme's text token",
      { minimum: 0 },
    );
    yield* expectInk(
      ctx,
      driver.reader,
      frame,
      "st-md-code",
      ink.code,
      "the themed inline code paints the codeText token",
    );
    yield* expectInk(
      ctx,
      driver.reader,
      frame,
      "st-md-code-default",
      ink.code,
      "the default inline code does not paint the codeText token",
      { minimum: 0 },
    );

    // 2. The accent field: the bullet disc, and the link's monochrome rule.
    yield* expectPoint(
      ctx,
      driver.reader,
      frame,
      "st-md-list",
      bulletPoint,
      bulletPaint(ink.code, ink.card),
      "the themed bullet paints the accent token at 85% over the card",
    );
    yield* expectInk(
      ctx,
      driver.reader,
      frame,
      "st-md-link",
      ink.muted,
      "the themed link underline paints the muted token",
    );
    yield* expectInk(
      ctx,
      driver.reader,
      frame,
      "st-md-link",
      ink.code,
      "the themed link does not paint the accent token",
      { minimum: 0 },
    );

    // 3. The runtime's base selector.
    yield* expectInkLuminance(
      ctx,
      driver.reader,
      frame,
      "st-md-light",
      "the light appearance paints dark ink",
      (scan) => scan.luminance < LIGHT_INK_CEILING,
      `a luminance below ${LIGHT_INK_CEILING}`,
    );
    yield* expectInkLuminance(
      ctx,
      driver.reader,
      frame,
      "st-md-dark",
      "the dark appearance paints light ink",
      (scan) => scan.luminance > DARK_INK_FLOOR,
      `a luminance above ${DARK_INK_FLOOR}`,
    );

    // 4. The code block: syntax, the gutter, and the absent plane.
    yield* expectInk(
      ctx,
      driver.reader,
      frame,
      "st-code",
      ink.faint,
      "the themed code paints the gutter token",
      { band: GUTTER_WIDTH },
    );
    yield* expectInk(
      ctx,
      driver.reader,
      frame,
      "st-code",
      ink.add,
      "the themed code paints a syntax token",
    );
    yield* expectInk(
      ctx,
      driver.reader,
      frame,
      "st-code",
      ink.code,
      "the themed code paints the keyword token",
    );
    yield* expectInk(
      ctx,
      driver.reader,
      frame,
      "st-code-default",
      ink.add,
      "the default code does not paint the syntax token",
      { minimum: 0 },
    );
    yield* expectPoint(
      ctx,
      driver.reader,
      frame,
      "st-code",
      topRight,
      ink.card,
      "the code box paints no content plane",
    );
    yield* expectPoint(
      ctx,
      driver.reader,
      frame,
      "st-md-text",
      topRight,
      ink.card,
      "the markdown box paints no content plane",
    );

    // 5. The diff owns the plane and both row tints.
    yield* expectPoint(
      ctx,
      driver.reader,
      frame,
      "st-diff",
      (box) => diffRowPoints(box).context,
      ink.plane,
      "the diff paints the content plane",
    );
    yield* expectPoint(
      ctx,
      driver.reader,
      frame,
      "st-diff",
      (box) => diffRowPoints(box).added,
      diffTint(ink.add, ink.plane),
      "the diff tints an added row with diffAdd",
    );
    yield* expectPoint(
      ctx,
      driver.reader,
      frame,
      "st-diff",
      (box) => diffRowPoints(box).deleted,
      diffTint(ink.del, ink.plane),
      "the diff tints a deleted row with diffDel",
    );
    const added = diffTint(ink.add, ink.plane);
    const deleted = diffTint(ink.del, ink.plane);
    yield* ctx.expectEqual(
      "the two diff tints are distinct",
      Pixels.rgbaNear(added, deleted, INK_TOLERANCE),
      false,
    );

    // 6. The hunk band is a wash over the plane, not the opaque muted surface.
    const hunk = hunkPaint(ink.muted, ink.plane);
    yield* expectPoint(
      ctx,
      driver.reader,
      frame,
      "st-diff",
      (box) => diffRowPoints(box).hunk,
      hunk,
      "the hunk header paints diffHunkBg over the diff plane",
    );
    yield* ctx.expectEqual(
      "the hunk band is a wash, not the muted surface",
      Pixels.rgbaNear(hunk, ink.surface, INK_TOLERANCE),
      false,
    );
  });

const headlessDriver = (host: Smoke.SmokeHost): ThemeDriver<never> => ({
  reader: readSync(host),
  capture: () => captureHeadless(host),
});

/** A window needs its mount committed before the frame is read. */
const liveDriver = (
  host: Smoke.AsyncSmokeHost,
): ThemeDriver<Smoke.SmokeHostError> => ({
  reader: readAsync(host),
  capture: () =>
    Effect.flatMap(Effect.sleep(Duration.millis(120)), () => captureLive(host)),
});

export const surfaceThemeScenario: PlaygroundScenario = {
  id: "surface-theme",
  title: "Content surfaces: a token theme reaches markdown, code and diff",
  capability: "content",
  view: surfaceThemeView,
  steps: (ctx) => check(ctx, headlessDriver(ctx.host)),
};

export const surfaceThemeLiveScenario: Smoke.AsyncSmokeScenario = {
  id: "live-surface-theme",
  title: "Live content surfaces: a token theme reaches the paint in a window",
  capability: "content",
  steps: (ctx) => check(ctx, liveDriver(ctx.host)),
};
