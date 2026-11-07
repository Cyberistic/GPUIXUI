/** @jsxImportSource @gpuix/react */
import type { Props } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import { Icon } from "@gpuixui/icons";
import { cn } from "@gpuixui/tw";
import { useEffect, useRef, useState } from "react";
import { useMotionPreference } from "./internal/presence.js";
import { recipeStyle } from "./internal/recipe.js";
import { IconButton, type ButtonSize } from "./internal/button.js";
import { useTheme } from "./internal/theme.js";
import { surfaceLevelOf, type SurfaceLevel } from "./motion.js";
import { Reveal } from "./reveal.js";
import {
  acknowledgementWindow,
  copyButtonIcon,
  copyButtonLabel,
} from "./copy-button/logic.js";

const COPY_GLYPH_RISE = 3;

export interface CopyButtonState {
  readonly acknowledged: boolean;
  readonly reducedMotion: boolean;
}

export interface CopyButtonProps extends Omit<Props, "children" | "style"> {
  readonly text: string;

  readonly onCopy: (text: string) => void;

  readonly label?: string;

  readonly copiedLabel?: string;

  readonly acknowledgeMs?: number;

  readonly size?: ButtonSize;

  readonly disabled?: boolean;

  readonly color?: string;

  readonly level?: SurfaceLevel;

  readonly className?: string;

  readonly style?: StateStyle<CopyButtonState>;
}

export const CopyButton = ({
  text,
  onCopy,
  label,
  copiedLabel,
  acknowledgeMs,
  size = "sm",
  disabled = false,
  color,
  level: storedLevel = "fast",
  className,
  style,
  testId,
  ...rest
}: CopyButtonProps) => {
  const theme = useTheme();
  const preference = useMotionPreference();
  const level = surfaceLevelOf(storedLevel);
  const [acknowledged, setAcknowledged] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const base = testId ?? "copy-button";
  const windowMs = acknowledgementWindow(acknowledgeMs);

  useEffect(
    () => () => {
      if (timer.current !== undefined) clearTimeout(timer.current);
    },
    [],
  );

  const copy = (): void => {
    onCopy(text);
    setAcknowledged(true);
    if (timer.current !== undefined) clearTimeout(timer.current);
    timer.current = setTimeout(() => setAcknowledged(false), windowMs);
  };

  const state: CopyButtonState = {
    acknowledged,
    reducedMotion: preference === "reduced",
  };
  const glyph = (
    <Icon
      name={copyButtonIcon(acknowledged)}
      size="sm"
      color={color ?? theme.colors.mutedForeground}
    />
  );

  return (
    <IconButton
      {...rest}
      testId={base}
      size={size}
      disabled={disabled}
      label={copyButtonLabel(acknowledged, { label, copiedLabel })}
      onClick={copy}
      style={mergeStyles(
        recipeStyle(cn(className), theme),
        resolveStyle(style, state),
      )}
    >
      {acknowledged && level !== "none" ? (
        <Reveal
          key="copied"
          testId={`${base}-glyph`}
          from="below"
          distance={COPY_GLYPH_RISE}
          level={level}
        >
          {glyph}
        </Reveal>
      ) : (
        <div testId={`${base}-glyph`}>{glyph}</div>
      )}
    </IconButton>
  );
};

export const copyButtonMeta = {
  name: "Copy button",
  tier: 5,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "0.11.0 publishes no clipboard API, so the press calls the caller's `onCopy` and acknowledges it; the control never writes",
    "the confirmation is the button's changing name, because the runtime has no live region to announce it",
    "the checked glyph fades and rises in rather than scaling: there is no `transform` (upstream issue #102)",
  ],
  docs: "docs/copy-button.mdx",
  example: "examples/copy-button.example.tsx",
  testFile: "src/behaviour/copy-button.test.tsx",
} as const;
