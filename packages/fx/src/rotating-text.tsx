/** @jsxImportSource @gpuix/react */
import type { Props } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import { cn } from "@gpuixui/tw";
import * as Option from "effect/Option";
import { useEffect, useRef } from "react";
import {
  useControllableState,
  useSurfaceTiming,
  recipeStyle,
  nameOf,
  textStyle,
  useTheme,
  type TextRole,
} from "@gpuixui/components/authoring";
import { at, nextIndex, phraseAt, phrasesOf } from "./rotating-text/logic.js";

export interface RotatingTextState {
  readonly phrase: string;

  readonly index: number;
}

export interface RotatingTextProps extends Omit<Props, "children" | "style"> {
  readonly phrases: ReadonlyArray<string>;

  readonly intervalMs?: number;

  readonly index?: number;

  readonly defaultIndex?: number;
  readonly onIndexChange?: (index: number) => void;

  readonly label?: string;

  readonly role?: TextRole;

  readonly className?: string;

  readonly style?: StateStyle<RotatingTextState>;
}

const intervalOf = (value: Option.Option<number>): number =>
  Option.getOrElse(
    Option.filter(value, (ms) => Number.isFinite(ms) && ms >= 50),
    () => 3000,
  );

export const RotatingText = ({
  phrases,
  intervalMs,
  index: indexProp,
  defaultIndex = 0,
  onIndexChange,
  label,
  role = "body",
  className,
  style,
  ...rest
}: RotatingTextProps) => {
  const theme = useTheme();
  const timing = useSurfaceTiming("fast");
  const interval = intervalOf(Option.fromNullishOr(intervalMs));

  const list = phrasesOf(phrases);
  const [rawIndex, setIndex] = useControllableState({
    value: indexProp,
    defaultValue: defaultIndex,
    onChange: onIndexChange,
  });
  const index = at(rawIndex, list.length);
  const phrase = Option.getOrElse(phraseAt(list, index), () => "");

  const latest = useRef({ index, length: list.length, setIndex });
  latest.current = { index, length: list.length, setIndex };

  useEffect(() => {
    if (list.length < 2) return;
    const handle = setInterval(() => {
      const next = latest.current;
      next.setIndex(nextIndex(next.index, next.length));
    }, interval);
    return () => clearInterval(handle);
  }, [interval, list.length]);

  const state: RotatingTextState = { phrase, index };

  return (
    <text
      key={index}
      {...rest}
      aria-label={nameOf(label) ?? nameOf(phrase)}
      motion={{
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: timing.enter,
      }}
      style={mergeStyles(
        mergeStyles(recipeStyle(cn(className), theme), {
          ...textStyle(theme, role),
          color: theme.colors.foreground,
        }),
        resolveStyle(style, state),
      )}
    >
      {phrase}
    </text>
  );
};

export const rotatingTextMeta = {
  name: "Rotating text",
  tier: 5,
  status: "done",
  gpuixSupport: "yes",
  limitations: [
    "each step remounts one text host: the runtime cannot animate text content in place",
    "the rotation keeps its interval under the reduced preference; only the fade is removed",
    "no per-word layout, so no slide, mask or stagger between phrases",
  ],
  docs: "docs/rotating-text.mdx",
  example: "examples/rotating-text.example.tsx",
  testFile: "src/behaviour/rotating-text.test.tsx",
} as const;
