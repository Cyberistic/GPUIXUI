import { stagger, type StaggerFrom } from "@gpuixui/motion/timeline";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";

export interface AvatarGroupSplit<A> {
  readonly visible: ReadonlyArray<A>;
  readonly hidden: ReadonlyArray<A>;
}

export const avatarOverlapShare = 0.25;

export const avatarGroupStepMs = 40;

export const avatarGroupRise = 6;

const tenth = (value: number): number => Math.round(value * 10) / 10;

const houseOverlap = (diameter: number): number =>
  Math.max(0, Math.round(diameter * avatarOverlapShare));

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

const isMember = <Member extends { readonly name: string }>(
  entry: unknown,
): entry is Member => {
  if (typeof entry !== "object" || entry === null || !("name" in entry)) {
    return false;
  }
  const name = entry.name;
  return typeof name === "string" && name.trim().length > 0;
};

export const membersOf = <Member extends { readonly name: string }>(
  value: ReadonlyArray<Member> | null | undefined,
): ReadonlyArray<Member> => {
  const list = Option.getOrElse(
    Option.filter(Option.fromNullishOr(value), (entries): boolean =>
      Arr.isArray(entries),
    ),
    () => [],
  );
  return Arr.filter(list, isMember);
};

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

export const avatarStep = (diameter: number, overlap: number): number =>
  Math.max(0, diameter - overlap);

export const avatarRowWidth = (
  diameter: number,
  count: number,
  step: number,
): number =>
  count <= 0
    ? 0
    : tenth(Math.max(0, diameter) + Math.max(0, step) * (count - 1));

export const avatarDiscLeft = (index: number, step: number): number =>
  tenth(Math.max(0, Math.floor(index)) * Math.max(0, step));

export const avatarRise = (rise: Option.Option<number>): number =>
  Option.getOrElse(
    Option.filter(rise, (value) => Number.isFinite(value) && value >= 0),
    () => avatarGroupRise,
  );

const stepOf = (stepMs: Option.Option<number>): number =>
  Option.getOrElse(
    Option.filter(stepMs, (value) => Number.isFinite(value) && value >= 0),
    () => avatarGroupStepMs,
  );

export const groupDelayMs = (
  index: number,
  count: number,
  stepMs: Option.Option<number>,
  from: StaggerFrom = "start",
): number => stagger(stepOf(stepMs), index, count, from);

export const overflowText = (hidden: number): string =>
  hidden <= 0 ? "" : `+${hidden}`;

export const overflowName = (
  hidden: number,
  names: ReadonlyArray<string>,
): string =>
  hidden <= 0
    ? ""
    : `${hidden} more${names.length === 0 ? "" : `: ${Arr.join(names, ", ")}`}`;

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
