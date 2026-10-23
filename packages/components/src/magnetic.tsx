/**
 * Magnetic: content that leans toward the pointer while it is over the surface.
 *
 * The runtime has no `transform` (upstream issue #102), so the lean is not a
 * scale or a translate: it is a relative `left`/`top` offset on an inner plate,
 * tweened by the runtime from the pointer's distance to the surface's centre
 * (`magnetic/logic.ts`). The outer box never moves, which is what keeps the
 * cursor on the surface it is attracting — the pointer stays inside the hit box
 * while the content it pulls travels.
 *
 * The pull is feedback, not content: under `MotionProvider preference="reduced"`
 * the plate stays at rest, and a keyboard reader never moves it. The surface is
 * a plain host for its children, so it wraps an action, a card or an icon
 * without changing what they are.
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
import { useEffect, useState, type ReactNode } from "react";
import { measuredPoint, type MeasuredPoint } from "./internal/measure.js";
import { useMotionPreference, useSurfaceTiming } from "./internal/presence.js";
import { recipeStyle } from "./internal/recipe.js";
import { surfaceOriginStyle, useSurfaceBox } from "./internal/surface-box.js";
import { useTheme } from "./internal/theme.js";
import {
  magneticFrames,
  magneticPull,
  magneticRest,
  samePull,
} from "./magnetic/logic.js";

/** What a magnetic surface draws at one frame. */
export interface MagneticState {
  /** Whether the plate is leaning toward a pointer right now. */
  readonly pulled: boolean;
  readonly reducedMotion: boolean;
}

/** {@link Magnetic} props. */
export interface MagneticProps extends Omit<Props, "children" | "style"> {
  readonly children?: ReactNode;
  /**
   * The share of the pointer's distance from the centre the plate follows,
   * clamped to `0…1`. Default `0.35`; `0` pins the plate.
   */
  readonly strength?: number;
  /** The furthest the plate travels on one axis, in pixels. Default `12`. */
  readonly maxOffset?: number;
  /** The retarget's duration. Default `"fast"` (160 ms) — it follows a pointer. */
  readonly level?: MotionLevel;
  /** A Tailwind class string for the outer box, joined after the resting style. */
  readonly className?: string;
  /** A style for the outer box, or a function of the pull. */
  readonly style?: StateStyle<MagneticState>;
}

/**
 * A box whose content leans toward the pointer.
 *
 * The content is wrapped in a plate that carries the offset, so the surface's
 * layout, hit box and measured size are unchanged by the pull.
 */
export const Magnetic = ({
  children,
  strength,
  maxOffset,
  level = "fast",
  className,
  style,
  onMouseMove,
  onMouseLeave,
  onLayout,
  ...rest
}: MagneticProps) => {
  const theme = useTheme();
  const preference = useMotionPreference();
  const timing = useSurfaceTiming(level).enter;
  const surface = useSurfaceBox();
  const [pointer, setPointer] = useState<Option.Option<MeasuredPoint>>(
    Option.none(),
  );
  const reduced = preference === "reduced";

  // The pull is derived, not stored: the origin the probe reports is a fresh
  // reading of the same pointer, so a surface a layout above moved leans from
  // the centre it has now without waiting for another move.
  //
  // The lean is a journey, not content, so the preference removes it from the
  // render that names it — including a lean the reader had already earned. Read
  // from the pointer alone, turning reduced motion on mid-hover froze the plate
  // at the offset it had reached, and the record said it paints no lean at all.
  const pull = reduced
    ? magneticRest
    : Option.match(Option.all({ surface: surface.box, point: pointer }), {
        onNone: () => magneticRest,
        onSome: ({ surface, point }) =>
          magneticPull(
            point,
            surface,
            strength ?? undefined,
            maxOffset ?? undefined,
          ),
      });

  // The pointer that earned the removed lean is released with it, so a
  // preference turned back on leans from the next move rather than an old point.
  useEffect(() => {
    if (!reduced) return;
    setPointer((current) => (Option.isNone(current) ? current : Option.none()));
  }, [reduced]);

  const measure = (event: EventPayload) => {
    surface.measure(event);
    onLayout?.(event);
  };

  const follow = (event: EventPayload) => {
    onMouseMove?.(event);
    if (reduced) return;
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

  const state: MagneticState = {
    pulled: !samePull(pull, magneticRest),
    reducedMotion: reduced,
  };

  return (
    <div
      {...rest}
      onMouseMove={follow}
      onMouseLeave={leave}
      onLayout={measure}
      style={mergeStyles(
        mergeStyles(
          { position: "relative" },
          recipeStyle(cn(className), theme),
        ),
        resolveStyle(style, state),
      )}
    >
      <div
        style={surfaceOriginStyle(surface.nudge)}
        onLayout={surface.noteOrigin}
      />
      <div
        testId="magnetic-plate"
        // The plate is painted where it is on the first frame; every later
        // pointer reading retargets from the offset on screen, which is the lean.
        motion={{
          initial: false,
          animate: magneticFrames(pull),
          transition: timing,
        }}
        style={{ position: "relative" }}
      >
        {children}
      </div>
    </div>
  );
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 600). */
export const magneticMeta = {
  name: "Magnetic",
  tier: 5,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "the lean is a relative left/top offset on an inner plate, not a translate: the runtime has no transform (upstream issue #102)",
    "the outer box deliberately stays still, so the pointer cannot leave the surface it is pulling; the content moves inside it",
    "a reduced-motion reader and a keyboard reader get no lean; the hover fill and the focus ring are the feedback that remains",
    "the pull follows the centre of the measured box; a 1px probe at the surface's origin re-reports it on every pointer read, because onLayout reports a size change and not a move",
    "nothing moves until the surface and its probe have both reported a box",
  ],
  docs: "docs/magnetic.mdx",
  example: "examples/magnetic.example.tsx",
  testFile: "src/behaviour/magnetic.test.tsx",
} as const;
