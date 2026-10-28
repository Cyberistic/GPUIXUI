/** @jsxImportSource @gpuix/react */
/**
 * AutoHeight: a reveal that grows to what its content measures.
 *
 * The runtime can tween a numeric height, but it cannot tween "auto": a
 * collapsing sidebar, a disclosure panel and a settings section all need the
 * height of a box that has not been laid out yet. So the inner box's height is
 * read from the renderer before the opening frame and kept current through
 * `onLayout`, and the clipped outer box tweens to that number — the outer box
 * clips, it does not shrink what it contains.
 *
 * Presence is a duration, not a frame callback: the content stays mounted for
 * its exit tween and unmounts after it, and a reopen during the exit retargets
 * the same run. Under the reduced preference the tween is a zero-duration
 * assignment, so the content still paints at its measured height.
 *
 * The first measurement is the renderer's, not the event loop's: a reveal that
 * waited for `onLayout` grew one frame late, so the opening frame painted a box
 * with no target. The content box is read through `getElementBounds` in a layout
 * effect, before that frame paints, and `onLayout` carries every later change.
 * The report is read through `internal/measure.ts`, so a height the payload
 * cannot paint is no height rather than a `NaN` the runtime drops.
 *
 * The measurement belongs to the content on screen: when the subtree unmounts,
 * the height it reported is retired, so a body that changed while closed is
 * measured again on the next open instead of the box heading for a stale target.
 */

import type { Props, PublicInstance } from "@gpuix/react";
import { useGpuix } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import type { MotionLevel } from "@gpuixui/motion/timing";
import { cn } from "@gpuixui/tw";
import * as Option from "effect/Option";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { measuredHeight } from "./internal/measure.js";
import {
  PresenceShield,
  delayedTiming,
  presenceMotion,
  presenceStyle,
  useMotionPreference,
  useSurfacePresence,
  useSurfaceTiming,
  type SurfaceTiming,
} from "./internal/presence.js";
import { recipeStyle } from "./internal/recipe.js";
import { useTheme } from "./internal/theme.js";

/**
 * The wait before the content fades, so the fade does not race the height.
 *
 * @see https://ui.shadcn.com/docs/components/accordion — the panel's own keyframes
 * hold opacity still for 0.02s while the box starts to grow.
 */
const FADE_LEAD_MS = 20;

/** What a reveal draws at one frame. */
export interface AutoHeightState {
  /** The content's measured height, `0` only until the renderer reports it. */
  readonly height: number;
  /** Whether the content is revealed. */
  readonly open: boolean;
  /** Whether the reader asked for less motion, which paints the full height. */
  readonly reducedMotion: boolean;
}

/** {@link AutoHeight} props. */
export interface AutoHeightProps extends Omit<Props, "children" | "style"> {
  /** Whether the content is revealed. */
  readonly open: boolean;
  readonly children?: ReactNode;
  /** The motion level of the reveal. Default `"normal"` (200 ms). */
  readonly level?: MotionLevel;
  /**
   * A caller's own enter and exit pair, for a box that moves between resting
   * states rather than arriving: it replaces the `level`'s presence timing, and
   * the height and the fade both paint with it.
   */
  readonly timing?: SurfaceTiming;
  /** A Tailwind class string for the clipping box, joined after the resting style. */
  readonly className?: string;
  /** A Tailwind class string for the measured content box. */
  readonly contentClassName?: string;
  /** A style, or a function of the reveal. */
  readonly style?: StateStyle<AutoHeightState>;
}

/**
 * A box that grows to its content's measured height and fades with it.
 *
 * A closed reveal paints nothing at all — the subtree is unmounted, so nothing
 * inside it keeps running. A caller that needs the state to survive a close
 * keeps it outside the reveal.
 */
export const AutoHeight = ({
  open,
  level = "normal",
  timing: ownTiming,
  className,
  contentClassName,
  testId,
  style,
  children,
  ...rest
}: AutoHeightProps) => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const preference = useMotionPreference();
  const levelTiming = useSurfaceTiming(level);
  const timing = ownTiming ?? levelTiming;
  const presence = useSurfacePresence(open, timing);
  const [measured, setMeasured] = useState(Option.none<number>());
  const content = useRef<PublicInstance | null>(null);

  // The layer fades in after the height has started, so the arriving content is
  // not a flash inside a box that is still opening. A leave fades with the box.
  const fade = {
    enter: delayedTiming(timing.enter, FADE_LEAD_MS),
    exit: timing.exit,
  };

  // A measurement belongs to the subtree that produced it. Once the reveal has
  // unmounted its content, the height it reported is no longer a target the box
  // can have: keeping it would make the next open head for a stale height until
  // the new content reported one.
  useEffect(() => {
    if (presence.mounted) return;
    setMeasured((current) =>
      Option.isSome(current) ? Option.none() : current,
    );
  }, [presence.mounted]);

  // The first open used to paint a target of zero: `onLayout` reports after the
  // frame, so the growth started one frame late. The renderer has just laid the
  // content out, so read it before paint instead; `onLayout` still carries every
  // later change, and a host without `getElementBounds` keeps the old timing.
  useLayoutEffect(() => {
    if (!presence.mounted) return;
    const instance = content.current;
    if (instance === null) return;
    const bounds = renderer?.getElementBounds?.(instance.id) ?? null;
    if (bounds === null) return;
    setMeasured((current) =>
      Option.isSome(current) ? current : Option.some(bounds.height),
    );
  }, [presence.mounted, renderer]);

  if (!presence.mounted) return null;

  const height = Option.getOrElse(measured, () => 0);
  const state: AutoHeightState = {
    height,
    open,
    reducedMotion: preference === "reduced",
  };

  return (
    <div
      {...rest}
      testId={testId}
      motion={presenceMotion(
        {
          initial: { height: 0 },
          animate: { height: open ? height : 0 },
          exit: { height: 0 },
        },
        presence,
      )}
      style={mergeStyles(
        mergeStyles(
          {
            width: "100%",
            overflow: "hidden",
            // A positioned box is what the leaving guard is inset against.
            position: "relative",
            ...presenceStyle(presence.present, "wrapper"),
          },
          recipeStyle(cn(className), theme),
        ),
        resolveStyle(style, state),
      )}
    >
      <div
        ref={content}
        testId={testId === undefined ? undefined : `${testId}-measured`}
        motion={presenceMotion(
          {
            initial: { opacity: 0 },
            animate: { opacity: 1 },
            exit: { opacity: 0 },
          },
          presence,
          fade,
        )}
        onLayout={(event) => {
          Option.match(measuredHeight(event), {
            onNone: () => undefined,
            onSome: (next) => setMeasured(Option.some(next)),
          });
        }}
        style={recipeStyle(cn(contentClassName), theme)}
      >
        {children}
      </div>
      <PresenceShield present={presence.present} />
    </div>
  );
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 600). */
export const autoHeightMeta = {
  name: "Auto height",
  tier: 5,
  status: "done",
  gpuixSupport: "yes",
  limitations: [
    "the first measurement is read through the renderer's optional `getElementBounds`; a host without it starts the growth on the `onLayout` report a frame later",
    "the clipped box does not reflow its content: a percentage height inside it measures against the content box",
    "the reveal unmounts its subtree after the collapse, so state inside it does not survive a close and the next open measures the body again — a measurement is retired with the subtree it came from, never reused as a stale target",
  ],
  docs: "docs/auto-height.mdx",
  example: "examples/auto-height.example.tsx",
  testFile: "src/behaviour/auto-height.test.tsx",
} as const;
