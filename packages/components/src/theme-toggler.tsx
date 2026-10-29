/** @jsxImportSource @gpuix/react */
/**
 * ThemeToggler: the control that switches the application between its light and
 * dark theme.
 *
 * The library does not own the theme state — the application resolves a `Theme`
 * from `@gpuixui/tokens` and provides it — so this control is the press, not the
 * decision: it names the next step ("Switch to light theme"), paints the glyph
 * for the mode a press would switch **to** (`theme-toggler/logic.ts`), and
 * reports the requested mode through `onChange`.
 *
 * The flip is the classic theme toggle: a sun's rays retract while a crescent
 * grows, both on the same button. The runtime has no `transform` and no
 * clip-path, so the disc cannot be bitten into a crescent and nothing can turn;
 * what it does tween is geometry, so two stacked glyphs cross over — the one
 * leaving shrinks into the centre while it fades, the one arriving grows out of
 * it (`theme-toggler/glyph.ts`). Both are always mounted in one fixed box, so
 * the control cannot move when the theme changes. `MotionProvider
 * preference="reduced"` and `level="none"` paint the resting glyph in the frame
 * it appears.
 */

import type { Props } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import { Icon, iconPixels } from "@gpuixui/icons";
import { cn } from "@gpuixui/tw";
import { motionLevelOf } from "@gpuixui/motion/timing";
import { useMotionPreference, useMoveTiming } from "./internal/presence.js";
import { recipeStyle } from "./internal/recipe.js";
import { IconButton, type ButtonSize } from "./internal/button.js";
import { useTheme } from "./internal/theme.js";
import { surfaceLevelOf, type SurfaceLevel } from "./motion.js";
import { glyphFrame, incomingDelayShare } from "./theme-toggler/glyph.js";
import {
  toggleIcon,
  toggleLabel,
  toggledMode,
  type ThemeMode,
} from "./theme-toggler/logic.js";

/** What a theme toggler paints at one frame. */
export interface ThemeTogglerState {
  /** The mode the application is in. */
  readonly mode: ThemeMode;
  readonly reducedMotion: boolean;
}

/** {@link ThemeToggler} props. */
export interface ThemeTogglerProps extends Omit<
  Props,
  "children" | "style" | "onChange"
> {
  /** The mode the application is in. The toggler reports the other one. */
  readonly mode: ThemeMode;
  /** Called with the mode a press requests. The caller re-provides the theme. */
  readonly onChange: (mode: ThemeMode) => void;
  /** The name while a press would switch to the light theme. */
  readonly lightLabel?: string;
  /** The name while a press would switch to the dark theme. */
  readonly darkLabel?: string;
  /** The control's size. Default `"md"`. */
  readonly size?: ButtonSize;
  /**
   * The flip's level, or `"none"` to paint the glyph at rest. Default
   * `"slow"` (320 ms): the crossover moves two glyphs, so it needs the longest
   * house level to read. Read through `surfaceLevelOf`, so a level an
   * application restored from storage decodes with the same reader.
   */
  readonly level?: SurfaceLevel;
  /** A Tailwind class string for the control, joined last. */
  readonly className?: string;
  /** A style for the control, or a function of `{ mode, reducedMotion }`. */
  readonly style?: StateStyle<ThemeTogglerState>;
}

/**
 * An icon action that requests the other theme mode.
 *
 * The control publishes one `button` named for the press it performs, so a
 * reader hears the action rather than the current state; the glyph is
 * decorative, and shows the same request.
 */
export const ThemeToggler = ({
  mode,
  onChange,
  lightLabel,
  darkLabel,
  size = "md",
  level: storedLevel = "slow",
  className,
  style,
  testId,
  ...rest
}: ThemeTogglerProps) => {
  const theme = useTheme();
  const preference = useMotionPreference();
  const level = surfaceLevelOf(storedLevel);
  const base = testId ?? "theme-toggler";
  const flip = useMoveTiming(motionLevelOf(level));
  // The glyph that leaves starts at once; the one arriving waits 15%, the
  // stagger the classic toggle gives its incoming shape. A reduced run has a
  // zero duration, so the wait is zero too.
  const stagger = (flip.duration ?? 0) * incomingDelayShare;
  const box = iconPixels("sm");
  const glyph = (
    name: ReturnType<typeof toggleIcon>,
    shown: boolean,
    part: string,
  ) => {
    const frame = glyphFrame(box, shown);
    return (
      <Icon
        name={name}
        size="sm"
        color={theme.colors.foreground}
        testId={`${base}-${part}`}
        style={{ position: "absolute", ...frame }}
        motion={
          level === "none"
            ? undefined
            : {
                initial: false,
                animate: frame,
                transition: shown ? { ...flip, delay: stagger } : flip,
              }
        }
      />
    );
  };

  return (
    <IconButton
      {...rest}
      testId={base}
      size={size}
      label={toggleLabel(mode, { light: lightLabel, dark: darkLabel })}
      onClick={() => onChange(toggledMode(mode))}
      style={mergeStyles(
        recipeStyle(cn(className), theme),
        resolveStyle(style, {
          mode,
          reducedMotion: preference === "reduced",
        }),
      )}
    >
      <div
        testId={`${base}-glyph`}
        style={{ position: "relative", width: box, height: box }}
      >
        {glyph("sun", mode === "dark", "sun")}
        {glyph("moon", mode === "light", "moon")}
      </div>
    </IconButton>
  );
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 600). */
export const themeTogglerMeta = {
  name: "Theme toggler",
  tier: 5,
  status: "done",
  gpuixSupport: "yes",
  limitations: [
    "the control reports the mode a press requests; the application owns the theme state, its storage and the provider it re-renders with",
    "the crescent is not bitten out of the disc: with no transform or clip-path the sun shrinks into the centre while the crescent grows, so the two cross over rather than one shape morphing",
    "the glyph paints one role, so the control's hover wash does not tint the vector (GPUix does not inherit colour into an `<svg>`)",
  ],
  docs: "docs/theme-toggler.mdx",
  example: "examples/theme-toggler.example.tsx",
  testFile: "src/behaviour/theme-toggler.test.tsx",
} as const;
