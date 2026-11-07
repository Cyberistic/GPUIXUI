/** @jsxImportSource @gpuix/react */
import type { Props } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import { cn } from "@gpuixui/tw";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  useMotionPreference,
  recipeStyle,
  nameOf,
  textOf,
  textStyle,
  useTheme,
  type TextRole,
  type Theme,
} from "@gpuixui/components/authoring";
import {
  characters,
  typingTiming,
  visibleText,
  type TypingTiming,
} from "./typing-text/logic.js";

export interface TypingTextState {
  readonly revealed: number;

  readonly complete: boolean;

  readonly reducedMotion: boolean;
}

export interface TypingTextProps extends Omit<Props, "children" | "style"> {
  readonly text: string;

  readonly speed?: number;

  readonly delay?: number;

  readonly caret?: boolean;

  readonly label?: string;

  readonly onComplete?: () => void;

  readonly role?: TextRole;

  readonly className?: string;

  readonly style?: StateStyle<TypingTextState>;
}

interface Progress {
  readonly run: string;
  readonly revealed: number;
}

const caretStyle = (theme: Theme, role: TextRole) => ({
  width: 2,
  height: textStyle(theme, role).lineHeight,
  backgroundColor: theme.colors.primary,
  borderRadius: 1,
});

export const TypingText = ({
  text,
  speed,
  delay,
  caret = false,
  label,
  onComplete,
  role = "body",
  className,
  style,
  ...rest
}: TypingTextProps) => {
  const theme = useTheme();
  const reducedMotion = useMotionPreference() === "reduced";

  const phrase = textOf(text);
  const timing: TypingTiming = useMemo(
    () => typingTiming({ speedMs: speed, delayMs: delay }),
    [delay, speed],
  );
  const charactersOf = useMemo(() => characters(phrase), [phrase]);
  const total = charactersOf.length;
  const instant = reducedMotion || timing.speedMs === 0;

  const run = `${timing.speedMs}:${timing.delayMs}:${phrase}`;

  const [progress, setProgress] = useState<Progress>({ run, revealed: 0 });
  const revealed = instant
    ? total
    : progress.run === run
      ? progress.revealed
      : 0;
  const complete = revealed >= total;

  useEffect(() => {
    if (instant || total === 0) return;

    let shown = 0;
    let handle: ReturnType<typeof setTimeout> | undefined;
    const reveal = (): void => {
      shown += 1;
      setProgress({ run, revealed: shown });
      if (shown < total) handle = setTimeout(reveal, timing.speedMs);
    };
    handle = setTimeout(reveal, timing.delayMs);

    return () => {
      if (handle !== undefined) clearTimeout(handle);
    };
  }, [instant, run, timing.delayMs, timing.speedMs, total]);

  const announced = useRef<{ readonly text: string } | undefined>(undefined);
  useEffect(() => {
    if (!complete || announced.current?.text === phrase) return;
    announced.current = { text: phrase };
    onComplete?.();
  }, [complete, onComplete, phrase]);

  const state: TypingTextState = { revealed, complete, reducedMotion };

  return (
    <div
      {...rest}
      style={mergeStyles(
        mergeStyles(recipeStyle(cn(className), theme), {
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
        }),
        resolveStyle(style, state),
      )}
    >
      <text
        aria-label={nameOf(label) ?? phrase}
        style={{
          ...textStyle(theme, role),
          color: theme.colors.foreground,
        }}
      >
        {visibleText(phrase, revealed)}
      </text>
      {caret && !complete ? <div style={caretStyle(theme, role)} /> : null}
    </div>
  );
};

export const typingTextMeta = {
  name: "Typing text",
  tier: 5,
  status: "done",
  gpuixSupport: "yes",
  limitations: [
    "the reveal is a real-time timer, so it is not driven by the renderer's motion clock",
    "a caret sits after the text block, not at the end of the last wrapped line",
    "no per-glyph paint: the runtime cannot animate or measure individual characters",
  ],
  docs: "docs/typing-text.mdx",
  example: "examples/typing-text.example.tsx",
  testFile: "src/behaviour/typing-text.test.tsx",
} as const;
