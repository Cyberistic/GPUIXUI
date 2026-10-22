/**
 * AvatarGroup's rules: how many discs a facepile shows, how far each one tucks
 * under the one before it, and when each arrives.
 *
 * A facepile is a count plus geometry, so none of this needs a renderer — and
 * the geometry is what lets the row keep a stable box while its discs travel in.
 * The stagger is `@gpuixui/motion`'s rule rather than a second copy of it.
 */

import { stagger, type StaggerFrom } from "@gpuixui/motion/timeline";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";

/** The two halves a capped facepile splits into. */
export interface AvatarGroupSplit<A> {
  readonly visible: ReadonlyArray<A>;
  readonly hidden: ReadonlyArray<A>;
}

/** The share of an avatar's diameter the next disc tucks under it. */
export const avatarOverlapShare = 0.25;

/** The house step between two arrivals, in milliseconds. */
export const avatarGroupStepMs = 40;

/** The house rise a disc arrives from, in pixels. */
export const avatarGroupRise = 6;

/** A tenth of a pixel is the finest the runtime paints, and rounding keeps a settled row still. */
const tenth = (value: number): number => Math.round(value * 10) / 10;

/** The overlap the house uses at one diameter. */
const houseOverlap = (diameter: number): number =>
  Math.max(0, Math.round(diameter * avatarOverlapShare));

/**
 * How many of `total` members a `max` cap shows.
 *
 * `max` is a count, so it is floored; a negative or unreadable cap falls back to
 * showing everyone rather than hiding the group, and a cap larger than the list
 * cannot show a member twice.
 */
export const visibleCount = (
  total: number,
  max: Option.Option<number>,
): number => {
  const limit = Option.match(max, {
    onNone: () => total,
    onSome: (value) =>
      Number.isFinite(value) ? Math.max(0, Math.floor(value)) : total,
  });
  return Math.min(Math.max(0, Math.floor(total)), limit);
};

/**
 * The members shown and the members behind the overflow chip.
 *
 * The **tail** is hidden, not the head: a facepile reads in list order, so the
 * first names are the ones a reader sees.
 */
export const splitMembers = <A>(
  members: ReadonlyArray<A>,
  max: Option.Option<number>,
): AvatarGroupSplit<A> => {
  const shown = visibleCount(members.length, max);
  return {
    visible: Arr.take(members, shown),
    hidden: Arr.drop(members, shown),
  };
};

/**
 * How far one disc tucks under the previous one, in pixels.
 *
 * A missing overlap is a share of the diameter so every size looks tucked the
 * same way; a caller's overlap is clamped to the disc, because an overlap wider
 * than a discard would paint the discs in reverse order, and an unreadable one
 * falls back to the house share rather than reaching the runtime as `NaN`.
 */
export const avatarOverlap = (
  diameter: number,
  overlap: Option.Option<number>,
): number =>
  Option.match(overlap, {
    onNone: () => houseOverlap(diameter),
    onSome: (value) =>
      Number.isFinite(value)
        ? Math.max(0, Math.min(Math.max(0, diameter - 1), value))
        : houseOverlap(diameter),
  });

/** How far each disc advances over the previous one: its diameter less the overlap. */
export const avatarStep = (diameter: number, overlap: number): number =>
  Math.max(0, diameter - overlap);

/** The row's width: `count` discs, each advanced by `step`. */
export const avatarRowWidth = (
  diameter: number,
  count: number,
  step: number,
): number =>
  count <= 0
    ? 0
    : tenth(Math.max(0, diameter) + Math.max(0, step) * (count - 1));

/** Where the disc at `index` sits from the row's left edge. */
export const avatarDiscLeft = (index: number, step: number): number =>
  tenth(Math.max(0, Math.floor(index)) * Math.max(0, step));

/** The distance a disc arrives from, in pixels. */
export const avatarRise = (rise: Option.Option<number>): number =>
  Option.getOrElse(
    Option.filter(rise, (value) => Number.isFinite(value) && value >= 0),
    () => avatarGroupRise,
  );

/** The house step, or the caller's when it can be scheduled. */
const stepOf = (stepMs: Option.Option<number>): number =>
  Option.getOrElse(
    Option.filter(stepMs, (value) => Number.isFinite(value) && value >= 0),
    () => avatarGroupStepMs,
  );

/** The delay before the disc at `index` arrives, counted through the whole row. */
export const groupDelayMs = (
  index: number,
  count: number,
  stepMs: Option.Option<number>,
  from: StaggerFrom = "start",
): number => stagger(stepOf(stepMs), index, count, from);

/** The chip's painted text: the number behind it. */
export const overflowText = (hidden: number): string =>
  hidden <= 0 ? "" : `+${hidden}`;

/**
 * The chip's accessible name: the count **and** the names it stands for.
 *
 * A reader who hears only "+2" has no way to learn who is behind the chip — the
 * chip carries no interaction — so the names are part of the label.
 */
export const overflowName = (
  hidden: number,
  names: ReadonlyArray<string>,
): string =>
  hidden <= 0
    ? ""
    : `${hidden} more${names.length === 0 ? "" : `: ${Arr.join(names, ", ")}`}`;

/** The group's accessible name: the caller's, or the count it shows. */
export const groupName = (
  label: Option.Option<string>,
  total: number,
): string =>
  Option.getOrElse(
    Option.map(
      Option.filter(label, (value) => Str.isNonEmpty(Str.trim(value))),
      Str.trim,
    ),
    () => `${total} avatar${total === 1 ? "" : "s"}`,
  );
