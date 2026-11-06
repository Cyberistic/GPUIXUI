/** @jsxImportSource @gpuix/react */
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

export interface ThemeTogglerState {
  readonly mode: ThemeMode;
  readonly reducedMotion: boolean;
}

export interface ThemeTogglerProps extends Omit<
  Props,
  "children" | "style" | "onChange"
> {
  readonly mode: ThemeMode;

  readonly onChange: (mode: ThemeMode) => void;

  readonly lightLabel?: string;

  readonly darkLabel?: string;

  readonly size?: ButtonSize;

  readonly level?: SurfaceLevel;

  readonly className?: string;

  readonly style?: StateStyle<ThemeTogglerState>;
}

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
