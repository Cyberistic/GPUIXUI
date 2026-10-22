/**
 * ImageZoom: a picture that magnifies under the pointer and pans with it.
 *
 * The runtime has no `transform` (upstream issue #102), so the zoom is not a
 * scaled layer: the `<img>` host scales its own buffer to its box (measured by
 * the `chart-raster` probe), so a bigger box is a bigger picture and a `left`/
 * `top` offset is the pan. The frame is a fixed, clipped box, so the magnified
 * picture never spills onto the page and nothing around it re-lays out.
 *
 * The panning rule is the one that makes it read as a magnifier rather than a
 * moving picture: the share of the frame the pointer is over stays under the
 * pointer while the picture grows, and the picture always covers the frame, so a
 * pointer on an edge pins that edge instead of revealing the page behind it
 * (`image-zoom/logic.ts`).
 *
 * The pointer drives it, not the keyboard: an image publishes one image node and
 * takes no tab stop, so the zoom is feedback rather than a control. Under
 * `MotionProvider preference="reduced"` the magnification still happens — it is
 * the component's content — but the tween is gone, so the picture is already at
 * its new box in the frame the pointer moved.
 */

import type { EventPayload, Props } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import type { MotionLevel } from "@gpuixui/motion/timing";
import { cn } from "@gpuixui/tw";
import * as Option from "effect/Option";
import { useState } from "react";
import {
  zoomFollow,
  zoomFrames,
  zoomGeometry,
  zoomRest,
  type ZoomPointer,
} from "./image-zoom/logic.js";
import { measuredPoint } from "./internal/measure.js";
import { useMotionPreference, useSurfaceTiming } from "./internal/presence.js";
import { recipeStyle } from "./internal/recipe.js";
import { surfaceOriginStyle, useSurfaceBox } from "./internal/surface-box.js";
import { useTheme } from "./internal/theme.js";

/** What an image zoom paints at one frame. */
export interface ImageZoomState {
  /** Whether the picture is magnified right now. */
  readonly zoomed: boolean;
  readonly reducedMotion: boolean;
}

/** {@link ImageZoom} props. */
export interface ImageZoomProps extends Omit<Props, "children" | "style"> {
  /** A filesystem path, data URL or http(s) URL for the picture. */
  readonly src: string;
  /**
   * The picture's accessible name. Required: the image is the content, and the
   * frame publishes no name of its own.
   */
  readonly alt: string;
  /** The frame's width in pixels. Default `240`; a value below 1 falls back. */
  readonly width?: number;
  /** The frame's height in pixels. Default `160`; a value below 1 falls back. */
  readonly height?: number;
  /**
   * The magnification while the pointer is over the frame. Default `1.6`,
   * held to `1…4`; `1` turns the zoom off.
   */
  readonly scale?: number;
  /** The frame's corner radius. Default `theme.radius.md`. */
  readonly radius?: number;
  /** The retarget's duration. Default `"normal"` (200 ms) — it follows a pointer. */
  readonly level?: MotionLevel;
  /** A Tailwind class string for the frame, joined after the resting style. */
  readonly className?: string;
  /** A style for the frame, or a function of the zoom. */
  readonly style?: StateStyle<ImageZoomState>;
}

/**
 * A clipped frame whose picture magnifies and pans under the pointer.
 *
 * The frame keeps the size the caller gave it and takes no layout from the
 * picture, so a gallery does not reflow while a reader explores one image.
 */
export const ImageZoom = ({
  src,
  alt,
  width,
  height,
  scale,
  radius,
  level = "normal",
  className,
  style,
  onMouseMove,
  onMouseLeave,
  onLayout,
  ...rest
}: ImageZoomProps) => {
  const theme = useTheme();
  const preference = useMotionPreference();
  const timing = useSurfaceTiming(level).enter;
  const geometry = zoomGeometry({
    width: Option.fromNullishOr(width),
    height: Option.fromNullishOr(height),
    scale: Option.fromNullishOr(scale),
  });
  const [pointer, setPointer] = useState<Option.Option<ZoomPointer>>(
    Option.none(),
  );
  const surface = useSurfaceBox();

  const box = Option.match(Option.all({ pointer, surface: surface.box }), {
    onNone: () => zoomRest(geometry),
    onSome: ({ pointer, surface }) => zoomFollow(geometry, surface, pointer),
  });

  const measure = (event: EventPayload) => {
    surface.measure(event);
    onLayout?.(event);
  };

  const follow = (event: EventPayload) => {
    onMouseMove?.(event);
    surface.read();
    Option.match(measuredPoint(event), {
      onNone: () => undefined,
      // A held pointer emits a move per frame; a repeat of the same point is a
      // frame the runtime would paint identically, so it is not a state change.
      onSome: (point) =>
        setPointer((current) =>
          Option.match(current, {
            onNone: () => Option.some(point),
            onSome: (previous) =>
              previous.x === point.x && previous.y === point.y
                ? current
                : Option.some(point),
          }),
        ),
    });
  };

  const leave = (event: EventPayload) => {
    onMouseLeave?.(event);
    setPointer(Option.none());
  };

  const corner = radius ?? theme.radius.md;
  const state: ImageZoomState = {
    zoomed: Option.isSome(pointer) && geometry.scale > 1,
    reducedMotion: preference === "reduced",
  };

  return (
    <div
      {...rest}
      onMouseMove={follow}
      onMouseLeave={leave}
      onLayout={measure}
      style={mergeStyles(
        mergeStyles(
          {
            position: "relative",
            overflow: "hidden",
            width: geometry.frameWidth,
            height: geometry.frameHeight,
            borderRadius: corner,
          },
          recipeStyle(cn(className), theme),
        ),
        resolveStyle(style, state),
      )}
    >
      <div
        style={surfaceOriginStyle(surface.nudge)}
        onLayout={surface.noteOrigin}
      />
      <img
        testId="image-zoom-image"
        src={src}
        alt={alt}
        objectFit="cover"
        motion={{
          initial: false,
          animate: zoomFrames(box),
          transition: timing,
        }}
        style={{
          position: "absolute",
          borderRadius: corner,
          pointerEvents: "none",
        }}
      />
    </div>
  );
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 600). */
export const imageZoomMeta = {
  name: "Image zoom",
  tier: 5,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "the magnification is a box the picture scales itself into plus a left/top pan, not a transform: the runtime has no transform (upstream issue #102)",
    "the pointer drives it; there is no wheel, pinch or drag-to-pan gesture, and the image publishes one image node with no tab stop",
    "the frame is fixed: a responsive gallery passes a measured width and height rather than a percentage",
    "the pan follows the box the frame reported; a 1px probe at its origin re-reports it on every pointer read, because onLayout reports a size change and not a move",
    "a magnified picture shows the buffer the host decoded, so a very large factor is soft where the source is small",
  ],
  docs: "docs/image-zoom.mdx",
  example: "examples/image-zoom.example.tsx",
  testFile: "src/behaviour/image-zoom.test.tsx",
} as const;
