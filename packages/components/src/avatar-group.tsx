/**
 * AvatarGroup: a facepile — overlapping avatars plus the count it stands for.
 *
 * The discs overlap by tucking each one under the last, so the row's width is
 * arithmetic over the diameter and the overlap (`avatar-group/logic.ts`) rather
 * than a measurement. That is what lets the group keep a stable box while its
 * discs travel in: each disc lives in an absolutely positioned wrapper, so a
 * member's arrival moves a disc and never reflows the row.
 *
 * An arrival is the house entrance — a fade plus a few pixels of rise on a
 * relative `top`, staggered by `@gpuixui/motion` — because the runtime has no
 * `transform` (upstream issue #102). A member appended to `members` is a new
 * key, so it arrives while the faces already on screen stay put; a member
 * removed does not replay the rest, which is why a member's key is its name.
 *
 * A capped group names the people behind the chip instead of painting "+2" as
 * the whole story: the chip carries no interaction, so its accessible name is
 * the only way a reader learns who is hidden.
 */

import type { Props } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import type { MotionLevel } from "@gpuixui/motion/timing";
import { cn } from "@gpuixui/tw";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Avatar, type AvatarSize, type AvatarStatus } from "./avatar.js";
import {
  avatarDiscLeft,
  avatarOverlap,
  avatarRise,
  avatarRowWidth,
  avatarStep,
  groupDelayMs,
  groupEntering,
  groupName,
  overflowName,
  overflowText,
  splitMembers,
} from "./avatar-group/logic.js";
import { useSurfaceTiming } from "./internal/presence.js";
import { recipeStyle } from "./internal/recipe.js";
import { avatarSize, textStyle, useTheme } from "./internal/theme.js";

/** One face in a group. */
export interface AvatarGroupMember {
  /** The accessible name, and the source of the initials fallback. */
  readonly name: string;
  /** Image path, data URL or `http(s)` URL. Without it the initials show. */
  readonly src?: string;
  /** Renders the presence dot on this face. Omit for no dot. */
  readonly status?: AvatarStatus;
}

/** What an avatar group draws at one frame. */
export interface AvatarGroupState {
  readonly total: number;
  /** The faces on screen, before the overflow chip. */
  readonly visible: number;
  /** The faces behind the chip. */
  readonly hidden: number;
  readonly reducedMotion: boolean;
}

/** {@link AvatarGroup} props. */
export interface AvatarGroupProps extends Omit<Props, "children" | "style"> {
  /** The faces, in reading order. A member's key is its `name`. */
  readonly members: ReadonlyArray<AvatarGroupMember>;
  /**
   * The faces shown before the overflow chip. Omit to show everyone; `0` shows
   * only the chip.
   */
  readonly max?: number;
  /** The faces' diameter. Default `"md"`. */
  readonly size?: AvatarSize;
  /**
   * How far each disc tucks under the previous one, in pixels. Default a
   * quarter of the diameter.
   */
  readonly overlap?: number;
  /**
   * The ring around each disc, which separates two overlapping faces. Pass the
   * surface role the group sits on (a card group passes `card`). Default the
   * theme's `background` role.
   */
  readonly ringColor?: string;
  /** The group's accessible name. Default the number of faces. */
  readonly label?: string;
  /** Milliseconds between two arrivals. Default `40`; `0` arrives at once. */
  readonly stepMs?: number;
  /** Pixels a disc rises from. Default `6`. */
  readonly rise?: number;
  /** The arrival's duration. Default `"normal"` (200 ms). */
  readonly level?: MotionLevel;
  /** A Tailwind class string for the row, joined after the resting style. */
  readonly className?: string;
  /** A style for the row, or a function of the group. */
  readonly style?: StateStyle<AvatarGroupState>;
}

/**
 * A row of overlapping faces with one chip for the members it does not show.
 *
 * The row owns no role beyond `group`, no tab stop and no handlers: the faces
 * are pictures with their own names, and the chip is one labelled picture.
 */
export const AvatarGroup = ({
  members,
  max,
  size = "md",
  overlap,
  ringColor,
  label,
  stepMs,
  rise,
  level = "normal",
  className,
  style,
  ...rest
}: AvatarGroupProps) => {
  const theme = useTheme();
  const timing = useSurfaceTiming(level).enter;
  const diameter = avatarSize[size];
  const step = avatarStep(
    diameter,
    avatarOverlap(diameter, Option.fromNullishOr(overlap)),
  );
  const split = splitMembers(members, Option.fromNullishOr(max));
  const shown = Arr.length(split.visible);
  const hidden = Arr.length(split.hidden);
  const chip = hidden > 0;
  const count = shown + (chip ? 1 : 0);
  const travel = avatarRise(Option.fromNullishOr(rise));
  const stepMsOption = Option.fromNullishOr(stepMs);
  const ring = ringColor ?? theme.colors.background;
  const state: AvatarGroupState = {
    total: Arr.length(members),
    visible: shown,
    hidden,
    reducedMotion: timing.duration === 0,
  };

  /** The wrapper every face and the chip share: position, entrance and ring. */
  const discStyle = (index: number) => ({
    position: "absolute" as const,
    left: avatarDiscLeft(index, step),
    top: 0,
    width: diameter,
    height: diameter,
    borderRadius: theme.radius.full,
  });

  const entrance = (index: number) => ({
    initial: { opacity: 0, top: travel },
    animate: { opacity: 1, top: 0 },
    transition: groupEntering(
      timing,
      groupDelayMs(index, count, stepMsOption, "start"),
    ),
  });

  return (
    <div
      role="group"
      aria-label={groupName(Option.fromNullishOr(label), Arr.length(members))}
      {...rest}
      style={mergeStyles(
        mergeStyles(recipeStyle(cn(className), theme), {
          position: "relative",
          width: avatarRowWidth(diameter, count, step),
          height: diameter,
          flexShrink: 0,
        }),
        resolveStyle(style, state),
      )}
    >
      {split.visible.map((member, index) => (
        <div
          key={member.name}
          testId={`avatar-group-disc-${index}`}
          motion={entrance(index)}
          style={discStyle(index)}
        >
          <Avatar
            name={member.name}
            src={member.src}
            status={member.status}
            size={size}
            style={{
              borderRadius: theme.radius.full,
              borderWidth: theme.borderWidth.strong,
              borderColor: ring,
            }}
          />
        </div>
      ))}
      {chip ? (
        <div
          key="overflow"
          testId="avatar-group-overflow"
          role="img"
          aria-label={overflowName(
            hidden,
            Arr.map(split.hidden, (member) => member.name),
          )}
          motion={entrance(shown)}
          style={{
            ...discStyle(shown),
            borderWidth: theme.borderWidth.strong,
            borderColor: ring,
            backgroundColor: theme.colors.muted,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <text
            role="presentation"
            style={{
              ...textStyle(theme, "caption"),
              color: theme.colors.mutedForeground,
            }}
          >
            {overflowText(hidden)}
          </text>
        </div>
      ) : null}
    </div>
  );
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 600). */
export const avatarGroupMeta = {
  name: "Avatar group",
  tier: 5,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "a face arrives with a fade and a relative-top rise, not a scale: the runtime has no transform (upstream issue #102)",
    "a member is identified by its name, so two members sharing one name cannot both animate in",
    "the hidden members are named on the overflow chip and nowhere else: 0.11.0 has no popup to open a facepile into",
    "the ring is a caller-supplied role (the page role by default), so a group on a card or a popover must pass that surface",
  ],
  docs: "docs/avatar-group.mdx",
  example: "examples/avatar-group.example.tsx",
  testFile: "src/behaviour/avatar-group.test.tsx",
} as const;
