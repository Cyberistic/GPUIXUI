/** @jsxImportSource @gpuix/react */
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
  groupName,
  membersOf,
  overflowName,
  overflowText,
  splitMembers,
} from "./avatar-group/logic.js";
import { delayedTiming, useSurfaceTiming } from "./internal/presence.js";
import { recipeStyle } from "./internal/recipe.js";
import { nameOf } from "./internal/text.js";
import { avatarPixels, textStyle, useTheme } from "./internal/theme.js";

export interface AvatarGroupMember {
  readonly name: string;

  readonly src?: string;

  readonly status?: AvatarStatus;

  readonly color?: string;

  readonly initials?: boolean;
}

export interface AvatarGroupState {
  readonly total: number;

  readonly visible: number;

  readonly hidden: number;
  readonly reducedMotion: boolean;
}

export interface AvatarGroupProps extends Omit<Props, "children" | "style"> {
  readonly members: ReadonlyArray<AvatarGroupMember>;

  readonly max?: number;

  readonly size?: AvatarSize;

  readonly overlap?: number;

  readonly ringColor?: string;

  readonly label?: string;

  readonly stepMs?: number;

  readonly rise?: number;

  readonly level?: MotionLevel;

  readonly className?: string;

  readonly style?: StateStyle<AvatarGroupState>;
}

export const AvatarGroup = ({
  members: storedMembers,
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
  const members = membersOf(storedMembers);
  const timing = useSurfaceTiming(level).enter;
  const diameter = avatarPixels(size);
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
    transition: delayedTiming(
      timing,
      groupDelayMs(index, count, stepMsOption, "start"),
    ),
  });

  return (
    <div
      role="group"
      aria-label={groupName(
        Option.fromNullishOr(nameOf(label)),
        Arr.length(members),
      )}
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
            color={member.color}
            initials={member.initials}
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
