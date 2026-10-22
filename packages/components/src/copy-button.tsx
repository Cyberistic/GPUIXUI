/**
 * CopyButton: the press that asks the application to copy something.
 *
 * `@gpuix/native@0.11.0` publishes no clipboard API (measured; see
 * `docs/gpuix-capabilities.md`), so a copy is a boundary the application owns:
 * the control hands `text` to `onCopy` and acknowledges the press — the reader
 * sees that their press landed — without ever claiming a write happened. It is
 * the action `CodeBlock` shows in its header, extracted so any command row, key
 * value or token can offer the same press.
 *
 * The acknowledgement arrives with the house entrance: the checked glyph fades
 * and rises 3 px, because the runtime has no `transform` (upstream issue #102)
 * and the mark is the whole acknowledgement. The glyph at rest does not animate
 * — a toolbar that moves on load reads as jitter — and `MotionProvider
 * preference="reduced"` or `level="none"` paints the checked glyph in the frame
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
import { useEffect, useRef, useState } from "react";
import { useMotionPreference } from "./internal/presence.js";
import { recipeStyle } from "./internal/recipe.js";
import { IconButton, type ButtonSize } from "./internal/button.js";
import { useTheme } from "./internal/theme.js";
import { Reveal } from "./reveal.js";
import {
  acknowledgementWindow,
  copyButtonIcon,
  copyButtonLabel,
} from "./copy-button/logic.js";

/** How far the acknowledged glyph rises as it arrives, in pixels. */
const COPY_GLYPH_RISE = 3;

/** What a copy action paints at one frame. */
export interface CopyButtonState {
  /** Whether the confirmation is on screen. */
  readonly acknowledged: boolean;
  readonly reducedMotion: boolean;
}

/** {@link CopyButton} props. */
export interface CopyButtonProps extends Omit<Props, "children" | "style"> {
  /** The text handed to the caller's write on a press. */
  readonly text: string;
  /**
   * Copy the text. The runtime has no clipboard API, so the caller owns the
   * path — a read-only field, a platform write, an application store.
   */
  readonly onCopy: (text: string) => void;
  /** The action's name at rest. Default `"Copy"`. */
  readonly label?: string;
  /** The name while the acknowledgement shows. Default `"Copied"`. */
  readonly copiedLabel?: string;
  /**
   * How long the acknowledgement stays, in milliseconds. Default `1200`; a
   * value that is not positive and finite falls back to it.
   */
  readonly acknowledgeMs?: number;
  /** The control's size. Default `"sm"`. */
  readonly size?: ButtonSize;
  /** Leave the tab order, drop the handlers and dim. Default `false`. */
  readonly disabled?: boolean;
  /** The glyph's role. Default the theme's `mutedForeground`. */
  readonly color?: string;
  /**
   * The acknowledgement glyph's entrance, or `"none"` to paint it at rest.
   * Default `"fast"` (160 ms).
   */
  readonly level?: MotionLevel | "none";
  /** A Tailwind class string for the control, joined last. */
  readonly className?: string;
  /** A style for the control, or a function of its state. */
  readonly style?: StateStyle<CopyButtonState>;
}

/**
 * An icon action that asks the application to copy `text`.
 *
 * The control publishes one `button` named by the state — "Copy" at rest,
 * "Copied" while the acknowledgement shows — so a reader hears that their press
 * landed. The glyph is decorative and agrees with the name. A second press
 * inside the window restarts it rather than stacking a second timer, and a
 * disabled control never reaches `onCopy`.
 */
export const CopyButton = ({
  text,
  onCopy,
  label,
  copiedLabel,
  acknowledgeMs,
  size = "sm",
  disabled = false,
  color,
  level = "fast",
  className,
  style,
  testId,
  ...rest
}: CopyButtonProps) => {
  const theme = useTheme();
  const preference = useMotionPreference();
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

/** The component's inventory record. */
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
