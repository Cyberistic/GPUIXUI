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
 * The glyph arrives with the house entrance on the `fast` level, because the
 * runtime has no `transform` (upstream issue #102): a fade plus a 3 px rise
 * rather than two glyphs scaling over each other. `MotionProvider
 * preference="reduced"` and `level="none"` paint the resting glyph in the frame
 * it appears.
 */

import type { Props } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import { Icon } from "@gpuixui/icons";
import type { MotionLevel } from "@gpuixui/motion/timing";
import { cn } from "@gpuixui/tw";
import { useMotionPreference } from "./internal/presence.js";
import { recipeStyle } from "./internal/recipe.js";
import { IconButton, type ButtonSize } from "./internal/button.js";
import { useTheme } from "./internal/theme.js";
import { Reveal } from "./reveal.js";
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
   * The glyph's entrance level, or `"none"` to paint it at rest. Default
   * `"fast"` (160 ms).
   */
  readonly level?: MotionLevel | "none";
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
  level = "fast",
  className,
  style,
  testId,
  ...rest
}: ThemeTogglerProps) => {
  const theme = useTheme();
  const preference = useMotionPreference();
  const base = testId ?? "theme-toggler";
  const glyph = (
    <Icon name={toggleIcon(mode)} size="sm" color={theme.colors.foreground} />
  );

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
      {level === "none" ? (
        <div testId={`${base}-glyph`}>{glyph}</div>
      ) : (
        <Reveal
          testId={`${base}-glyph`}
          from="below"
          distance={3}
          level={level}
        >
          {glyph}
        </Reveal>
      )}
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
    "one glyph fades and rises in rather than two cross-fading: a cross-fade needs both mounted over each other and the runtime has no transform to scale them",
    "the glyph paints one role, so the control's hover wash does not tint the vector (GPUix does not inherit colour into an `<svg>`)",
  ],
  docs: "docs/theme-toggler.mdx",
  example: "examples/theme-toggler.example.tsx",
  testFile: "src/behaviour/theme-toggler.test.tsx",
} as const;
