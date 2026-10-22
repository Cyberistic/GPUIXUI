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
import { useRef, useState, type ReactNode } from "react";
import {
  measuredBox,
  measuredPoint,
  type MeasuredBox,
} from "./internal/measure.js";
import { useMotionPreference, useSurfaceTiming } from "./internal/presence.js";
import { recipeStyle } from "./internal/recipe.js";
import { useTheme } from "./internal/theme.js";
import {
  magneticFrames,
  magneticPull,
  magneticRest,
  samePull,
  type MagneticPull,
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
  const box = useRef<Option.Option<MeasuredBox>>(Option.none());
  const [pull, setPull] = useState<MagneticPull>(magneticRest);
  const reduced = preference === "reduced";

  const measure = (event: EventPayload) => {
    box.current = measuredBox(event);
    onLayout?.(event);
  };

  const follow = (event: EventPayload) => {
    onMouseMove?.(event);
    if (reduced) return;
    Option.match(
      Option.all({ surface: box.current, point: measuredPoint(event) }),
      {
        onNone: () => undefined,
        onSome: ({ surface, point }) => {
          const next = magneticPull(
            point,
            surface,
            strength ?? undefined,
            maxOffset ?? undefined,
          );
          setPull((current) => (samePull(current, next) ? current : next));
        },
      },
    );
  };

  const leave = (event: EventPayload) => {
    onMouseLeave?.(event);
    setPull(magneticRest);
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
    "the pull follows the centre of the measured box, so it has no reading until the first onLayout",
  ],
  docs: "docs/magnetic.mdx",
  example: "examples/magnetic.example.tsx",
  testFile: "src/behaviour/magnetic.test.tsx",
} as const;
