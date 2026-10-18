/**
 * `crop-area` — the runtime half of a crop surface over `<img>` (plan `385`).
 *
 * A crop is the first component that needs the image's **layout box** as its
 * coordinate space, four dimming masks that are plain `div`s, small handles
 * that keep a pointer capture, and a keyboard-operable selection. This probe
 * measures all four on the pinned 0.10.0 runtime:
 *
 * - `objectFit` is accepted but neither the fitted bitmap rect nor a load event
 *   is observable, so the app must know the natural aspect ratio;
 * - four masks cover exactly the crop's complement; `auto` delivers a click to
 *   the mask only, while `none` delivers it to the plane **and still runs the
 *   mask handler**, so a click-through overlay must guard by mode;
 * - a 12 px handle keeps every held move and the release, and the gesture ends
 *   in a click on the handle rather than the image;
 * - the box takes native focus and arrows move it (shift+arrow resizes it).
 *
 * The geometry is pure (`crop-model.ts`); the view and the steps call the same
 * functions.
 */
import { useRef, useState } from "react";
import { Effect, Match, Option } from "effect";
import * as Arr from "effect/Array";
import type { EventPayload } from "@gpuix/react";
import { alpha } from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import { Pressable, Readout } from "../ui.js";
import type { PlaygroundScenario } from "../types.js";
import {
  describeCrop,
  initialCrop,
  maskRects,
  moveCrop,
  paints,
  resizeCrop,
} from "./crop-model.js";
import type {
  Corner,
  CropCounts,
  CropRect,
  MaskMode,
  ObjectFit,
  Stage,
} from "./crop-model.js";
import {
  elementTypeOf,
  focusedId,
  nodeFor,
  read,
  readoutField,
  treeOf,
} from "./probes.js";

const STAGE: Stage = { width: 320, height: 200 };
const MIN_SIZE = 16;
const HANDLE = 12;
const MASK_ALPHA = 0.6;

/** A 2 : 1 image so its natural ratio differs from the stage's 8 : 5. */
const IMAGE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200"><rect width="400" height="200" fill="#3b82f6"/><rect x="200" width="200" height="200" fill="#f59e0b"/><circle cx="200" cy="100" r="48" fill="#111827"/></svg>`;
const IMAGE = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(IMAGE_SVG)}`;

const CORNERS: ReadonlyArray<Corner> = ["nw", "ne", "sw", "se"];

/** A pointer gesture that is still held: the kind, the corner and the origin. */
interface Gesture {
  readonly kind: "move" | "resize";
  readonly corner: Corner;
  readonly pointer: { readonly x: number; readonly y: number };
  readonly start: CropRect;
}

const pointOf = (event: EventPayload): { x: number; y: number } => ({
  x: event.x ?? 0,
  y: event.y ?? 0,
});

/** The mask id/rect pairs that have a positive area. */
const paintedMasks = (crop: CropRect) => {
  const masks = maskRects(crop, STAGE);
  return Arr.filter(
    [
      { id: "top", rect: masks.top },
      { id: "left", rect: masks.left },
      { id: "right", rect: masks.right },
      { id: "bottom", rect: masks.bottom },
    ],
    (entry) => paints(entry.rect),
  );
};

/** A handle's top-left, centred on its crop corner. */
const handleAt = (
  crop: CropRect,
  corner: Corner,
): { left: number; top: number } => ({
  left:
    (corner === "nw" || corner === "sw" ? crop.x : crop.x + crop.width) -
    HANDLE / 2,
  top:
    (corner === "nw" || corner === "ne" ? crop.y : crop.y + crop.height) -
    HANDLE / 2,
});

const gestureLabel = (gesture: Gesture): string =>
  gesture.kind === "move" ? "move" : gesture.corner;

const CropAreaProbe = () => {
  const theme = useTheme();
  const [crop, setCrop] = useState<CropRect>(() => initialCrop(STAGE));
  const [fit, setFit] = useState<ObjectFit>("contain");
  const [maskMode, setMaskMode] = useState<MaskMode>("none");
  const [counts, setCounts] = useState<CropCounts>({ image: 0, blocked: 0 });
  const [log, setLog] = useState<ReadonlyArray<string>>([]);
  // A pointer gesture is read by the very next native event, often before React
  // commits: a ref is the only state a held drag can trust (plan `385` §10).
  const gesture = useRef<Option.Option<Gesture>>(Option.none());

  const record = (entry: string): void =>
    setLog((previous) => Arr.append(previous, entry));

  /** The press starts on the box (move) or on a handle (resize). */
  const begin = (
    kind: Gesture["kind"],
    corner: Corner,
    event: EventPayload,
  ): void => {
    gesture.current = Option.some({
      kind,
      corner,
      pointer: pointOf(event),
      start: crop,
    });
    record(`down:${kind === "move" ? "move" : corner}`);
  };

  /**
   * The pointer move is always computed from the press origin and the start
   * rect, never incrementally: a dropped move cannot make the crop drift.
   */
  const drag = (event: EventPayload): void => {
    Option.match(gesture.current, {
      onNone: () => undefined,
      onSome: (active) => {
        const pointer = pointOf(event);
        const dx = pointer.x - active.pointer.x;
        const dy = pointer.y - active.pointer.y;
        setCrop(
          active.kind === "move"
            ? moveCrop(active.start, STAGE, dx, dy)
            : resizeCrop(active.start, STAGE, active.corner, dx, dy, MIN_SIZE),
        );
        record(`move:${gestureLabel(active)}`);
      },
    });
  };

  const end = (): void => {
    Option.match(gesture.current, {
      onNone: () => undefined,
      onSome: (active) => {
        record(`up:${gestureLabel(active)}`);
        gesture.current = Option.none();
      },
    });
  };

  const onKeyDown = (event: EventPayload): void => {
    const key = event.key ?? "";
    const step = Match.value(key).pipe(
      Match.when("left", () => ({ dx: -1, dy: 0 })),
      Match.when("right", () => ({ dx: 1, dy: 0 })),
      Match.when("up", () => ({ dx: 0, dy: -1 })),
      Match.when("down", () => ({ dx: 0, dy: 1 })),
      Match.orElse(() => null),
    );
    if (step === null) return;
    const shift = event.modifiers?.shift === true;
    setCrop(
      shift
        ? resizeCrop(crop, STAGE, "se", step.dx, step.dy, MIN_SIZE)
        : moveCrop(crop, STAGE, step.dx, step.dy),
    );
    record(`key:${key}${shift ? ":shift" : ""}`);
  };

  const reset = (): void => {
    setCrop(initialCrop(STAGE));
    setFit("contain");
    setMaskMode("none");
    setCounts({ image: 0, blocked: 0 });
    setLog([]);
    gesture.current = Option.none();
  };

  const maskStyle = {
    backgroundColor: alpha(theme.colors.background, MASK_ALPHA),
    pointerEvents: maskMode,
  } as const;

  return (
    <div
      testId="crop-frame"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: theme.spacing.sm,
        padding: theme.spacing.lg,
        width: 560,
        backgroundColor: theme.colors.background,
      }}
    >
      <div
        style={{ display: "flex", flexDirection: "row", gap: theme.spacing.sm }}
      >
        <Pressable
          testId="crop-fit"
          onClick={() => setFit(fit === "contain" ? "cover" : "contain")}
        >
          <text style={{ fontSize: 12, color: theme.colors.foreground }}>
            {`fit ${fit}`}
          </text>
        </Pressable>
        <Pressable
          testId="crop-mask-mode"
          onClick={() => setMaskMode(maskMode === "none" ? "auto" : "none")}
        >
          <text style={{ fontSize: 12, color: theme.colors.foreground }}>
            {maskMode === "none" ? "masks pass" : "masks block"}
          </text>
        </Pressable>
        <Pressable testId="crop-reset" onClick={reset}>
          <text style={{ fontSize: 12, color: theme.colors.foreground }}>
            reset
          </text>
        </Pressable>
      </div>

      <div
        testId="crop-stage"
        role="img"
        aria-label="Image to crop"
        style={{
          position: "relative",
          width: STAGE.width,
          height: STAGE.height,
          overflow: "hidden",
          borderWidth: theme.borderWidth.thin,
          borderColor: theme.colors.border,
        }}
      >
        <img
          testId="crop-image"
          src={IMAGE}
          alt="Image to crop"
          objectFit={fit}
          style={{ width: STAGE.width, height: STAGE.height }}
        />

        {/* The image plane: a narrow pointer surface over the bitmap. */}
        <div
          testId="crop-plane"
          onClick={() => {
            record("plane");
            setCounts((previous) => ({
              ...previous,
              image: previous.image + 1,
            }));
          }}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: STAGE.width,
            height: STAGE.height,
            backgroundColor: "transparent",
          }}
        />

        {Arr.map(paintedMasks(crop), (mask) => (
          <div
            key={mask.id}
            testId={`crop-mask-${mask.id}`}
            onClick={() => {
              // `pointerEvents: "none"` still delivers the click to the mask;
              // only the component can decide whether it blocked the plane.
              if (maskMode !== "auto") return;
              record(`mask:${mask.id}`);
              setCounts((previous) => ({
                ...previous,
                blocked: previous.blocked + 1,
              }));
            }}
            style={{
              position: "absolute",
              left: mask.rect.x,
              top: mask.rect.y,
              width: mask.rect.width,
              height: mask.rect.height,
              ...maskStyle,
            }}
          />
        ))}

        <div
          testId="crop-box"
          role="group"
          aria-label="Crop selection"
          tabIndex={0}
          onMouseDown={(event) => begin("move", "nw", event)}
          onMouseMove={drag}
          onMouseUp={end}
          onClick={() => record("click:move")}
          onKeyDown={onKeyDown}
          style={{
            position: "absolute",
            left: crop.x,
            top: crop.y,
            width: crop.width,
            height: crop.height,
            borderWidth: theme.borderWidth.strong,
            borderColor: theme.colors.primary,
            cursor: "move",
          }}
        />

        {Arr.map(CORNERS, (corner) => {
          const at = handleAt(crop, corner);
          const diagonal = corner === "nw" || corner === "se";
          const label = `Resize crop ${Match.value(corner).pipe(
            Match.when("nw", () => "top left"),
            Match.when("ne", () => "top right"),
            Match.when("sw", () => "bottom left"),
            Match.when("se", () => "bottom right"),
            Match.exhaustive,
          )}`;
          return (
            <div
              key={corner}
              testId={`crop-handle-${corner}`}
              role="button"
              aria-label={label}
              onMouseDown={(event) => begin("resize", corner, event)}
              onMouseMove={drag}
              onMouseUp={end}
              onClick={() => record(`click:${corner}`)}
              style={{
                position: "absolute",
                left: at.left,
                top: at.top,
                width: HANDLE,
                height: HANDLE,
                borderRadius: theme.radius.sm,
                backgroundColor: theme.colors.primary,
                cursor: diagonal ? "nwse-resize" : "nesw-resize",
              }}
            />
          );
        })}
      </div>

      <Readout testId="crop-readout">
        {describeCrop(crop, fit, maskMode, counts)}
      </Readout>
      <Readout testId="crop-log">{Arr.join(log, ">")}</Readout>
    </div>
  );
};

/**
 * A painted element's bounds, or a labelled failure naming the absent id.
 *
 * The renderer's bounds object is copied: later `getElementBounds` calls can
 * refresh the live layout, so a held reference would report a later frame.
 */
const boxOf = (ctx: Smoke.SmokeContext, testId: string) =>
  ctx.expectSome(
    `${testId} painted`,
    Option.map(Option.fromNullishOr(ctx.host.bounds(testId)), (bounds) => ({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
    })),
  );

/** Asserts a mask id is absent from the paint entirely. */
const absent = (ctx: Smoke.SmokeContext, testId: string, label: string) =>
  ctx.expectEqual(label, ctx.host.bounds(testId) === null, true);

/**
 * The top-mask point every pass-through check uses: the stage's horizontal
 * centre, 10 px below its top edge. The crop starts at `y = 40`, so no crop
 * control is in the way.
 */
const topMaskPoint = (stage: Smoke.Bounds) => ({
  x: stage.x + stage.width / 2,
  y: stage.y + 10,
});

/**
 * A whole press/move/release at window coordinates, flushed so React commits
 * before the next read. The headless renderer has no frame boundary.
 */
const dragFrom = (
  ctx: Smoke.SmokeContext,
  from: { readonly x: number; readonly y: number },
  deltaX: number,
  deltaY: number,
): void => {
  ctx.host.pressWindow(from.x, from.y);
  ctx.host.movePointer(from.x + deltaX, from.y + deltaY);
  ctx.host.releasePointer(from.x + deltaX, from.y + deltaY);
  ctx.host.advance(0);
};

/** A `testId`'s centre. */
const centreOf = (bounds: Smoke.Bounds) => ({
  x: bounds.x + bounds.width / 2,
  y: bounds.y + bounds.height / 2,
});

/** One `key=value` field of the crop readout, or `"none"`. */
const field = (ctx: Smoke.SmokeContext, key: string): string =>
  Option.getOrElse(readoutField(ctx, "crop-readout", key), () => "none");

export const cropScenario: PlaygroundScenario = {
  id: "crop-area",
  title: "Crop area: the image box, four masks, handles and a keyboard box",
  capability: "crop",
  view: () => <CropAreaProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const stage = yield* boxOf(ctx, "crop-stage");
      const image = yield* boxOf(ctx, "crop-image");
      const box = yield* boxOf(ctx, "crop-box");

      // 1. The stage box is the coordinate space; the bitmap is fitted inside.
      yield* ctx.expectEqual(
        "the initial crop is 60 % of the stage, centred",
        read(ctx, "crop-readout"),
        "x=64 y=40 w=192 h=120 fit=contain mask=none image=0 blocked=0",
      );
      yield* ctx.expectNear(
        "the image keeps the stage width",
        image.width,
        320,
        0.5,
      );
      yield* ctx.expectNear(
        "the image keeps the stage height",
        image.height,
        200,
        0.5,
      );
      yield* ctx.expectEqual(
        "the image is an img host node",
        elementTypeOf(ctx, "crop-image"),
        "img",
      );
      yield* ctx.expectNear(
        // The box origin is its content origin, inside the stage's 2 px inset
        // and its own border (plan 529 §6.3).
        "the crop box starts at x = 66",
        box.x - stage.x,
        66,
        1,
      );
      yield* ctx.expectNear(
        "the crop box starts at y = 42",
        box.y - stage.y,
        42,
        1,
      );
      // The box's 2 px borders are excluded from its reported size (plan 529 §6.3).
      yield* ctx.expectNear(
        "the crop box is 188 wide inside its borders",
        box.width,
        188,
        1,
      );
      yield* ctx.expectNear(
        "the crop box is 116 tall inside its borders",
        box.height,
        116,
        1,
      );
      yield* ctx.expectEqual(
        "a valid data URL paints no image fallback",
        Arr.some(ctx.host.paintedText(), (line) =>
          line.includes("img: load failed"),
        ),
        false,
      );

      // 2. The four masks are the exact complement of the crop.
      const top = yield* boxOf(ctx, "crop-mask-top");
      const left = yield* boxOf(ctx, "crop-mask-left");
      const right = yield* boxOf(ctx, "crop-mask-right");
      const bottom = yield* boxOf(ctx, "crop-mask-bottom");
      yield* ctx.expectNear(
        "the top mask starts at the stage top",
        top.y,
        stage.y,
        1,
      );
      yield* ctx.expectNear("the top mask is the crop's y", top.height, 40, 1);
      yield* ctx.expectNear("the left mask is the crop's x", left.width, 64, 1);
      yield* ctx.expectNear(
        "the left mask starts at the crop's y",
        left.y,
        stage.y + 40,
        1,
      );
      yield* ctx.expectNear(
        "the left mask is the crop's height",
        left.height,
        120,
        1,
      );
      yield* ctx.expectNear(
        "the right mask starts after the crop",
        right.x,
        stage.x + 256,
        1,
      );
      yield* ctx.expectNear(
        "the right mask is the remaining width",
        right.width,
        64,
        1,
      );
      yield* ctx.expectNear(
        "the bottom mask starts after the crop",
        bottom.y,
        stage.y + 160,
        1,
      );
      yield* ctx.expectNear(
        "the bottom mask is the remaining height",
        bottom.height,
        40,
        1,
      );

      // 3. Each handle is a 12 px square centred on its corner.
      const se = yield* boxOf(ctx, "crop-handle-se");
      yield* ctx.expectNear("the SE handle is 12 px wide", se.width, 12, 0.5);
      yield* ctx.expectNear("the SE handle is 12 px tall", se.height, 12, 0.5);
      yield* ctx.expectNear(
        "the SE handle is centred on the crop's bottom-right",
        se.x + se.width / 2,
        box.x + box.width + 2,
        1,
      );
      yield* ctx.expectNear(
        "the SE handle's centre is on the crop's bottom edge",
        se.y + se.height / 2,
        box.y + box.height + 2,
        1,
      );

      // 4. objectFit is accepted, but only the box is observable.
      ctx.host.click("crop-fit");
      ctx.host.advance(0);
      yield* ctx.expectEqual(
        "the fit switches to cover",
        field(ctx, "fit"),
        "cover",
      );
      const covered = yield* boxOf(ctx, "crop-image");
      yield* ctx.expectNear(
        "cover keeps the image box width",
        covered.width,
        320,
        0.5,
      );
      yield* ctx.expectNear(
        "cover keeps the image box height",
        covered.height,
        200,
        0.5,
      );
      ctx.host.click("crop-fit");
      ctx.host.advance(0);
      yield* ctx.expectEqual(
        "the fit returns to contain",
        field(ctx, "fit"),
        "contain",
      );

      // 5. `none` reaches the plane (and the mask handler); `auto` blocks it.
      const point = topMaskPoint(stage);
      ctx.host.clickWindow(point.x, point.y);
      ctx.host.advance(0);
      yield* ctx.expectEqual(
        "a passing mask lets the image plane take the click",
        field(ctx, "image"),
        "1",
      );
      yield* ctx.expectContains(
        "the passing click reaches the image plane",
        read(ctx, "crop-log"),
        "plane",
      );
      yield* ctx.expectEqual(
        "a passing mask records no block",
        field(ctx, "blocked"),
        "0",
      );
      ctx.host.click("crop-mask-mode");
      ctx.host.advance(0);
      yield* ctx.expectEqual(
        "the masks switch to blocking",
        field(ctx, "mask"),
        "auto",
      );
      ctx.host.clickWindow(point.x, point.y);
      ctx.host.advance(0);
      yield* ctx.expectEqual(
        "a blocking mask takes the click itself",
        field(ctx, "blocked"),
        "1",
      );
      yield* ctx.expectEqual(
        "a blocking mask keeps the image plane untouched",
        field(ctx, "image"),
        "1",
      );

      // 6. A captured handle resize: every move lands and the release commits.
      ctx.host.click("crop-reset");
      ctx.host.advance(0);
      const restHandle = yield* boxOf(ctx, "crop-handle-se");
      dragFrom(ctx, centreOf(restHandle), 40, 20);
      yield* ctx.expectEqual(
        "the SE handle resizes the crop by the pointer delta",
        read(ctx, "crop-readout"),
        "x=64 y=40 w=232 h=140 fit=contain mask=none image=0 blocked=0",
      );
      const resizedRight = yield* boxOf(ctx, "crop-mask-right");
      const resizedBottom = yield* boxOf(ctx, "crop-mask-bottom");
      yield* ctx.expectNear(
        "the right mask follows the resized edge",
        resizedRight.x,
        stage.x + 296,
        1,
      );
      yield* ctx.expectNear(
        "the right mask shrinks with the crop",
        resizedRight.width,
        24,
        1,
      );
      yield* ctx.expectNear(
        "the bottom mask follows the resized edge",
        resizedBottom.y,
        stage.y + 180,
        1,
      );
      yield* ctx.expectContains(
        "the resize gesture is down, move, up on the handle",
        read(ctx, "crop-log"),
        "down:se>move:se>up:se",
      );
      yield* ctx.expectContains(
        "the gesture ends in a click on the handle",
        read(ctx, "crop-log"),
        "click:se",
      );

      // 7. The SE handle clamps at the stage edge.
      ctx.host.click("crop-reset");
      ctx.host.advance(0);
      const clampHandle = yield* boxOf(ctx, "crop-handle-se");
      dragFrom(ctx, centreOf(clampHandle), 400, 400);
      yield* ctx.expectEqual(
        "the SE handle stops at the stage's bottom-right",
        read(ctx, "crop-readout"),
        "x=64 y=40 w=256 h=160 fit=contain mask=none image=0 blocked=0",
      );

      // 8. Moving the box clamps at both ends and the masks re-derive.
      ctx.host.click("crop-reset");
      ctx.host.advance(0);
      const moveBox = yield* boxOf(ctx, "crop-box");
      dragFrom(ctx, centreOf(moveBox), -30, -16);
      yield* ctx.expectEqual(
        "the box follows the pointer delta",
        read(ctx, "crop-readout"),
        "x=34 y=24 w=192 h=120 fit=contain mask=none image=0 blocked=0",
      );
      const movedTop = yield* boxOf(ctx, "crop-mask-top");
      const movedLeft = yield* boxOf(ctx, "crop-mask-left");
      yield* ctx.expectNear(
        "the top mask follows the move",
        movedTop.height,
        24,
        1,
      );
      yield* ctx.expectNear(
        "the left mask follows the move",
        movedLeft.width,
        34,
        1,
      );
      const movedBox = yield* boxOf(ctx, "crop-box");
      dragFrom(ctx, centreOf(movedBox), -100, -100);
      yield* ctx.expectEqual(
        "a move past the origin stops at zero",
        read(ctx, "crop-readout"),
        "x=0 y=0 w=192 h=120 fit=contain mask=none image=0 blocked=0",
      );
      yield* absent(
        ctx,
        "crop-mask-left",
        "a crop at x = 0 paints no left mask",
      );
      yield* absent(ctx, "crop-mask-top", "a crop at y = 0 paints no top mask");

      // 9. A shrink stops at the minimum size; the opposite corner is fixed.
      ctx.host.click("crop-reset");
      ctx.host.advance(0);
      const minHandle = yield* boxOf(ctx, "crop-handle-se");
      dragFrom(ctx, centreOf(minHandle), -200, -200);
      yield* ctx.expectEqual(
        "a SE shrink stops at the minimum size",
        read(ctx, "crop-readout"),
        "x=64 y=40 w=16 h=16 fit=contain mask=none image=0 blocked=0",
      );
      const nwHandle = yield* boxOf(ctx, "crop-handle-nw");
      dragFrom(ctx, centreOf(nwHandle), 400, 400);
      yield* ctx.expectEqual(
        "the NW corner cannot pass the SE minimum",
        read(ctx, "crop-readout"),
        "x=64 y=40 w=16 h=16 fit=contain mask=none image=0 blocked=0",
      );

      // 10. Native focus and keys: arrows move, shift+arrows resize.
      ctx.host.click("crop-reset");
      ctx.host.advance(0);
      const keyBox = yield* boxOf(ctx, "crop-box");
      ctx.host.clickWindow(centreOf(keyBox).x, centreOf(keyBox).y);
      ctx.host.advance(0);
      yield* ctx.expectEqual(
        "a click on the box focuses it natively",
        focusedId(ctx),
        "crop-box",
      );
      ctx.host.key("right");
      ctx.host.advance(0);
      yield* ctx.expectEqual(
        "arrow keys move the crop by one pixel",
        field(ctx, "x"),
        "65",
      );
      ctx.host.key("shift-down");
      ctx.host.advance(0);
      yield* ctx.expectEqual(
        "shift+arrow grows the crop from the SE corner",
        field(ctx, "h"),
        "121",
      );

      // 11. Accessibility: the image and the crop region are named.
      const tree = yield* treeOf(ctx);
      yield* ctx.expectSome(
        "the stage is a named Image",
        nodeFor(tree, "Image", "Image to crop"),
      );
      yield* ctx.expectSome(
        "the crop box is a named Group",
        nodeFor(tree, "Group", "Crop selection"),
      );
      yield* ctx.expectSome(
        "the SE handle is a named Button",
        nodeFor(tree, "Button", "Resize crop bottom right"),
      );
    }),
};
