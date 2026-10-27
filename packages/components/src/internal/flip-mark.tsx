/** @jsxImportSource @gpuix/react */
/**
 * A two-glyph indicator in one fixed slot.
 *
 * The runtime has no `transform` (upstream issue #102), so a chevron cannot
 * rotate: both marks stay mounted in the slot and cross-fade, the incoming one
 * travelling `travel` pixels as it arrives. The slot has one size for both
 * marks, so a header or a nav trigger keeps its box when the state flips — a
 * mark mounted only in the open state would widen the trigger under the pointer
 * and move every sibling after it.
 *
 * The frame a mark mounts with is kept: a later toggle tweens from where the
 * mark is rather than from a start frame that moved with the target.
 */

import { Icon, iconPixels, type IconName, type IconSize } from "@gpuixui/icons";
import { useRef } from "react";
import { useSurfaceTiming } from "./presence.js";

/** How far a mark travels while it fades, so a cross-fade reads as a flip. */
const TRAVEL = 2;

/** One of the two marks in the slot. */
const Mark = ({
  name,
  shown,
  travel,
  label,
  color,
  size,
  testId,
}: {
  readonly name: IconName;
  readonly shown: boolean;
  readonly travel: number;
  readonly label: string | undefined;
  readonly color: string;
  readonly size: IconSize | number;
  readonly testId?: string;
}) => {
  const timing = useSurfaceTiming("normal");
  const mountedShown = useRef(shown).current;
  const frame = (atRest: boolean) => ({
    opacity: atRest ? 1 : 0,
    top: atRest ? 0 : travel,
  });

  return (
    <div
      motion={{
        initial: frame(mountedShown),
        animate: frame(shown),
        transition: shown ? timing.enter : timing.exit,
      }}
      style={{ position: "absolute", left: 0 }}
      testId={testId}
    >
      <Icon
        name={name}
        size={size}
        color={color}
        label={shown ? label : undefined}
      />
    </div>
  );
};

/** Whether one mark or its counterpart is showing. */
export type FlipMarkName = "off" | "on";

/** {@link FlipMark} props. */
export interface FlipMarkProps {
  /** The mark at rest. */
  readonly off: IconName;
  /** The mark in the on state. */
  readonly on: IconName;
  readonly shown: boolean;
  readonly color: string;
  readonly size?: IconSize | number;
  /** How far each mark travels while it fades. Default `2`. */
  readonly travel?: number;
  /**
   * The accessible name of the mark at rest. Omit both labels for a decorative
   * indicator — a nav trigger already publishes `aria-expanded`, so a second
   * name on its chevron would be noise.
   */
  readonly offLabel?: string;
  /** The accessible name of the mark in the on state. */
  readonly onLabel?: string;
  /** The `testId` of each mark, so a suite can read both frames. */
  readonly testIdFor?: (mark: FlipMarkName) => string | undefined;
}

/**
 * The fixed slot a header or trigger paints: both marks, one box.
 *
 * `testIdFor` names each mark rather than the slot, because a suite reads the
 * two `motion` frames to prove the cross-fade; the slot has no node of its own.
 */
export const FlipMark = ({
  off: offName,
  on: onName,
  shown,
  color,
  size = "xs",
  travel = TRAVEL,
  offLabel,
  onLabel,
  testIdFor,
}: FlipMarkProps) => {
  const pixels = iconPixels(size);
  return (
    <div
      style={{
        position: "relative",
        width: pixels,
        height: pixels,
        flexShrink: 0,
      }}
    >
      <Mark
        name={offName}
        shown={!shown}
        travel={-travel}
        label={offLabel}
        color={color}
        size={size}
        {...(testIdFor === undefined ? {} : { testId: testIdFor("off") })}
      />
      <Mark
        name={onName}
        shown={shown}
        travel={travel}
        label={onLabel}
        color={color}
        size={size}
        {...(testIdFor === undefined ? {} : { testId: testIdFor("on") })}
      />
    </div>
  );
};
