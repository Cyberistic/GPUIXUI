/** @jsxImportSource @gpuix/react */
import type { Props } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { AVATAR_DISC, AVATAR_FALLBACK, AVATAR_ROOT, cn } from "@gpuixui/tw";
import { Match } from "effect";
import { initials, isAvatarStatus } from "./avatar/logic.js";
import type { AvatarStatus } from "./avatar/logic.js";
import { recipeStyle } from "./internal/recipe.js";
import {
  avatarPixels,
  avatarSize,
  statusTone,
  useTheme,
  type Theme,
} from "./internal/theme.js";

export type AvatarSize = keyof typeof avatarSize;

export type { AvatarStatus };

export interface AvatarProps extends Props {
  readonly name: string;

  readonly src?: string;

  readonly size?: AvatarSize;

  readonly status?: AvatarStatus;

  readonly color?: string;

  readonly initials?: boolean;

  readonly clickThrough?: boolean;

  readonly className?: string;
}

const DOT = 10;

const statusFill = (theme: Theme, status: AvatarStatus): string =>
  Match.value(status).pipe(
    Match.when("online", () => theme.colors.success),
    Match.when("away", () => statusTone(theme, "warning").foreground),
    Match.when("busy", () => theme.colors.destructive),
    Match.when("offline", () => theme.colors.mutedForeground),
    Match.exhaustive,
  );

export const Avatar = ({
  name,
  src,
  size = "md",
  status: statusProp,
  color,
  initials: showInitials = true,
  clickThrough: requestedClickThrough,
  className,
  style,
  ...rest
}: AvatarProps) => {
  const clickThrough =
    requestedClickThrough ??
    (rest.onClick === undefined &&
      rest.onMouseDown === undefined &&
      rest.onMouseUp === undefined);
  const theme = useTheme();
  const diameter = avatarPixels(size);

  const status = isAvatarStatus(statusProp) ? statusProp : undefined;

  return (
    <div
      role="img"
      aria-label={name}
      aria-description={status ?? rest["aria-description"]}
      {...rest}
      style={mergeStyles(
        mergeStyles(recipeStyle(cn(AVATAR_ROOT, className), theme), {
          width: diameter,
          height: diameter,
          ...(clickThrough ? { pointerEvents: "none" as const } : {}),
        }),
        style,
      )}
    >
      {}
      <div
        style={mergeStyles(recipeStyle(AVATAR_DISC, theme), {
          pointerEvents: "none",
          ...(color === undefined ? {} : { backgroundColor: color }),
        })}
      >
        {src === undefined && !showInitials ? null : src === undefined ? (
          <text
            role="presentation"
            style={mergeStyles(recipeStyle(AVATAR_FALLBACK, theme), {
              fontSize: Math.round(diameter * 0.44),
            })}
          >
            {initials(name)}
          </text>
        ) : (
          <img
            src={src}
            alt=""
            role="presentation"
            objectFit="cover"
            style={{ width: "100%", height: "100%" }}
          />
        )}
      </div>
      {status === undefined ? null : (
        <div
          style={{
            position: "absolute",
            right: -1,
            bottom: -1,
            width: DOT,
            height: DOT,
            borderRadius: theme.radius.full,
            backgroundColor: statusFill(theme, status),
            borderWidth: theme.borderWidth.strong,
            borderColor: theme.colors.card,
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
};

export const avatarMeta = {
  name: "Avatars",
  tier: 2,
  status: "done",
  gpuixSupport: "yes",
  limitations: [
    "no image loading or error state in v1: the initials fallback is what shows until the picture paints",
  ],
  docs: "docs/avatar.mdx",
  example: "examples/avatar.example.tsx",
  testFile: "src/behaviour/avatar.test.tsx",
} as const;
