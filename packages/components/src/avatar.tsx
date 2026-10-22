/**
 * `Avatar`: a person or entity, as a picture with an initials fallback.
 *
 * The fallback is deterministic (see `avatar/logic.ts`), so an avatar is never
 * blank and never shifts when an image is missing. The component owns no state:
 * there is no image-loading or image-error state in this version, and the
 * initials are what a consumer sees until the image paints.
 *
 * **One accessible node**: the root carries the name, so the initials and the
 * picture are `role="presentation"` — otherwise a reader heard "AL" as its own
 * label beside the name, and a picture published a second image node
 * (`src/behaviour/avatar.test.tsx` measures both). A presence state is published
 * as the root's description, because a dot is colour-only information.
 *
 * The static structure is a Tailwind recipe (`AVATAR_*`) compiled against
 * shadcn's fixed metrics; the diameter and presence dot are the dynamic values
 * that stay in `style`, and the caller's `className` is joined after the root
 * recipe.
 */

import type { Props } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { AVATAR_DISC, AVATAR_FALLBACK, AVATAR_ROOT, cn } from "@gpuixui/tw";
import { Match } from "effect";
import { initials } from "./avatar/logic.js";
import { recipeStyle } from "./internal/recipe.js";
import {
  avatarSize,
  statusTone,
  useTheme,
  type Theme,
} from "./internal/theme.js";

/** The four diameters, in pixels. */
export type AvatarSize = keyof typeof avatarSize;

/** The presence dot's state. */
export type AvatarStatus = "online" | "away" | "busy" | "offline";

/** {@link Avatar} props. */
export interface AvatarProps extends Props {
  /** The accessible name, and the source of the initials fallback. */
  readonly name: string;
  /** Image path, data URL or `http(s)` URL. Without it the initials show. */
  readonly src?: string;
  /** Default `"md"`. */
  readonly size?: AvatarSize;
  /** Renders the presence dot. Omit for no dot. */
  readonly status?: AvatarStatus;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
}

/** The presence dot's diameter and its outline against the surface behind it. */
const DOT = 10;

/**
 * The role each presence state's dot paints.
 *
 * A dot is a **mark**, not text, so it paints a role the token contract holds to
 * its mark floor (`indicatorRoles`). `warning`'s solid fill is designed to carry
 * near-black text and measures 1.89:1 as a dot on the light card, so `away`
 * paints the tone's readable role instead.
 */
const statusFill = (theme: Theme, status: AvatarStatus): string =>
  Match.value(status).pipe(
    Match.when("online", () => theme.colors.success),
    Match.when("away", () => statusTone(theme, "warning").foreground),
    Match.when("busy", () => theme.colors.destructive),
    Match.when("offline", () => theme.colors.mutedForeground),
    Match.exhaustive,
  );

/** A circular identity mark: `name`'s picture, or its initials, plus presence. */
export const Avatar = ({
  name,
  src,
  size = "md",
  status,
  className,
  style,
  ...rest
}: AvatarProps) => {
  const theme = useTheme();
  const diameter = avatarSize[size];

  return (
    <div
      role="img"
      aria-label={name}
      // A presence dot is colour-only, so the state it paints is announced
      // here; a caller's own help is used when there is no status.
      aria-description={status ?? rest["aria-description"]}
      {...rest}
      style={mergeStyles(
        // The root is not clipped so the presence dot can sit on the rim; the
        // inner disc is what clips the picture into a circle.
        mergeStyles(recipeStyle(cn(AVATAR_ROOT, className), theme), {
          width: diameter,
          height: diameter,
        }),
        style,
      )}
    >
      <div style={recipeStyle(AVATAR_DISC, theme)}>
        {src === undefined ? (
          <text
            role="presentation"
            style={mergeStyles(recipeStyle(AVATAR_FALLBACK, theme), {
              fontSize: Math.round(diameter * 0.4),
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
  limitations: [
    "no image loading or error state in v1: the initials fallback is what shows until the picture paints",
  ],
  docs: "docs/avatar.mdx",
  example: "examples/avatar.example.tsx",
  testFile: "src/behaviour/avatar.test.tsx",
} as const;
