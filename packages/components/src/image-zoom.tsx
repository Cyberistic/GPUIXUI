/** @jsxImportSource @gpuix/react */
import type { EventPayload, Props } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import type { MotionLevel } from "@gpuixui/motion/timing";
import { cn } from "@gpuixui/tw";
import * as Option from "effect/Option";
import {
  zoomFollow,
  zoomFrames,
  zoomGeometry,
  zoomRest,
} from "./image-zoom/logic.js";
import { makeZoomStore } from "./image-zoom/store.js";
import { send, useLocalState, useLocalStore } from "./internal/local-state.js";
import { measuredPoint } from "./internal/measure.js";
import { nameOf } from "./internal/text.js";
import { useMotionPreference, useSurfaceTiming } from "./internal/presence.js";
import { recipeStyle } from "./internal/recipe.js";
import { surfaceOriginStyle, useSurfaceBox } from "./internal/surface-box.js";
import { useTheme, type Theme } from "./internal/theme.js";

const PICTURE_NAME = "Picture";

const cornerOf = (radius: Option.Option<number>, theme: Theme): number =>
  Option.match(radius, {
    onNone: () => theme.radius.md,
    onSome: (value) =>
      Number.isFinite(value) && value >= 0 ? value : theme.radius.md,
  });

export interface ImageZoomState {
  readonly zoomed: boolean;
  readonly reducedMotion: boolean;
}

export interface ImageZoomProps extends Omit<Props, "children" | "style"> {
  readonly src: string;

  readonly alt: string;

  readonly width?: number;

  readonly height?: number;

  readonly scale?: number;

  readonly radius?: number;

  readonly level?: MotionLevel;

  readonly className?: string;

  readonly style?: StateStyle<ImageZoomState>;
}

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
  const store = useLocalStore(makeZoomStore);
  const pointer = useLocalState(store.local);
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
      onSome: (point) => send(store.follow(point)),
    });
  };

  const leave = (event: EventPayload) => {
    onMouseLeave?.(event);
    send(store.leave);
  };

  const corner = cornerOf(Option.fromNullishOr(radius), theme);
  const pictureName = nameOf(alt) ?? PICTURE_NAME;
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
        alt={pictureName}
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
