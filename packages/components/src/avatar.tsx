/**
 * Avatar: a person or entity, as a picture with an initials fallback.
 *
 * The fallback is deterministic (see `avatar/logic.ts`), so an avatar is never
 * blank: the initials are always painted and the picture is layered over them.
 * The component owns no state — there is no image-loading state in this version,
 * and a picture that never arrives simply leaves the initials visible.
 */

import type { Props } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { Match } from "effect";
import { initials } from "./avatar/logic.js";
import { textStyle, useTheme, type Theme } from "./internal/theme.js";

/** The four diameters, in pixels. */
export type AvatarSize = "xs" | "sm" | "md" | "lg";

/** The presence dot's state. */
export type AvatarStatus = "online" | "away" | "busy" | "offline";

/** {@link Avatar} props. */
export interface AvatarProps extends Props {
  /** The accessible name, and the source of the initials fallback. */
  readonly name: string;
  /** Image path, data URL or `http(s)` URL, layered over the initials. */
  readonly src?: string;
  /** Default `"md"`. */
  readonly size?: AvatarSize;
  /** Renders the presence dot. Omit for no dot. */
  readonly status?: AvatarStatus;
}

/**
 * Diameters in pixels. Tokens ship no avatar scale — the control heights are
 * wider than a person chip wants — so the scale lives here and is recorded as
 * an interlock in `TODO.md`.
 */
const DIAMETER: Readonly<Record<AvatarSize, number>> = {
  xs: 20,
  sm: 26,
  md: 32,
  lg: 40,
};

/** The presence dot's diameter and its outline against the surface behind it. */
const DOT = 10;

/** The dot's fill for one presence state. */
const statusFill = (theme: Theme, status: AvatarStatus): string =>
  Match.value(status).pipe(
    Match.when("online", () => theme.colors.success),
    Match.when("away", () => theme.colors.warning),
    Match.when("busy", () => theme.colors.destructive),
    Match.when("offline", () => theme.colors.mutedForeground),
    Match.exhaustive,
  );

/** A circular identity mark: `name`'s picture over its initials, plus presence. */
export const Avatar = ({
  name,
  src,
  size = "md",
  status,
  style,
  testId,
  ...rest
}: AvatarProps) => {
  const theme = useTheme();
  const diameter = DIAMETER[size];
  // The dot is visual; `aria-description` is the one description 0.10.0
  // supports, and the person's name must stay the name (plan 392).
  const description = rest["aria-description"] ?? status;

  return (
    <div
      role="img"
      aria-label={name}
      {...rest}
      testId={testId}
      {...(description === undefined
        ? {}
        : { "aria-description": description })}
      style={mergeStyles(
        {
          // The root is not clipped so the presence dot can sit on the rim; the
          // inner disc is what clips the picture into a circle.
          position: "relative",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          width: diameter,
          height: diameter,
          flexShrink: 0,
        },
        style,
      )}
    >
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          borderRadius: theme.radius.full,
          overflow: "hidden",
          backgroundColor: theme.colors.muted,
        }}
      >
        <text
          testId={testId === undefined ? undefined : `${testId}-initials`}
          style={{
            ...textStyle(theme, "label"),
            fontSize: Math.round(diameter * 0.4),
            color: theme.colors.foreground,
          }}
        >
          {initials(name)}
        </text>
        {src === undefined ? null : (
          <img
            src={src}
            alt={name}
            objectFit="cover"
            testId={testId === undefined ? undefined : `${testId}-image`}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
            }}
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
          }}
        />
      )}
    </div>
  );
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 117 §2). */
export const avatarMeta = {
  name: "Avatars",
  tier: 2,
  status: "done",
  gpuixSupport: "yes",
  focusable: false,
  limitations: [
    "no loading or error state — the initials stay painted behind the picture, so a failed load degrades to them (there is no error callback)",
  ],
  docs: "docs/avatar.mdx",
  example: "examples/avatar.example.tsx",
  testFile: "src/behaviour/avatar.test.tsx",
} as const;
